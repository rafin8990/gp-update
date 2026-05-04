export interface Asset {
  id: number
  code: string
  name: string
  description: string
  status: string
  purchase_date: string
  created_at: string
  updated_at: string
  brand?: {
    id: number
    name: string
  }
  branch?: {
    id: number
    name: string
  }
  floor?: {
    id: number
    name: string
  }
  department?: {
    id: number
    name: string
  }
}
