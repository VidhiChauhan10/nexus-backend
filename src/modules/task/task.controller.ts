import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { Task } from './task.model';
import { Project } from '../project/project.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { createTaskSchema, updateTaskSchema } from './task.schema';
import mongoose from 'mongoose';

const assertProjectAccess = async (projectId: string, userId: string): Promise<void> => {
  const project = await Project.findById(projectId);
  if (!project) throw new ApiError(404, 'Project not found');
  const isMember = project.members.some((m) => m.user.toString() === userId);
  if (!isMember) throw new ApiError(403, 'Access denied');
};

export const getTasks = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId, status, priority, assignedTo, page = '1', limit = '50' } = req.query as Record<string, string>;
    if (!projectId) throw new ApiError(400, 'projectId is required');

    await assertProjectAccess(projectId, req.user!._id);

    const filter: Record<string, unknown> = { projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Task.countDocuments(filter),
    ]);

    res.status(200).json(
      new ApiResponse(200, { tasks, total, page: parseInt(page), limit: parseInt(limit) }, 'Tasks fetched')
    );
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = createTaskSchema.parse(req.body);
    await assertProjectAccess(body.projectId, req.user!._id);

    const task = await Task.create({
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdBy: req.user!._id,
    });
    await task.populate('assignedTo', 'name email avatar');
    await task.populate('createdBy', 'name email');
    res.status(201).json(new ApiResponse(201, task, 'Task created'));
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email');
    if (!task) throw new ApiError(404, 'Task not found');
    await assertProjectAccess(task.projectId.toString(), req.user!._id);
    res.status(200).json(new ApiResponse(200, task, 'Task fetched'));
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = updateTaskSchema.parse(req.body);
    const task = await Task.findById(req.params.id);
    if (!task) throw new ApiError(404, 'Task not found');
    await assertProjectAccess(task.projectId.toString(), req.user!._id);

    const updateData: Record<string, unknown> = { ...body };
    if (body.dueDate) updateData.dueDate = new Date(body.dueDate);
    if (body.dueDate === null) updateData.dueDate = null;
    if (body.assignedTo === null) updateData.assignedTo = null;

    const updated = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email');

    res.status(200).json(new ApiResponse(200, updated, 'Task updated'));
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) throw new ApiError(404, 'Task not found');
    await assertProjectAccess(task.projectId.toString(), req.user!._id);

    const project = await Project.findById(task.projectId);
    const isAdmin = project?.createdBy.toString() === req.user!._id;
    const isCreator = task.createdBy.toString() === req.user!._id;
    if (!isAdmin && !isCreator) throw new ApiError(403, 'Cannot delete this task');

    await task.deleteOne();
    res.status(200).json(new ApiResponse(200, null, 'Task deleted'));
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id);

    const projects = await Project.find({
      $or: [{ createdBy: userId }, { 'members.user': userId }],
    }).select('_id');
    const projectIds = projects.map((p) => p._id);

    const now = new Date();
    const [total, completed, pending, overdue] = await Promise.all([
      Task.countDocuments({ projectId: { $in: projectIds } }),
      Task.countDocuments({ projectId: { $in: projectIds }, status: 'done' }),
      Task.countDocuments({ projectId: { $in: projectIds }, status: { $ne: 'done' } }),
      Task.countDocuments({
        projectId: { $in: projectIds },
        status: { $ne: 'done' },
        dueDate: { $lt: now },
      }),
    ]);

    // Weekly task completion data for chart (last 7 days)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    const completedByDay = await Task.aggregate([
      {
        $match: {
          projectId: { $in: projectIds },
          status: 'done',
          updatedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Recent tasks
    const recentTasks = await Task.find({ projectId: { $in: projectIds } })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate('assignedTo', 'name avatar')
      .populate('projectId', 'title');

    res.status(200).json(
      new ApiResponse(200, {
        stats: { total, completed, pending, overdue },
        completedByDay,
        recentTasks,
        projectCount: projectIds.length,
      }, 'Dashboard stats fetched')
    );
  } catch (error) {
    next(error);
  }
};
