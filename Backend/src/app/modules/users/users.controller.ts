import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { UsersService } from './users.service';

export const UsersController = {
  async getAll(req: Request, res: Response) {
    const { search, limit, page } = req.query as Record<string, string>;
    const users = await UsersService.getAll(search, Number(limit) || 50, Number(page) || 1);
    res.status(httpStatus.OK).json({ success: true, message: 'Users fetched', data: users });
  },

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await UsersService.update(Number(id), req.body);
    res.status(httpStatus.OK).json({ success: true, message: 'User updated', data: updated });
  },
};

export default UsersController;

