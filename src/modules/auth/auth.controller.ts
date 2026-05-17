import { Request, Response, NextFunction } from 'express';
import { User } from '../user/user.model';
import { ApiError } from '../../utils/ApiError';
import { ApiResponse } from '../../utils/ApiResponse';
import { hashPassword, comparePassword } from '../../utils/bcrypt';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { signupSchema, loginSchema, refreshTokenSchema } from './auth.schema';

export const signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = signupSchema.parse(req.body);
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) throw new ApiError(409, 'Email already in use');

    const hashed = await hashPassword(body.password);
    const user = await User.create({ ...body, password: hashed });

    const accessToken = generateAccessToken({ _id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ _id: user._id });
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json(
      new ApiResponse(201, {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      }, 'Account created successfully')
    );
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await User.findOne({ email: body.email });
    if (!user) throw new ApiError(401, 'Invalid email or password');

    const isMatch = await comparePassword(body.password, user.password);
    if (!isMatch) throw new ApiError(401, 'Invalid email or password');

    const accessToken = generateAccessToken({ _id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ _id: user._id });
    user.refreshToken = refreshToken;
    await user.save();

    res.status(200).json(
      new ApiResponse(200, {
        user: { _id: user._id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      }, 'Login successful')
    );
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded._id);
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    const newAccessToken = generateAccessToken({ _id: user._id, role: user.role });
    const newRefreshToken = generateRefreshToken({ _id: user._id });
    user.refreshToken = newRefreshToken;
    await user.save();

    res.status(200).json(
      new ApiResponse(200, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed')
    );
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = refreshTokenSchema.parse(req.body);
    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded._id);
    if (user) {
      user.refreshToken = undefined;
      await user.save();
    }
    res.status(200).json(new ApiResponse(200, null, 'Logged out successfully'));
  } catch (error) {
    next(error);
  }
};
