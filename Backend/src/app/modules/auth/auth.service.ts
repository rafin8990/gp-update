import bcrypt from 'bcryptjs';
import { ILoginRequest, IRegisterRequest, IAuthResponse, IUser, ITokenPayload, IRefreshTokenResponse } from './auth.interface';
import { jwtHelpers } from '../../../helpers/jwtHelpers';
import config from '../../../config';
import pool from '../../../utils/dbClient';

const createUser = async (userData: IRegisterRequest): Promise<Omit<IUser, 'password'>> => {
  const { name, username, email, mobile_no, password, role } = userData;
  
  // Hash password
  const hashedPassword = await bcrypt.hash(password, Number(config.bycrypt_salt_rounds) || 12);
  
  const query = `
    INSERT INTO users (name, username, email, mobile_no, password, role)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, name, username, email, mobile_no, role, created_at, updated_at
  `;
  
  const values = [name, username, email || null, mobile_no || null, hashedPassword, role || 'user'];
  
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByUsername = async (username: string): Promise<IUser | null> => {
  const query = 'SELECT * FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows[0] || null;
};

const findUserById = async (id: number): Promise<IUser | null> => {
  const query = 'SELECT * FROM users WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rows[0] || null;
};

const createTokens = (user: IUser): { accessToken: string; refreshToken: string } => {
  const payload: ITokenPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const accessToken = jwtHelpers.createToken(
    payload,
    config.jwt_secret as string,
    config.jwt_expires_in as string
  );

  const refreshToken = jwtHelpers.createToken(
    payload,
    config.jwt_refresh_secret as string,
    config.jwt_refresh_expires_in as string
  );

  return { accessToken, refreshToken };
};

const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

const registerUser = async (userData: IRegisterRequest): Promise<IAuthResponse> => {
  // Check if user already exists
  const existingUser = await findUserByUsername(userData.username);
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // Create new user
  const newUser = await createUser(userData);
  
  // Create tokens
  const { accessToken, refreshToken } = createTokens(newUser as IUser);

  return {
    success: true,
    message: 'User registered successfully',
    data: {
      user: newUser,
      accessToken,
      refreshToken,
    },
  };
};

const loginUser = async (loginData: ILoginRequest): Promise<IAuthResponse> => {
  const { username, password } = loginData;

  // Find user by username
  const user = await findUserByUsername(username);
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Verify password
  const isPasswordValid = await verifyPassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Create tokens
  const { accessToken, refreshToken } = createTokens(user);

  // Remove password from user object
  const { password: _, ...userWithoutPassword } = user;

  return {
    success: true,
    message: 'Login successful',
    data: {
      user: userWithoutPassword,
      accessToken,
      refreshToken,
    },
  };
};

const refreshAccessToken = async (refreshToken: string): Promise<IRefreshTokenResponse> => {
  try {
    // Verify refresh token
    const decoded = jwtHelpers.verifyToken(refreshToken, config.jwt_refresh_secret as string);
    
    // Find user by ID
    const user = await findUserById(decoded.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create new tokens
    const { accessToken, refreshToken: newRefreshToken } = createTokens(user);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

export const AuthService = {
  registerUser,
  loginUser,
  refreshAccessToken,
  findUserById,
  verifyPassword,
};
