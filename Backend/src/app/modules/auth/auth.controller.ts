import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { AuthService } from './auth.service';
import { ILoginRequest, IRegisterRequest, IRefreshTokenRequest } from './auth.interface';

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData: IRegisterRequest = req.body;
    const result = await AuthService.registerUser(userData);
    
    res.status(httpStatus.CREATED).json(result);
  } catch (error) {
    next(error);
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const loginData: ILoginRequest = req.body;
    const result = await AuthService.loginUser(loginData);
    
    res.status(httpStatus.OK).json(result);
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken }: IRefreshTokenRequest = req.body;
    const result = await AuthService.refreshAccessToken(refreshToken);
    
    res.status(httpStatus.OK).json(result);
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    
    if (!userId) {
      return res.status(httpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'User not authenticated',
      });
    }

    const user = await AuthService.findUserById(userId);
    
    if (!user) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'User not found',
      });
    }

    const { password, ...userWithoutPassword } = user;

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const AuthController = {
  register,
  login,
  refreshToken,
  getProfile,
};
