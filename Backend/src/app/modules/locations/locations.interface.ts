export interface ILocation {
  id: number;
  name: string;
  location_code?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ICreateLocationRequest {
  name: string;
  location_code?: string | null;
}

export interface IUpdateLocationRequest {
  name?: string;
  location_code?: string | null;
}
