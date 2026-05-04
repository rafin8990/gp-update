type IOptions = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
};

type IOptionsResult = {
  page: number;
  limit: number;
  skip: number;
  sortBy: string;
  sortOrder: string;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
};

const calculatePagination = (options: IOptions): IOptionsResult => {
  const page = Number(options.page || 1);
  const limit = Number(options.limit || 10);
  const skip = (page - 1) * limit;

  const sortBy = options.sortBy || 'created_at';
  const sortOrder = options.sortOrder || 'desc';

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
};

const calculatePaginationMetadata = (
  page: number,
  limit: number,
  total: number
) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    totalPages,
    hasNext,
    hasPrev,
  };
};

export const paginationHelpers = {
  calculatePagination,
  calculatePaginationMetadata,
};
