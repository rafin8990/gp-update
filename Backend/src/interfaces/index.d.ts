/* eslint-disable @typescript-eslint/consistent-type-definitions */
import { ITokenPayload } from '../app/modules/auth/auth.interface';

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}
