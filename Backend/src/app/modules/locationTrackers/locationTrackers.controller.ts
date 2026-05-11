import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { LocationTrackersService } from './locationTrackers.service';

const parseListFilters = (req: Request) => ({
  searchTerm: req.query.searchTerm as string | undefined,
  epc: req.query.epc as string | undefined,
  location_code: req.query.location_code as string | undefined,
  po_number: req.query.po_number as string | undefined,
  item_number: req.query.item_number as string | undefined,
  status: req.query.status as 'in' | 'out' | undefined,
  start_date: req.query.start_date as string | undefined,
  end_date: req.query.end_date as string | undefined,
  page: req.query.page ? Number(req.query.page) : undefined,
  limit: req.query.limit ? Number(req.query.limit) : undefined,
  sortBy: req.query.sortBy as string | undefined,
  sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
});

const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await LocationTrackersService.listFromInboundScans(parseListFilters(req));
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Location activity retrieved successfully',
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    next(error);
  }
};

const stats = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await LocationTrackersService.getStats();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Location tracker statistics retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const currentStatus = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await LocationTrackersService.getCurrentStatus();
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Current location status retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const byLocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const locationCode = decodeURIComponent(req.params.locationCode);
    const data = await LocationTrackersService.listByLocationCode(locationCode);
    res.status(httpStatus.OK).json({
      success: true,
      message: 'Location trackers for location retrieved successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
};

const bulkDelete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ids = req.body.ids as number[];
    const { deleted } = await LocationTrackersService.deleteInboundScansByIds(ids);
    res.status(httpStatus.OK).json({
      success: true,
      message: deleted === 0 ? 'No matching rows were deleted' : `Deleted ${deleted} movement(s)`,
      data: { deleted },
    });
  } catch (error) {
    next(error);
  }
};

export const LocationTrackersController = {
  list,
  stats,
  currentStatus,
  byLocation,
  bulkDelete,
};
