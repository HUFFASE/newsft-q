'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

interface ForecastData {
  year: number
  quarter: number
  revenue: number
  profit: number
  brand_id: number
}

interface ForecastSummary {
  total_revenue: number
  total_profit: number
  profit_margin: number
}

interface ActualsData {
  year: number
  month: number
  revenue: number
  profit: number
  brand_id: number
}

interface Brand {
  id: number
  name: string
}

interface SalesManager {
  id: string
  full_name: string
}

export default function DashboardPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [forecastData, setForecastData] = useState<ForecastData[]>([])
  const [actualsData, setActualsData] = useState<ActualsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // İlk yüklemede ve yıl değiştiğinde tüm verileri getir
  useEffect(() => {
    fetchAllData()
  }, [selectedYear])

  // Satış müdürü değiştiğinde markaları güncelle
  useEffect(() => {
    fetchBrands()
  }, [selectedManager])

  const fetchAllData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Satış müdürlerini getir
      const { data: managersData, error: managersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'sales_manager')
        .order('full_name')

      if (managersError) throw managersError
      setSalesManagers(managersData || [])

      // Markaları getir
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('id, name')
        .order('name')

      if (brandsError) throw brandsError
      setBrands(brandsData || [])

      // Forecast verilerini getir
      const { data: forecastResult, error: forecastError } = await supabase
        .from('forecasts')
        .select('*')
        .eq('year', selectedYear)

      if (forecastError) throw forecastError
      setForecastData(forecastResult || [])

      // Gerçekleşen verileri getir
      const { data: actualsResult, error: actualsError } = await supabase
        .from('actuals')
        .select('*')
        .eq('year', selectedYear)

      if (actualsError) throw actualsError
      setActualsData(actualsResult || [])

    } catch (err: any) {
      setError('Veriler alınırken bir hata oluştu: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchBrands = async () => {
    try {
      let query = supabase
        .from('brands')
        .select('id, name')

      if (selectedManager) {
        query = query.eq('sales_manager_id', selectedManager)
      }

      const { data, error } = await query.order('name')

      if (error) throw error
      setBrands(data || [])
      setSelectedBrand(null) // Markalar değiştiğinde seçili markayı sıfırla

    } catch (err: any) {
      console.error('Markalar alınırken hata:', err.message)
    }
  }

  // Filtrelenmiş verileri hesapla
  const getFilteredData = () => {
    let filteredForecasts = forecastData
    let filteredActuals = actualsData

    if (selectedBrand) {
      filteredForecasts = filteredForecasts.filter(f => f.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
    } else if (selectedManager) {
      // Seçili müdüre ait marka ID'lerini al
      const managerBrandIds = brands.map(b => b.id)
      filteredForecasts = filteredForecasts.filter(f => managerBrandIds.includes(f.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
    }

    return {
      forecasts: filteredForecasts,
      actuals: filteredActuals
    }
  }

  // Genel toplam değerleri hesapla
  const forecastTotals = forecastData.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.revenue || 0),
    profit: acc.profit + (curr.profit || 0)
  }), { revenue: 0, profit: 0 })

  const actualsTotals = actualsData.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.revenue || 0),
    profit: acc.profit + (curr.profit || 0)
  }), { revenue: 0, profit: 0 })

  // Genel marjları hesapla
  const forecastMargin = forecastTotals.revenue > 0 
    ? (forecastTotals.profit / forecastTotals.revenue) * 100 
    : 0

  const actualsMargin = actualsTotals.revenue > 0 
    ? (actualsTotals.profit / actualsTotals.revenue) * 100 
    : 0

  // Filtrelenmiş verileri al
  const { forecasts: filteredForecasts, actuals: filteredActuals } = getFilteredData()

  // Filtrelenmiş verilerden toplamları hesapla
  const filteredForecastTotals = filteredForecasts.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.revenue || 0),
    profit: acc.profit + (curr.profit || 0)
  }), { revenue: 0, profit: 0 })

  const filteredActualsTotals = filteredActuals.reduce((acc, curr) => ({
    revenue: acc.revenue + (curr.revenue || 0),
    profit: acc.profit + (curr.profit || 0)
  }), { revenue: 0, profit: 0 })

  // Grafik verilerini hazırla - filtrelenmiş verilerle
  const chartData = {
    labels: ['Ciro', 'Karlılık'],
    datasets: [
      {
        label: 'Hedef',
        data: [
          filteredForecastTotals.revenue * 1.2,
          filteredForecastTotals.profit * 1.2
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-600
      },
      {
        label: 'Gerçekleşen',
        data: [
          filteredActualsTotals.revenue,
          filteredActualsTotals.profit
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.5)', // green-600
      }
    ],
  }

  const chartData2 = {
    labels: ['Ciro', 'Karlılık'],
    datasets: [
      {
        label: 'Hedef',
        data: [
          filteredForecastTotals.revenue * 1.2,
          filteredForecastTotals.profit * 1.2
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-600
      },
      {
        label: 'Forecast',
        data: [
          filteredForecastTotals.revenue,
          filteredForecastTotals.profit
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.5)', // indigo-600
      }
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Hedef vs Gerçekleşen',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(this: any, tickValue: string | number) {
            if (typeof tickValue === 'number') {
              return tickValue.toLocaleString('tr-TR') + ' ₺'
            }
            return tickValue
          }
        }
      }
    }
  }

  const chartOptions2 = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Hedef vs Forecast',
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        beginAtZero: true,
        ticks: {
          callback: function(this: any, tickValue: string | number) {
            if (typeof tickValue === 'number') {
              return tickValue.toLocaleString('tr-TR') + ' ₺'
            }
            return tickValue
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Yükleniyor...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ciro Kartı */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Toplam Ciro</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Hedef</p>
              <p className="text-xl font-semibold text-blue-600">
                {(forecastTotals.revenue * 1.2).toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                {forecastTotals.revenue.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                {actualsTotals.revenue.toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>
        </div>

        {/* Karlılık Kartı */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Toplam Karlılık</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Hedef</p>
              <p className="text-xl font-semibold text-blue-600">
                {(forecastTotals.profit * 1.2).toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                {forecastTotals.profit.toLocaleString('tr-TR')} ₺
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                {actualsTotals.profit.toLocaleString('tr-TR')} ₺
              </p>
            </div>
          </div>
        </div>

        {/* Karlılık Oranı Kartı */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Karlılık Oranı</h3>
          <div className="mt-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Hedef</p>
              <p className="text-xl font-semibold text-blue-600">
                %{(forecastMargin * 1.2).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                %{forecastMargin.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                %{actualsMargin.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Detaylı Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Yıl Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yıl
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              {Array.from({ length: 7 }, (_, i) => currentYear + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Satış Müdürü Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satış Müdürü
            </label>
            <select
              value={selectedManager || ''}
              onChange={(e) => {
                setSelectedManager(e.target.value || null)
                setSelectedBrand(null) // Satış müdürü değiştiğinde seçili markayı sıfırla
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tüm Satış Müdürleri</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Marka Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka
            </label>
            <select
              value={selectedBrand || ''}
              onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Tüm Markalar</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grafikler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar options={chartOptions} data={chartData} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar options={chartOptions2} data={chartData2} />
        </div>
      </div>
    </div>
  )
} 