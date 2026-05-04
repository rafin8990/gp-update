export interface IUser {
  id: number;
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  password: string;
  role?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ILoginRequest {
  username: string;
  password: string;
}

export interface IRegisterRequest {
  name: string;
  username: string;
  email?: string;
  mobile_no?: string;
  password: string;
  role?: string;
}

export interface IAuthResponse {
  success: boolean;
  message: string;
  data: {
    user: Omit<IUser, 'password'>;
    accessToken: string;
    refreshToken: string;
  };
}

export interface ITokenPayload extends Record<string, unknown> {
  userId: number;
  username: string;
  role?: string;
}

export interface IRefreshTokenRequest {
  refreshToken: string;
}

export interface IRefreshTokenResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
  };
}
