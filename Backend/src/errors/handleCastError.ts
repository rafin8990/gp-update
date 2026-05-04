import { IGenericErrorResponse } from '../interfaces/common';
import { IGenericErrorMessage } from '../interfaces/error';

type PostgresError = {
  code?: string;
  detail?: string;
  table?: string;
  column?: string;
} & Error

const handleCastError = (error: PostgresError): IGenericErrorResponse => {
  const statusCode = 400;
  let message = 'Invalid input';
  const errorMessages: IGenericErrorMessage[] = [];

  switch (error.code) {
    case '22P02': 
      message = 'Invalid input syntax for type';
      errorMessages.push({
        path: error.column || '',
        message: 'The provided value has an invalid format.',
      });
      break;

    case '23505':
      message = 'Unique constraint violation';
      errorMessages.push({
        path: error.column || '',
        message: 'A record with this value already exists.',
      });
      break;

    case '23503': 
      message = 'Foreign key constraint failed';
      errorMessages.push({
        path: error.column || '',
        message: 'Referenced record does not exist.',
      });
      break;

    default:
      message = error.message || 'Database error';
      errorMessages.push({
        path: '',
        message,
      });
      break;
  }

  return {
    statusCode,
    message,
    errorMessages,
  };
};

export default handleCastError;
