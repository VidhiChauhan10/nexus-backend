import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../modules/user/user.model';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    role: string;
    email: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized — no token provided');
    }

    const token = authHeader.split(' ')[1];

    let decoded: jwt.JwtPayload;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'Unauthorized — token expired');
      }
      throw new ApiError(401, 'Unauthorized — invalid token');
    }

    const user = await User.findById(decoded._id).select('-password -refreshToken');
    if (!user) {
      throw new ApiError(401, 'Unauthorized — user not found');
    }

    req.user = { _id: user._id.toString(), role: user.role, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
};
