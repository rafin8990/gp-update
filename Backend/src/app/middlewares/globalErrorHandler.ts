import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import config from '../../config';
import ApiError from '../../errors/ApiError';

import handleZodError from '../../errors/handleZodError';
import { IGenericErrorMessage } from '../../interfaces/error';
import { errorlogger } from '../../shared/logger';
import handleCastError from '../../errors/handleCastError';

const globalErrorHandler: ErrorRequestHandler = (
  error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error based on environment
  // Safely log error to avoid crashes with undefined properties
  try {
    if (config.env === 'development') {
      console.log(`🐱‍🏍 globalErrorHandler ~~`, {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack,
        ...(error instanceof ZodError && { issues: error.issues }),
        ...(error instanceof ApiError && { statusCode: error.statusCode }),
        ...((error as any)?.code && { code: (error as any).code }),
      });
    } else {
      errorlogger.error(`🐱‍🏍 globalErrorHandler ~~`, {
        message: error?.message || 'Unknown error',
        name: error?.name || 'Error',
        stack: error?.stack,
        ...(error instanceof ZodError && { issues: error.issues }),
        ...(error instanceof ApiError && { statusCode: error.statusCode }),
        ...((error as any)?.code && { code: (error as any).code }),
      });
    }
  } catch (logError) {
    // If logging itself fails, just log a safe message
    console.error('Error in globalErrorHandler logging:', logError);
    console.error('Original error message:', error?.message || 'Unknown error');
  }

  // Default values
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages: IGenericErrorMessage[] = [];

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  }

  // Handle custom ApiError
  else if (error instanceof ApiError) {
    statusCode = error.statusCode || 500;
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  }

  // Handle other generic JS errors (like throw new Error)
  else if (error instanceof Error) {
    message = error.message;
    errorMessages = error.message
      ? [
          {
            path: '',
            message: error.message,
          },
        ]
      : [];
  }

  // Handle raw SQL or cast errors (optional)
  else if ((error as any)?.code) {
    const simplifiedError = handleCastError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  }

  // Final response
  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    ...(config.env !== 'production' && { stack: error.stack }),
  });
};

export default globalErrorHandler;
