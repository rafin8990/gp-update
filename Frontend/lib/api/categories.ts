// Using fetch instead of axios for simplicity
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export interface ICategory {
  id?: number;
  code: string;
  name: string;
  description?: string | null;
  parent_id?: number | null;
  status: 'active' | 'inactive';
  fusion_category_code?: string | null;
  created_at?: Date;
  updated_at?: Date;
}

export interface CategoryQueryParams {
  searchTerm?: string;
  code?: string;
  name?: string;
  status?: 'active' | 'inactive';
  parent_id?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryResponse {
  data: ICategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateCategoryData {
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  status: 'active' | 'inactive';
  fusion_category_code?: string;
}

export interface UpdateCategoryData {
  code: string;
  name: string;
  description?: string;
  parent_id?: number;
  status: 'active' | 'inactive';
  fusion_category_code?: string;
}

export const categoriesApi = {
  // Get all categories with pagination and filtering
  getAll: async (params: CategoryQueryParams = {}): Promise<CategoryResponse> => {
    try {
      const queryString = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryString.append(key, value.toString());
        }
      });
      const endpoint = `/api/v1/categories${queryString.toString() ? `?${queryString.toString()}` : ''}`;
      const response = await apiRequest(endpoint);
      return response;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  },

  // Get single category by ID
  getById: async (id: number): Promise<ICategory> => {
    try {
      const response = await apiRequest(`/api/v1/categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  },

  // Create new category
  create: async (data: CreateCategoryData): Promise<ICategory> => {
    try {
      const response = await apiRequest('/api/v1/categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  // Update category
  update: async (id: number, data: UpdateCategoryData): Promise<ICategory> => {
    try {
      const response = await apiRequest(`/api/v1/categories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  // Delete category
  delete: async (id: number): Promise<void> => {
    try {
      await apiRequest(`/api/v1/categories/${id}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  },

  // Get categories by status
  getByStatus: async (status: string): Promise<ICategory[]> => {
    try {
      const response = await apiRequest(`/api/v1/categories/status/${status}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories by status:', error);
      throw error;
    }
  },

  // Get parent categories (categories without parent)
  getParentCategories: async (): Promise<ICategory[]> => {
    try {
      const response = await apiRequest('/api/v1/categories/parents');
      return response.data;
    } catch (error) {
      console.error('Error fetching parent categories:', error);
      throw error;
    }
  }
};
