import { IGenericErrorMessage } from './error';

export type IGenericResponse<T> = {
  meta?: {
    page?: number;
    limit?: number;
    total: number;
    totalPages?: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
  data: T;
};

export type IGenericErrorResponse = {
  statusCode: number;
  message: string;
  errorMessages: IGenericErrorMessage[];
};
