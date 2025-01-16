'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'react-hot-toast'

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

// Başlangıç state'leri için yardımcı fonksiyon
const getCurrentYear = () => {
  return 2024 // Sabit bir değer kullanıyoruz
}

const initialFormData = {
  brand_id: '',
  year: 2024, // Sabit bir değer kullanıyoruz
  quarters: {
    1: { revenue: 0, profit: 0 },
    2: { revenue: 0, profit: 0 },
    3: { revenue: 0, profit: 0 },
    4: { revenue: 0, profit: 0 }
  }
}

export default function ForecastPage() {
  // State tanımlamaları
  const defaultYear = 2024
  const [mounted, setMounted] = useState(false)
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedForecast, setSelectedForecast] = useState<ForecastData | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(defaultYear)
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null)
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [selectedManager, setSelectedManager] = useState<string>('')
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [closedQuarters, setClosedQuarters] = useState<{[key: string]: boolean}>({})
  const [submitting, setSubmitting] = useState(false)

  // Fonksiyon tanımlamaları
  const fetchUserRole = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        return
      }

      if (!user) {
        console.log('No user found')
        return
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .limit(1)

      if (profileError) {
        console.error('Profile error:', profileError)
        return
      }

      if (profileData && profileData.length > 0) {
        const role = profileData[0].role
        setUserRole(role)
        return
      }

      if (user.user_metadata?.role) {
        setUserRole(user.user_metadata.role)
        return
      }
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

  const fetchClosedQuarters = async () => {
    try {
      const { data, error } = await supabase
        .from('actuals')
        .select('quarter, is_closed')
        .eq('year', selectedYear)
        .eq('is_closed', true)

      if (error) throw error

      const closedQuartersMap = data.reduce((acc: {[key: string]: boolean}, curr) => {
        acc[curr.quarter] = curr.is_closed
        return acc
      }, {})

      setClosedQuarters(closedQuartersMap)
    } catch (err) {
      console.error('Error fetching closed quarters:', err)
    }
  }

  // useEffect tanımlamaları
  useEffect(() => {
    const initializeData = async () => {
      setMounted(true)
      const currentYear = new Date().getFullYear()
      setSelectedYear(currentYear)
      setFormData(prev => ({
        ...prev,
        year: currentYear
      }))

      await fetchUserRole()
      await fetchSalesManagers()
      await fetchForecasts()
      await fetchBrands()
      await fetchClosedQuarters()
    }

    initializeData()
  }, [])

  // Yıl değiştiğinde verileri yeniden yükle
  useEffect(() => {
    if (mounted) {
      fetchForecasts()
      fetchClosedQuarters()
    }
  }, [selectedYear, mounted])

  // Debug için userRole değişikliklerini izle
  useEffect(() => {
    if (mounted) {
      console.log('Current userRole:', userRole)
    }
  }, [userRole, mounted])

  // Satış müdürü değiştiğinde markaları güncelle
  useEffect(() => {
    if (mounted) {
      fetchBrands()
      setSelectedBrandId('') // Marka seçimini sıfırla
    }
  }, [selectedManager, mounted])

  // Form açıldığında verileri yükle
  useEffect(() => {
    if (mounted && isModalOpen && formData.brand_id) {
      handleForecastFormOpen(formData.brand_id)
    }
  }, [isModalOpen, formData.brand_id, mounted])

  // Selected forecast değiştiğinde form verilerini güncelle
  useEffect(() => {
    if (mounted) {
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
    }
  }, [selectedForecast, mounted])

  if (!mounted) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  }

  const handleAddForecast = () => {
    setSelectedForecast(null);
    setFormData({
      ...initialFormData,
      year: selectedYear // Seçili yılı kullan
    });
    setIsModalOpen(true);
  };

  const handleEditForecast = (forecast: ForecastData) => {
    setSelectedForecast(forecast);
    setFormData({
      brand_id: forecast.brand_id,
      year: forecast.year,
      quarters: {
        1: { revenue: 0, profit: 0 },
        2: { revenue: 0, profit: 0 },
        3: { revenue: 0, profit: 0 },
        4: { revenue: 0, profit: 0 }
      }
    });
    setIsModalOpen(true);
    handleForecastFormOpen(forecast.brand_id);
  }

  const handleForecastFormOpen = async (brandId: string) => {
    if (!brandId) {
      console.error('Marka ID bulunamadı');
      toast.error('Lütfen bir marka seçin');
      return;
    }

    try {
      setIsLoading(true);
      
      // Seçili marka için hedefleri getir
      const { data: targets, error: targetsError } = await supabase
        .from('targets')
        .select('*')
        .eq('brand_id', brandId)
        .eq('year', formData.year)
        .order('quarter');

      if (targetsError) {
        console.error('Hedefler alınırken hata:', targetsError);
        throw targetsError;
      }

      // Seçili marka için mevcut forecast'leri getir
      const { data: forecasts, error: forecastsError } = await supabase
        .from('forecasts')
        .select('*')
        .eq('brand_id', brandId)
        .eq('year', formData.year)
        .order('quarter');

      if (forecastsError) {
        console.error('Forecastlar alınırken hata:', forecastsError);
        throw forecastsError;
      }

      // Her çeyrek için kontrol et
      const newQuarters: { [key: string]: QuarterData } = {
        1: { revenue: 0, profit: 0 },
        2: { revenue: 0, profit: 0 },
        3: { revenue: 0, profit: 0 },
        4: { revenue: 0, profit: 0 }
      };

      // Önce forecast verilerini kontrol et
      forecasts?.forEach(forecast => {
        if (forecast.quarter) {
          newQuarters[forecast.quarter] = {
            revenue: Number(forecast.revenue) || 0,
            profit: Number(forecast.profit) || 0
          };
        }
      });

      // Forecast yoksa hedef verilerini kullan
      targets?.forEach(target => {
        if (target.quarter && !forecasts?.find(f => f.quarter === target.quarter)) {
          newQuarters[target.quarter] = {
            revenue: Number(target.revenue) || 0,
            profit: Number(target.profit) || 0
          };
        }
      });

      setFormData(prev => ({
        ...prev,
        quarters: newQuarters
      }));

    } catch (error: any) {
      console.error('Form verilerini yüklerken hata:', error.message || error);
      toast.error(error.message || 'Form verilerini yüklerken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

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
    
    try {
      setSubmitting(true)
      
      // Seçili marka için mevcut forecast'leri getir
      const { data: forecasts, error: forecastsError } = await supabase
        .from('forecasts')
        .select('*')
        .eq('brand_id', formData.brand_id)
        .eq('year', formData.year)
      
      if (forecastsError) throw forecastsError
      
      // Her çeyrek için kontrol et
      for (let quarter = 1; quarter <= 4; quarter++) {
        const quarterData = formData.quarters[quarter];
        const existingForecast = forecasts?.find(f => f.quarter === quarter);

        if (existingForecast) {
          // Güncelleme yap
          const { error: updateError } = await supabase
            .from('forecasts')
            .update({
              revenue: quarterData.revenue,
              profit: quarterData.profit
            })
            .eq('id', existingForecast.id);

          if (updateError) throw updateError;
        } else {
          // Yeni kayıt ekle
          const { error: insertError } = await supabase
            .from('forecasts')
            .insert({
              brand_id: formData.brand_id,
              year: formData.year,
              quarter: quarter,
              revenue: quarterData.revenue,
              profit: quarterData.profit
            });

          if (insertError) throw insertError;
        }
      }
      
      toast.success('Forecast başarıyla kaydedildi')
      fetchData() // Verileri yenile
      setIsModalOpen(false) // Modal'ı kapat
      
    } catch (error: any) {
      console.error('Forecast kaydedilirken hata:', error)
      toast.error('Forecast kaydedilirken bir hata oluştu')
    } finally {
      setSubmitting(false)
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
      const quarterMatch = selectedQuarter ? forecast.quarter === selectedQuarter : true
      const brandMatch = selectedBrandId ? forecast.brand_id === selectedBrandId : true
      const managerMatch = selectedManager && selectedManager !== '' 
        ? forecast.brand?.sales_manager_id === selectedManager 
        : true
      return yearMatch && quarterMatch && brandMatch && managerMatch
    })
  }

  const calculateTotalSummary = (forecasts: ForecastData[]) => {
    if (!forecasts?.length) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0
      }
    }

    const summary = forecasts.reduce(
      (acc, forecast) => {
        acc.totalRevenue += Number(forecast.revenue) || 0
        acc.totalProfit += Number(forecast.profit) || 0
        return acc
      },
      { totalRevenue: 0, totalProfit: 0, profitMargin: 0 }
    )

    summary.profitMargin = summary.totalRevenue > 0
      ? (summary.totalProfit / summary.totalRevenue) * 100
      : 0

    return summary
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const calculateFilteredSummary = (forecasts: ForecastData[]) => {
    const filteredForecasts = forecasts.filter(forecast => {
      const yearMatch = forecast.year === selectedYear
      const quarterMatch = selectedQuarter ? forecast.quarter === selectedQuarter : true
      const brandMatch = selectedBrandId ? forecast.brand_id === selectedBrandId : true
      const managerMatch = selectedManager && selectedManager !== ''
        ? forecast.brand?.sales_manager_id === selectedManager 
        : true
      return yearMatch && quarterMatch && brandMatch && managerMatch
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
      if (forecast.quarter && summary[forecast.quarter]) {
        const quarterData = summary[forecast.quarter]
        quarterData.revenue += Number(forecast.revenue) || 0
        quarterData.profit += Number(forecast.profit) || 0
      }
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

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Forecast verilerini getir
      const { data: forecasts, error: forecastError } = await supabase
        .from('forecasts')
        .select('*, brands(name)')
        .eq('year', selectedYear)
        .order('quarter', { ascending: true })
      
      if (forecastError) throw forecastError
      setForecasts(forecasts || [])
      
    } catch (error: any) {
      console.error('Veriler alınırken hata:', error)
      toast.error('Veriler alınırken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const YearSelect = () => {
    const years = Array.from({ length: 7 }, (_, i) => getCurrentYear() + i)
    
    return (
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
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {mounted && (
        <>
          {/* Özet Kartları - Genel Toplam */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Toplam Ciro Forecast</h3>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {formatCurrency(totalSummary.totalRevenue)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900">Toplam Karlılık Forecast</h3>
              <p className="mt-2 text-3xl font-bold text-green-600">
                {formatCurrency(totalSummary.totalProfit)}
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <YearSelect />
              {/* Çeyrek Filtresi */}
              <div>
                <label htmlFor="quarter" className="block text-sm font-medium text-gray-700">
                  Çeyrek
                </label>
                <select
                  id="quarter"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  value={selectedQuarter || ''}
                  onChange={(e) => setSelectedQuarter(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Tüm Çeyrekler</option>
                  {[1, 2, 3, 4].map((quarter) => (
                    <option key={quarter} value={quarter}>
                      {quarter}. Çeyrek
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
                        {Array.from({ length: 7 }, (_, i) => getCurrentYear() + i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(formData.quarters).map(([quarter, data]) => {
                      const isQuarterClosed = closedQuarters[quarter]
                      
                      return (
                        <div key={quarter} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                              {quarter}. Çeyrek
                            </h3>
                            {isQuarterClosed && (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Kapandı
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Ciro Forecast ($)
                              </label>
                              <input
                                type="number"
                                value={data.revenue}
                                onChange={(e) => handleInputChange(parseInt(quarter), 'revenue', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                                min={0}
                                step="0.01"
                                disabled={isQuarterClosed}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700">
                                Karlılık Forecast ($)
                              </label>
                              <input
                                type="number"
                                value={data.profit}
                                onChange={(e) => handleInputChange(parseInt(quarter), 'profit', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                required
                                min={0}
                                step="0.01"
                                disabled={isQuarterClosed}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
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
        </>
      )}
    </div>
  )
} 