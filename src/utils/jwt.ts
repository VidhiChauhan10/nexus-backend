import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export const generateAccessToken = (payload: object): string => {
  return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, {
    expiresIn: env.ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

export const generateRefreshToken = (payload: object): string => {
  return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRES_IN,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.ACCESS_TOKEN_SECRET) as jwt.JwtPayload;
};

export const verifyRefreshToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, env.REFRESH_TOKEN_SECRET) as jwt.JwtPayload;
};
