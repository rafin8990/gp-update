import axiosInstance from '../axios';

export interface User {
  id: number;
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  role?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  password: string;
  role?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
  };
}

// Auth API functions
export const authAPI = {
  // Login user
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/login', credentials);
    return response.data;
  },

  // Register user
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await axiosInstance.post('/auth/register', userData);
    return response.data;
  },

  // Get user profile
  getProfile: async (): Promise<ProfileResponse> => {
    const response = await axiosInstance.get('/auth/profile');
    return response.data;
  },

  // Refresh access token
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await axiosInstance.post('/auth/refresh-token', { refreshToken });
    return response.data;
  },

  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Set auth tokens
  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  },

  // Get stored tokens
  getTokens: () => {
    return {
      accessToken: localStorage.getItem('authToken'),
      refreshToken: localStorage.getItem('refreshToken'),
    };
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken');
    return !!token;
  },
};

// Demo accounts data - matches seeder users
export const demoAccounts = {
  super_admin: {
    username: 'superadmin',
    password: 'superadmin123',
    role: 'super_admin',
    name: 'Super Admin',
    description: 'Highest level access with system management',
    email: 'superadmin@example.com'
  },
  admin: {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    name: 'Admin User',
    description: 'Full system access with all permissions',
    email: 'admin@example.com'
  },
  manager: {
    username: 'manager',
    password: 'manager123',
    role: 'admin',
    name: 'Manager User',
    description: 'Administrative access for management tasks',
    email: 'manager@example.com'
  },
  johndoe: {
    username: 'johndoe',
    password: 'user123',
    role: 'user',
    name: 'John Doe',
    description: 'Regular user access',
    email: 'john.doe@example.com'
  },
  janesmith: {
    username: 'janesmith',
    password: 'user123',
    role: 'user',
    name: 'Jane Smith',
    description: 'Regular user access',
    email: 'jane.smith@example.com'
  },
  testuser: {
    username: 'testuser',
    password: 'test123',
    role: 'user',
    name: 'Test User',
    description: 'Test account for development',
    email: 'test@example.com'
  }
};
