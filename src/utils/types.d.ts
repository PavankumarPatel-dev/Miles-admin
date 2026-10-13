import { User } from '../modules/user/user.entity';
import { Request } from 'express';

declare module 'express-serve-static-core' {
  export interface Request {
    authUser?: User;
    user?: User;
    session?: {
      userId?: string;
    };
    requestId?: string;
    flash(type: string, message?: any): any;
  }
}
