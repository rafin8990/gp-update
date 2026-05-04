import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { jwtHelpers } from '../../helpers/jwtHelpers';
import config from '../../config';
import { ITokenPayload } from '../modules/auth/auth.interface';

const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Access token is required',
      });
    }

    // Verify token
    const decoded = jwtHelpers.verifyToken(token, config.jwt_secret as string);
    
    // Add user info to request
    req.user = decoded as ITokenPayload;
    
    next();
  } catch (error) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      try {
        const decoded = jwtHelpers.verifyToken(token, config.jwt_secret as string);
        req.user = decoded as ITokenPayload;
      } catch (error) {
        // Token is invalid, but we continue without user info
        req.user = undefined;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.user.role || !roles.includes(req.user.role)) {
      return res.status(httpStatus.FORBIDDEN).json({
        success: false,
        message: 'Insufficient permissions',
      });
    }

    next();
  };
};

export { auth, optionalAuth, requireRole };