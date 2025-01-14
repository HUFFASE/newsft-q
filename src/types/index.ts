export interface ActualsData {
  id: number
  brand_id: number
  year: number
  quarter: number
  revenue: number
  profit: number
  is_closed: boolean
  brand_name?: string
  brands?: {
    name: string
  }
}

export interface ForecastData {
  id: number
  brand_id: number
  year: number
  quarter: number
  revenue: number
  profit: number
  brand_name?: string
  brands?: {
    name: string
  }
}

export interface Brand {
  id: number
  name: string
  sales_manager_id?: string
}

export interface SalesManager {
  id: string
  full_name: string
  email: string
  role: 'director' | 'sales_manager'
} 