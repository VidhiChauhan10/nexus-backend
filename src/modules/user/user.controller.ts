import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middleware/authMiddleware';
import { User } from './user.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  avatar: z.string().url().optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user!._id).select('-password -refreshToken');
    if (!user) throw new ApiError(404, 'User not found');
    res.status(200).json(new ApiResponse(200, user, 'Profile fetched'));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { $set: body },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');
    if (!user) throw new ApiError(404, 'User not found');
    res.status(200).json(new ApiResponse(200, user, 'Profile updated'));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
    const user = await User.findById(req.user!._id);
    if (!user) throw new ApiError(404, 'User not found');

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) throw new ApiError(400, 'Current password is incorrect');

    user.password = await hashPassword(newPassword);
    await user.save();
    res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
  } catch (error) {
    next(error);
  }
};
