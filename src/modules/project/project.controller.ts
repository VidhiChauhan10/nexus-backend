import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { Project } from './project.model';
import { User } from '../user/user.model';
import { Task } from '../task/task.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { createProjectSchema, updateProjectSchema, addMemberSchema } from './project.schema';
import mongoose from 'mongoose';

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user!._id);
    const projects = await Project.find({
      $or: [{ createdBy: userId }, { 'members.user': userId }],
    })
      .populate('createdBy', 'name email avatar')
      .populate('members.user', 'name email avatar')
      .sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, projects, 'Projects fetched'));
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = createProjectSchema.parse(req.body);
    const project = await Project.create({
      ...body,
      createdBy: req.user!._id,
      members: [{ user: req.user!._id, role: 'admin' }],
    });
    await project.populate('createdBy', 'name email avatar');
    await project.populate('members.user', 'name email avatar');
    res.status(201).json(new ApiResponse(201, project, 'Project created'));
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'name email avatar')
      .populate('members.user', 'name email avatar');
    if (!project) throw new ApiError(404, 'Project not found');

    const isMember = project.members.some(
      (m) => m.user._id.toString() === req.user!._id
    );
    if (!isMember && project.createdBy._id.toString() !== req.user!._id) {
      throw new ApiError(403, 'Access denied');
    }

    res.status(200).json(new ApiResponse(200, project, 'Project fetched'));
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = updateProjectSchema.parse(req.body);
    const project = await Project.findById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found');
    if (project.createdBy.toString() !== req.user!._id) {
      throw new ApiError(403, 'Only project creator can update');
    }
    Object.assign(project, body);
    await project.save();
    await project.populate('createdBy', 'name email avatar');
    await project.populate('members.user', 'name email avatar');
    res.status(200).json(new ApiResponse(200, project, 'Project updated'));
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found');
    if (project.createdBy.toString() !== req.user!._id) {
      throw new ApiError(403, 'Only project creator can delete');
    }
    await Task.deleteMany({ projectId: project._id });
    await project.deleteOne();
    res.status(200).json(new ApiResponse(200, null, 'Project deleted'));
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, role } = addMemberSchema.parse(req.body);
    const project = await Project.findById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found');
    if (project.createdBy.toString() !== req.user!._id) {
      throw new ApiError(403, 'Only project creator can add members');
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) throw new ApiError(404, 'User with this email not found');

    const alreadyMember = project.members.some(
      (m) => m.user.toString() === userToAdd._id.toString()
    );
    if (alreadyMember) throw new ApiError(409, 'User is already a member');

    project.members.push({ user: userToAdd._id as mongoose.Types.ObjectId, role });
    await project.save();
    await project.populate('members.user', 'name email avatar');
    res.status(200).json(new ApiResponse(200, project, 'Member added'));
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) throw new ApiError(404, 'Project not found');
    if (project.createdBy.toString() !== req.user!._id) {
      throw new ApiError(403, 'Only project creator can remove members');
    }
    if (req.params.userId === req.user!._id) {
      throw new ApiError(400, 'Cannot remove yourself from your own project');
    }
    project.members = project.members.filter(
      (m) => m.user.toString() !== req.params.userId
    );
    await project.save();
    res.status(200).json(new ApiResponse(200, project, 'Member removed'));
  } catch (error) {
    next(error);
  }
};
