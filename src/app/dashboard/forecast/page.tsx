'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ForecastData {
  id: string
  brand_id: string
  year: number
  quarter: number
  revenue: number
  profit: number
  brand?: {
    name: string
    sales_manager_id: string
  }
}

interface SalesManager {
  id: string
  name: string
}

interface Brand {
  id: string
  name: string
  sales_manager_id: string
}

interface QuarterData {
  revenue: number
  profit: number
}

interface FormData {
  brand_id: string
  year: number
  quarters: {
    [key: number]: {
      revenue: number
      profit: number
    }
  }
}

interface QuarterSummary {
  revenue: number
  profit: number
  profitMargin: number
}

interface QuarterlySummaries {
  [key: number]: QuarterSummary
}

const initialFormData: FormData = {
  brand_id: '',
  year: new Date().getFullYear(),
  quarters: {
    1: { revenue: 0, profit: 0 },
    2: { revenue: 0, profit: 0 },
    3: { revenue: 0, profit: 0 },
    4: { revenue: 0, profit: 0 }
  }
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedForecast, setSelectedForecast] = useState<ForecastData | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [selectedManager, setSelectedManager] = useState<string>('')

  useEffect(() => {
    fetchUserRole()
    fetchSalesManagers()
    fetchForecasts()
    fetchBrands()
  }, [])

  // Debug için userRole değişikliklerini izle
  useEffect(() => {
    console.log('Current userRole:', userRole)
  }, [userRole])

  useEffect(() => {
    if (selectedForecast) {
      setFormData({
        brand_id: selectedForecast.brand_id,
        year: selectedForecast.year,
        quarters: {
          1: { revenue: selectedForecast.revenue, profit: selectedForecast.profit },
          2: { revenue: selectedForecast.revenue, profit: selectedForecast.profit },
          3: { revenue: selectedForecast.revenue, profit: selectedForecast.profit },
          4: { revenue: selectedForecast.revenue, profit: selectedForecast.profit }
        }
      })
    } else {
      setFormData(initialFormData)
    }
  }, [selectedForecast])

  // Yıl değiştiğinde verileri yeniden yükle
  useEffect(() => {
    fetchForecasts()
  }, [selectedYear])

  const fetchUserRole = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        return
      }

      console.log('Current user:', user)
      
      if (!user) {
        console.log('No user found')
        return
      }

      // Önce profiles tablosundan kontrol et
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .limit(1)

      if (profileError) {
        console.error('Profile error:', profileError)
        return
      }

      console.log('Profile data:', profileData)

      if (profileData && profileData.length > 0) {
        const role = profileData[0].role
        console.log('Setting role from profile:', role)
        setUserRole(role)
        return
      }

      // Eğer profiles'da rol bulunamazsa user_metadata'ya bak
      if (user.user_metadata?.role) {
        console.log('Setting role from metadata:', user.user_metadata.role)
        setUserRole(user.user_metadata.role)
        return
      }

      console.log('No role found in either profile or metadata')
    } catch (error: any) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchForecasts = async () => {
    try {
      const { data, error } = await supabase
        .from('forecasts')
        .select(`
          *,
          brand:brands(
            name,
            sales_manager_id
          )
        `)
        .order('year')
        .order('quarter')
        .order('brand_id')

      if (error) throw error

      setForecasts(data)
    } catch (error: any) {
      console.error('Error in fetchForecasts:', error.message)
    }
  }

  const fetchSalesManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'sales_manager')
        .order('full_name')

      if (error) throw error

      const formattedData = data.map(manager => ({
        id: manager.id,
        name: manager.full_name
      }))

      setSalesManagers(formattedData)
    } catch (error: any) {
      console.error('Error fetching sales managers:', error.message)
    }
  }

  const fetchBrands = async () => {
    try {
      let query = supabase
        .from('brands')
        .select('id, name, sales_manager_id')
        .order('name')

      if (selectedManager) {
        query = query.eq('sales_manager_id', selectedManager)
      }

      const { data, error } = await query

      if (error) throw error

      setBrands(data || [])
    } catch (error: any) {
      console.error('Error fetching brands:', error.message)
    }
  }

  // Satış müdürü değiştiğinde markaları güncelle
  useEffect(() => {
    fetchBrands()
    setSelectedBrandId('') // Marka seçimini sıfırla
  }, [selectedManager])

  const handleAddForecast = () => {
    setSelectedForecast(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  const handleEditForecast = (forecast: ForecastData) => {
    setSelectedForecast(forecast)
    setIsModalOpen(true)
  }

  const handleDeleteForecast = async (forecastId: string) => {
    if (window.confirm('Bu forecast\'i silmek istediğinizden emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('forecasts')
          .delete()
          .eq('id', forecastId)

        if (error) throw error

        setForecasts(forecasts.filter(f => f.id !== forecastId))
      } catch (error: any) {
        console.error('Error deleting forecast:', error.message)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Tüm çeyrekler için forecast verilerini hazırla
      const forecastData = Object.entries(formData.quarters).map(([quarter, data]) => ({
        brand_id: formData.brand_id,
        year: formData.year,
        quarter: parseInt(quarter),
        revenue: data.revenue,
        profit: data.profit
      }))

      if (selectedForecast) {
        // Güncelleme - mevcut forecastleri sil ve yeniden ekle
        const { error: deleteError } = await supabase
          .from('forecasts')
          .delete()
          .eq('brand_id', formData.brand_id)
          .eq('year', formData.year)

        if (deleteError) throw deleteError

        const { error: insertError } = await supabase
          .from('forecasts')
          .insert(forecastData)

        if (insertError) throw insertError
      } else {
        // Yeni ekleme
        const { error } = await supabase
          .from('forecasts')
          .insert(forecastData)

        if (error) throw error
      }

      await fetchForecasts()
      setIsModalOpen(false)
      setSelectedForecast(null)
      setFormData(initialFormData)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (
    quarter: number,
    field: 'revenue' | 'profit',
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      quarters: {
        ...prev.quarters,
        [quarter]: {
          ...prev.quarters[quarter],
          [field]: parseFloat(value) || 0
        }
      }
    }))
  }

  const getFilteredForecasts = () => {
    return forecasts.filter(forecast => {
      const yearMatch = forecast.year === selectedYear
      const brandMatch = selectedBrandId ? forecast.brand_id === selectedBrandId : true
      const managerMatch = selectedManager 
        ? forecast.brand?.sales_manager_id === selectedManager 
        : true
      return yearMatch && brandMatch && managerMatch
    })
  }

  const calculateTotalSummary = (forecasts: ForecastData[]) => {
    // Sadece seçili yıla ait verileri filtrele
    const yearlyForecasts = forecasts.filter(forecast => forecast.year === selectedYear)
    
    const totalRevenue = yearlyForecasts.reduce((sum, forecast) => sum + forecast.revenue, 0)
    const totalProfit = yearlyForecasts.reduce((sum, forecast) => sum + forecast.profit, 0)
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      totalRevenue,
      totalProfit,
      profitMargin,
    }
  }

  const calculateFilteredSummary = (forecasts: ForecastData[]) => {
    const filteredForecasts = forecasts.filter(forecast => {
      const yearMatch = forecast.year === selectedYear
      const brandMatch = selectedBrandId ? forecast.brand_id === selectedBrandId : true
      const managerMatch = selectedManager 
        ? forecast.brand?.sales_manager_id === selectedManager 
        : true
      return yearMatch && brandMatch && managerMatch
    })

    return calculateQuarterlySummary(filteredForecasts)
  }

  const calculateQuarterlySummary = (forecasts: ForecastData[]): QuarterlySummaries => {
    const summary: QuarterlySummaries = {}

    // Her çeyrek için başlangıç değerlerini ayarla
    for (let quarter = 1; quarter <= 4; quarter++) {
      summary[quarter] = {
        revenue: 0,
        profit: 0,
        profitMargin: 0,
      }
    }

    // Forecast verilerini topla
    forecasts.forEach(forecast => {
      const quarterData = summary[forecast.quarter]
      quarterData.revenue += forecast.revenue
      quarterData.profit += forecast.profit
    })

    // Kar marjlarını hesapla
    Object.values(summary).forEach(quarterData => {
      quarterData.profitMargin = quarterData.revenue > 0
        ? (quarterData.profit / quarterData.revenue) * 100
        : 0
    })

    return summary
  }

  const totalSummary = calculateTotalSummary(forecasts)
  const filteredQuarterlySummary = calculateFilteredSummary(forecasts)

  return (
    <div className="space-y-6">
      {/* Özet Kartları - Genel Toplam */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Toplam Ciro Forecast</h3>
          <p className="mt-2 text-3xl font-bold text-blue-600">
            {totalSummary.totalRevenue.toLocaleString('tr-TR')} ₺
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Toplam Karlılık Forecast</h3>
          <p className="mt-2 text-3xl font-bold text-green-600">
            {totalSummary.totalProfit.toLocaleString('tr-TR')} ₺
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900">Ortalama Kar Marjı</h3>
          <p className="mt-2 text-3xl font-bold text-purple-600">
            %{totalSummary.profitMargin.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700">
              Yıl
            </label>
            <select
              id="year"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {Array.from({ length: 7 }, (_, i) => 2024 + i).map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="manager" className="block text-sm font-medium text-gray-700">
              Satış Müdürü
            </label>
            <select
              id="manager"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedManager}
              onChange={(e) => setSelectedManager(e.target.value)}
            >
              <option value="">Tüm Satış Müdürleri</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="brand" className="block text-sm font-medium text-gray-700">
              Marka
            </label>
            <select
              id="brand"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              value={selectedBrandId}
              onChange={(e) => setSelectedBrandId(e.target.value)}
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

      {/* Çeyreklik Detay Kartları - Filtrelenmiş Veriler */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(filteredQuarterlySummary).map(([quarter, data]) => (
          <div key={quarter} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900">{quarter}. Çeyrek</h3>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Ciro Forecast</p>
                <p className="mt-1 text-xl font-semibold">{data.revenue.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Karlılık Forecast</p>
                <p className="mt-1 text-xl font-semibold">{data.profit.toLocaleString('tr-TR')} ₺</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Kar Marjı</p>
                <div className="mt-1">
                  <div className="flex items-center">
                    <span className="text-xl font-semibold">%{data.profitMargin.toFixed(1)}</span>
                    <div className="flex-1 ml-3">
                      <div className="h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-purple-600 rounded-full"
                          style={{ width: `${Math.min(data.profitMargin, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Forecast Ekleme/Düzenleme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            <h2 className="text-xl font-semibold mb-4">
              {selectedForecast ? 'Forecast Düzenle' : 'Yeni Forecast Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Marka
                  </label>
                  <select
                    name="brand_id"
                    value={formData.brand_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    <option value="">Marka Seçin</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Yıl
                  </label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  >
                    {Array.from({ length: 7 }, (_, i) => 2024 + i).map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(formData.quarters).map(([quarter, data]) => (
                  <div key={quarter} className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {quarter}. Çeyrek
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Ciro Forecast
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            value={data.revenue}
                            onChange={(e) => handleInputChange(parseInt(quarter), 'revenue', e.target.value)}
                            className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500"
                            required
                            min="0"
                            step="1000"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-500 sm:text-sm">₺</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Karlılık Forecast
                        </label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                          <input
                            type="number"
                            value={data.profit}
                            onChange={(e) => handleInputChange(parseInt(quarter), 'profit', e.target.value)}
                            className="block w-full rounded-md border-gray-300 pl-3 pr-12 focus:border-indigo-500 focus:ring-indigo-500"
                            required
                            min="0"
                            step="1000"
                          />
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <span className="text-gray-500 sm:text-sm">₺</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setSelectedForecast(null)
                    setFormData(initialFormData)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Yeni Forecast Ekleme Butonu - Sadece direktörler görebilir */}
      {userRole === 'director' && (
        <div className="fixed bottom-8 right-8">
          <button
            onClick={handleAddForecast}
            className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      )}
    </div>
  )
} 