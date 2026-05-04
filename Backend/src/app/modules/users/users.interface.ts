export interface IUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
  mobile_no: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
}

export interface IUpdateUserPayload {
  name?: string;
  email?: string;
  mobile_no?: string;
  role?: string;
  password?: string;
}

