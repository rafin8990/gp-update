import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { LocationsService } from './locations.service';

const createLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await LocationsService.createLocation(req.body);

    res.status(httpStatus.CREATED).json({
      success: true,
      message: 'Location created successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const updateLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const result = await LocationsService.updateLocation(id, req.body);

    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Location not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Location updated successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getLocationById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    const result = await LocationsService.getLocationById(id);

    if (!result) {
      return res.status(httpStatus.NOT_FOUND).json({
        success: false,
        message: 'Location not found',
      });
    }

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Location retrieved successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const listLocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      name,
      location_code,
      limit,
      offset,
    } = req.query;

    const result = await LocationsService.listLocations({
      name: name as string | undefined,
      location_code: location_code as string | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });

    res.status(httpStatus.OK).json({
      success: true,
      message: 'Locations retrieved successfully',
      data: result.data,
      meta: {
        total: result.total,
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
};

const deleteLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    await LocationsService.deleteLocation(id);

    res.status(httpStatus.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
};

export const LocationsController = {
  createLocation,
  updateLocation,
  getLocationById,
  listLocations,
  deleteLocation,
};
