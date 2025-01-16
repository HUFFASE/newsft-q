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
  sales_manager_id?: string
}

interface SalesManager {
  id: string
  full_name: string
}

interface Target {
  id: number
  brand_id: number
  year: number
  quarter: number
  revenue: number
  profit: number
}

interface Forecast {
  id: number
  brand_id: number
  year: number
  quarter: number
  revenue: number
  profit: number
}

interface Actual {
  id: number
  brand_id: number
  year: number
  quarter: number
  revenue: number
  profit: number
  is_closed: boolean
}

interface DashboardData {
  year: number
  quarter: number
  brand_id: string
  brand?: {
    name: string
    sales_manager_id: string
  }
  revenue: number
  profit: number
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [selectedManager, setSelectedManager] = useState<string>('')
  const [brands, setBrands] = useState<Brand[]>([])
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [dashboardData, setDashboardData] = useState<DashboardData[]>([])
  
  // Kartlar için state'ler
  const [summaryData, setSummaryData] = useState({
    targets: { revenue: 0, profit: 0 },
    forecasts: { revenue: 0, profit: 0 },
    actuals: { revenue: 0, profit: 0 }
  })
  
  // Grafikler için state'ler
  const [chartData, setChartData] = useState({
    targets: { revenue: 0, profit: 0 },
    forecasts: { revenue: 0, profit: 0 },
    actuals: { revenue: 0, profit: 0 }
  })

  // Sayfa yüklendiğinde ve filtreler değiştiğinde özet verileri getir
  useEffect(() => {
    fetchSummaryData()
  }, [selectedYear, selectedQuarter, selectedManager, selectedBrandId])

  // Filtre değişikliklerinde grafik verilerini güncelle
  useEffect(() => {
    fetchChartData()
  }, [selectedYear, selectedQuarter, selectedManager, selectedBrandId])

  // Satış müdürü değiştiğinde markaları güncelle
  useEffect(() => {
    fetchBrands()
  }, [selectedManager])

  // Özet kartları için veri çekme
  const fetchSummaryData = async () => {
    try {
      setLoading(true)
      
      // Satış müdürlerini getir
      const { data: managers, error: managersError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'sales_manager')
        .order('full_name')

      if (managersError) throw managersError
      setSalesManagers(managers || [])

      // Markaları getir
      let brandsQuery = supabase
        .from('brands')
        .select('id, name, sales_manager_id')

      if (selectedManager) {
        brandsQuery = brandsQuery.eq('sales_manager_id', selectedManager)
      }

      const { data: brandsData, error: brandsError } = await brandsQuery
      if (brandsError) throw brandsError
      setBrands(brandsData || [])
      
      // Hedefler toplamı
      let targetsQuery = supabase
        .from('targets')
        .select('revenue, profit, brand_id')
        .eq('year', selectedYear)

      if (selectedQuarter) {
        targetsQuery = targetsQuery.eq('quarter', selectedQuarter)
      }
      if (selectedBrandId) {
        targetsQuery = targetsQuery.eq('brand_id', selectedBrandId)
      }
      if (selectedManager) {
        const managerBrandIds = brandsData
          ?.filter(b => b.sales_manager_id === selectedManager)
          .map(b => b.id)
        if (managerBrandIds?.length) {
          targetsQuery = targetsQuery.in('brand_id', managerBrandIds)
        }
      }
      const { data: targets, error: targetsError } = await targetsQuery

      if (targetsError) throw targetsError

      // Forecast toplamı
      let forecastsQuery = supabase
        .from('forecasts')
        .select('revenue, profit, brand_id')
        .eq('year', selectedYear)

      if (selectedQuarter) {
        forecastsQuery = forecastsQuery.eq('quarter', selectedQuarter)
      }
      if (selectedBrandId) {
        forecastsQuery = forecastsQuery.eq('brand_id', selectedBrandId)
      }
      if (selectedManager) {
        const managerBrandIds = brandsData
          ?.filter(b => b.sales_manager_id === selectedManager)
          .map(b => b.id)
        if (managerBrandIds?.length) {
          forecastsQuery = forecastsQuery.in('brand_id', managerBrandIds)
        }
      }
      const { data: forecasts, error: forecastsError } = await forecastsQuery

      if (forecastsError) throw forecastsError

      // Gerçekleşen toplamı
      let actualsQuery = supabase
        .from('actuals')
        .select('revenue, profit, brand_id')
        .eq('year', selectedYear)

      if (selectedQuarter) {
        actualsQuery = actualsQuery.eq('quarter', selectedQuarter)
      }
      if (selectedBrandId) {
        actualsQuery = actualsQuery.eq('brand_id', selectedBrandId)
      }
      if (selectedManager) {
        const managerBrandIds = brandsData
          ?.filter(b => b.sales_manager_id === selectedManager)
          .map(b => b.id)
        if (managerBrandIds?.length) {
          actualsQuery = actualsQuery.in('brand_id', managerBrandIds)
        }
      }
      const { data: actuals, error: actualsError } = await actualsQuery

      if (actualsError) throw actualsError

      // Toplamları hesapla
      const calculateTotals = (data: any[]) => {
        return data.reduce((acc, item) => ({
          revenue: acc.revenue + Number(item.revenue),
          profit: acc.profit + Number(item.profit)
        }), { revenue: 0, profit: 0 })
      }

      setSummaryData({
        targets: calculateTotals(targets || []),
        forecasts: calculateTotals(forecasts || []),
        actuals: calculateTotals(actuals || [])
      })

    } catch (err: any) {
      console.error('Özet veriler alınırken hata:', err.message)
      setError('Veriler alınırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // Grafikler için filtrelenmiş veri çekme
  const fetchChartData = async () => {
    try {
      let query = supabase
        .from('brands')
        .select(`
          id,
          name,
          targets!left(revenue, profit, year, quarter),
          forecasts!left(revenue, profit, year, quarter),
          actuals!left(revenue, profit, year, quarter)
        `)

      // Satış müdürü filtresi
      if (selectedManager) {
        query = query.eq('sales_manager_id', selectedManager)
      }

      // Marka filtresi
      if (selectedBrandId) {
        query = query.eq('id', selectedBrandId)
      }

      const { data, error } = await query

      if (error) throw error

      // Verileri topla
      const totals = data?.reduce((acc, brand) => {
        const calculateSum = (items: any[]) => items?.reduce((sum, item) => {
          // Yıl ve çeyrek kontrolü ekle
          if (item && 
              Number(item.year) === selectedYear && 
              (!selectedQuarter || Number(item.quarter) === selectedQuarter)) {
            return {
              revenue: sum.revenue + Number(item.revenue || 0),
              profit: sum.profit + Number(item.profit || 0)
            }
          }
          return sum
        }, { revenue: 0, profit: 0 })

        const brandTargets = calculateSum(brand.targets || [])
        const brandForecasts = calculateSum(brand.forecasts || [])
        const brandActuals = calculateSum(brand.actuals || [])

        return {
          targets: {
            revenue: acc.targets.revenue + brandTargets.revenue,
            profit: acc.targets.profit + brandTargets.profit
          },
          forecasts: {
            revenue: acc.forecasts.revenue + brandForecasts.revenue,
            profit: acc.forecasts.profit + brandForecasts.profit
          },
          actuals: {
            revenue: acc.actuals.revenue + brandActuals.revenue,
            profit: acc.actuals.profit + brandActuals.profit
          }
        }
      }, {
        targets: { revenue: 0, profit: 0 },
        forecasts: { revenue: 0, profit: 0 },
        actuals: { revenue: 0, profit: 0 }
      }) || {
        targets: { revenue: 0, profit: 0 },
        forecasts: { revenue: 0, profit: 0 },
        actuals: { revenue: 0, profit: 0 }
      }

      setChartData(totals)

    } catch (err: any) {
      console.error('Grafik verileri alınırken hata:', err.message)
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
      setSelectedBrandId('') // Markalar değiştiğinde seçili markayı sıfırla

    } catch (err: any) {
      console.error('Markalar alınırken hata:', err.message)
    }
  }

  // Para birimi formatı için yardımcı fonksiyon
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  // Grafik verilerini hazırla
  const chartDataConfig = {
    labels: ['Ciro', 'Karlılık'],
    datasets: [
      {
        label: 'Hedef',
        data: [
          chartData.targets.revenue,
          chartData.targets.profit
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-600
      },
      {
        label: 'Gerçekleşen',
        data: [
          chartData.actuals.revenue,
          chartData.actuals.profit
        ],
        backgroundColor: 'rgba(34, 197, 94, 0.5)', // green-600
      }
    ],
  }

  const chartData2Config = {
    labels: ['Ciro', 'Karlılık'],
    datasets: [
      {
        label: 'Hedef',
        data: [
          chartData.targets.revenue,
          chartData.targets.profit
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.5)', // blue-600
      },
      {
        label: 'Forecast',
        data: [
          chartData.forecasts.revenue,
          chartData.forecasts.profit
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.5)', // indigo-600
      }
    ],
  }

  // Grafik seçenekleri
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
              return new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(tickValue)
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
              return new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(tickValue)
            }
            return tickValue
          }
        }
      }
    }
  }

  // Kar marjı hesaplamaları
  const calculateMargin = (revenue: number, profit: number) => {
    return revenue > 0 ? (profit / revenue) * 100 : 0
  }

  const margins = {
    target: calculateMargin(summaryData.targets.revenue, summaryData.targets.profit),
    forecast: calculateMargin(summaryData.forecasts.revenue, summaryData.forecasts.profit),
    actual: calculateMargin(summaryData.actuals.revenue, summaryData.actuals.profit)
  }

  // Filtreleme fonksiyonunu güncelle
  const getFilteredData = () => {
    let filtered = dashboardData

    if (selectedYear) {
      filtered = filtered.filter(item => item.year === selectedYear)
    }

    if (selectedQuarter) {
      filtered = filtered.filter(item => item.quarter === selectedQuarter)
    }

    if (selectedBrandId) {
      filtered = filtered.filter(item => item.brand_id === selectedBrandId)
    }

    if (selectedManager) {
      filtered = filtered.filter(item => item.brand?.sales_manager_id === selectedManager)
    }

    return filtered
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
                {formatCurrency(summaryData.targets.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                {formatCurrency(summaryData.forecasts.revenue)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(summaryData.actuals.revenue)}
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
                {formatCurrency(summaryData.targets.profit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                {formatCurrency(summaryData.forecasts.profit)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                {formatCurrency(summaryData.actuals.profit)}
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
                %{margins.target.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Forecast</p>
              <p className="text-xl font-semibold text-indigo-600">
                %{margins.forecast.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gerçekleşen</p>
              <p className="text-xl font-semibold text-green-600">
                %{margins.actual.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detay Bilgileri */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seçili Filtre Bilgileri */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Seçili Filtreler</h4>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Satış Müdürü:</span>{' '}
                {selectedManager 
                  ? salesManagers.find(m => m.id === selectedManager)?.full_name || 'Bulunamadı'
                  : 'Tümü'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Marka:</span>{' '}
                {selectedBrandId 
                  ? brands.find(b => b.id === parseInt(selectedBrandId))?.name || 'Bulunamadı'
                  : 'Tümü'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Çeyrek:</span>{' '}
                {selectedQuarter ? `${selectedQuarter}. Çeyrek` : 'Tüm Çeyrekler'}
              </p>
            </div>
          </div>

          {/* Hedef ve Gerçekleşen */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Hedef ve Gerçekleşen</h4>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Hedef:</span>{' '}
                {formatCurrency(summaryData.targets.revenue)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Gerçekleşen:</span>{' '}
                {formatCurrency(summaryData.actuals.revenue)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Gerçekleşme Oranı:</span>{' '}
                {summaryData.targets.revenue > 0 
                  ? `%${((summaryData.actuals.revenue / summaryData.targets.revenue) * 100).toFixed(2)}`
                  : '%0'}
              </p>
            </div>
          </div>

          {/* Forecast Bilgileri */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Forecast Bilgileri</h4>
            <div className="space-y-1">
              <p className="text-sm">
                <span className="font-medium">Forecast:</span>{' '}
                {formatCurrency(summaryData.forecasts.revenue)}
              </p>
              <p className="text-sm">
                <span className="font-medium">Hedefe Göre Forecast Oranı:</span>{' '}
                {summaryData.targets.revenue > 0 
                  ? `%${((summaryData.forecasts.revenue / summaryData.targets.revenue) * 100).toFixed(2)}`
                  : '%0'}
              </p>
              <p className="text-sm">
                <span className="font-medium">Forecast Kar Marjı:</span>{' '}
                {`%${margins.forecast.toFixed(2)}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Detaylı Filtreler</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Yıl Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Yıl
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          {/* Çeyrek Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Çeyrek
            </label>
            <select
              value={selectedQuarter || ''}
              onChange={(e) => setSelectedQuarter(e.target.value ? Number(e.target.value) : null)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tüm Çeyrekler</option>
              {[1, 2, 3, 4].map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}. Çeyrek
                </option>
              ))}
            </select>
          </div>

          {/* Satış Müdürü Filtresi */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Satış Müdürü
            </label>
            <select
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
            <label className="block text-sm font-medium text-gray-700">
              Marka
            </label>
            <select
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
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
          <Bar options={chartOptions} data={chartDataConfig} />
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <Bar options={chartOptions2} data={chartData2Config} />
        </div>
      </div>
    </div>
  )
} 