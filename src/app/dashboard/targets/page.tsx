'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface SupabaseTarget {
  id: string
  brand_id: string
  year: number
  month: number
  revenue: number
  profit: number
  brands: {
    id: string
    name: string
  } | null
}

interface Target {
  id: string
  brand_id: string
  year: number
  month: number
  quarter?: number
  revenue: number
  profit: number
  brands?: {
    name: string
  }
  brand_name?: string
}

interface QuarterData {
  revenue: number
  profit: number
}

interface FormData {
  brand_id: string
  year: number
  quarters: {
    [key: string]: QuarterData
  }
}

interface Brand {
  id: string
  name: string
  sales_manager_id?: string
}

interface QuarterlySummary {
  revenue: number
  profit: number
  profitMargin: number
}

interface QuarterlySummaries {
  [key: number]: QuarterlySummary
}

interface SalesManager {
  id: string
  full_name: string
}

const quarters = [
  { value: 1, label: '1. Çeyrek (Ocak-Mart)' },
  { value: 2, label: '2. Çeyrek (Nisan-Haziran)' },
  { value: 3, label: '3. Çeyrek (Temmuz-Eylül)' },
  { value: 4, label: '4. Çeyrek (Ekim-Aralık)' }
]

const initialFormData: FormData = {
  brand_id: '',
  year: new Date().getFullYear(),
  quarters: {
    '1': { revenue: 0, profit: 0 },
    '2': { revenue: 0, profit: 0 },
    '3': { revenue: 0, profit: 0 },
    '4': { revenue: 0, profit: 0 }
  }
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<Target[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [closedQuarters, setClosedQuarters] = useState<{[key: string]: boolean}>({})
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [selectedManager, setSelectedManager] = useState<string>('')

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i)

  useEffect(() => {
    fetchUserRole()
    fetchTargets()
    fetchSalesManagers()
  }, [])

  // Debug için userRole değişikliklerini izle
  useEffect(() => {
    console.log('Current userRole state:', userRole)
  }, [userRole])

  // Yeni useEffect - userRole değiştiğinde yeniden render
  useEffect(() => {
    if (userRole === 'director') {
      console.log('Director role confirmed, button should be visible')
    }
  }, [userRole])

  useEffect(() => {
    if (selectedTarget) {
      setFormData({
        brand_id: selectedTarget.brand_id,
        year: selectedTarget.year,
        quarters: {
          [Math.ceil(selectedTarget.month / 3).toString()]: {
            revenue: selectedTarget.revenue,
            profit: selectedTarget.profit
          }
        }
      })
    } else {
      setFormData(initialFormData)
    }
  }, [selectedTarget])

  useEffect(() => {
    fetchClosedQuarters()
  }, [selectedYear])

  useEffect(() => {
    fetchBrands()
  }, [selectedManager])

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
        .select('role, full_name')
        .eq('id', user.id)
        .limit(1)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError)
        return
      }

      console.log('Profile data:', profileData)

      if (profileData?.role) {
        console.log('Setting role from profile:', profileData.role)
        setUserRole(profileData.role)
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

  const fetchTargets = async () => {
    try {
      console.log('Fetching targets...')
      
      // Hedefleri ay bazında çek
      const { data: rawData, error } = await supabase
        .from('targets')
        .select(`
          *,
          brands (
            name
          )
        `)
        .eq('year', selectedYear)
        .order('month', { ascending: true })

      if (error) {
        console.error('Error fetching targets:', error)
        throw error
      }

      console.log('Raw targets data:', rawData)
      
      // Veriyi dönüştür ve çeyreklere ayır
      const transformedData: Target[] = (rawData || []).map(row => {
        // Güvenli tip dönüşümleri
        const month = Number(row.month || 0)
        const quarter = Math.ceil(month / 3)
        const brandName = row.brands?.name || ''
        
        return {
          id: String(row.id || ''),
          brand_id: String(row.brand_id || ''),
          year: Number(row.year || 0),
          month: month,
          quarter: quarter,
          revenue: Number(row.revenue || 0),
          profit: Number(row.profit || 0),
          brands: { name: brandName },
          brand_name: brandName
        }
      })

      console.log('Transformed targets data:', transformedData)
      setTargets(transformedData)
    } catch (error: any) {
      const errorMessage = error.message || 'Hedefler alınırken bir hata oluştu'
      console.error('Error in fetchTargets:', errorMessage)
      setError(errorMessage)
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
      setSalesManagers(data || [])
    } catch (err) {
      console.error('Error fetching sales managers:', err)
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
      
      // Eğer seçili marka, yeni marka listesinde yoksa sıfırla
      if (selectedBrandId && data && !data.find(b => b.id === selectedBrandId)) {
        setSelectedBrandId('')
      }
    } catch (err) {
      console.error('Error fetching brands:', err)
    }
  }

  const handleAddTarget = () => {
    setSelectedTarget(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  const handleEditTarget = (brandId: string) => {
    // Seçili markanın tüm hedeflerini bul
    const brandTargets = targets.filter(t => t.brand_id === brandId)
    
    if (brandTargets.length > 0) {
      // Form verilerini hazırla
      const quarters: { [key: string]: QuarterData } = {
        '1': { revenue: 0, profit: 0 },
        '2': { revenue: 0, profit: 0 },
        '3': { revenue: 0, profit: 0 },
        '4': { revenue: 0, profit: 0 }
      }

      // Her hedefin verilerini ilgili çeyreğe ekle
      brandTargets.forEach(target => {
        const quarter = Math.ceil(target.month / 3).toString()
        quarters[quarter] = {
          revenue: target.revenue,
          profit: target.profit
        }
      })

      // Form verilerini güncelle
      setFormData({
        brand_id: brandId,
        year: brandTargets[0].year,
        quarters: quarters
      })

      setSelectedTarget(null) // Tek hedef yerine tüm çeyrekleri düzenleme modu
      setIsModalOpen(true)
    }
  }

  const handleDeleteTarget = async (targetId: string) => {
    if (window.confirm('Bu hedefi silmek istediğinizden emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('targets')
          .delete()
          .eq('id', targetId)

        if (error) throw error

        setTargets(targets.filter(target => target.id !== targetId))
      } catch (error: any) {
        console.error('Error deleting target:', error.message)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      console.log('Submitting form data:', formData)

      // Her çeyrek için güncelleme yap
      for (const [quarter, data] of Object.entries(formData.quarters)) {
        const quarterNumber = parseInt(quarter)
        const monthsInQuarter = [
          (quarterNumber - 1) * 3 + 1,
          (quarterNumber - 1) * 3 + 2,
          (quarterNumber - 1) * 3 + 3
        ]

        // Her ay için hedef güncelle
        for (const month of monthsInQuarter) {
          const monthlyData = {
            brand_id: formData.brand_id,
            year: formData.year,
            month: month,
            revenue: data.revenue / 3, // Aylık hedef (çeyrek hedefinin üçte biri)
            profit: data.profit / 3
          }

          console.log(`Upserting target for month ${month}:`, monthlyData)
          
          // Önce mevcut hedefi kontrol et
          const { data: existingData, error: checkError } = await supabase
            .from('targets')
            .select('id')
            .eq('brand_id', formData.brand_id)
            .eq('year', formData.year)
            .eq('month', month)
            .single()

          if (checkError && checkError.code !== 'PGRST116') { // PGRST116: Kayıt bulunamadı hatası
            console.error('Check error:', checkError)
            throw checkError
          }

          if (existingData?.id) {
            // Güncelleme
            console.log(`Updating target for month ${month}:`, monthlyData)
            const { error: updateError } = await supabase
              .from('targets')
              .update(monthlyData)
              .eq('id', existingData.id)

            if (updateError) {
              console.error('Update error:', updateError)
              throw updateError
            }
          } else {
            // Yeni kayıt
            console.log(`Inserting new target for month ${month}:`, monthlyData)
            const { error: insertError } = await supabase
              .from('targets')
              .insert([monthlyData])

            if (insertError) {
              console.error('Insert error:', insertError)
              throw insertError
            }
          }
        }
      }

      await fetchTargets()
      setIsModalOpen(false)
      setFormData(initialFormData)
      setSelectedTarget(null)
    } catch (error: any) {
      console.error('Submit error:', error)
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        stack: error.stack
      })
      setError(error.message || 'Hedef kaydedilirken bir hata oluştu')
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const getFilteredTargets = () => {
    console.log('Filtering targets with:', {
      selectedYear,
      selectedBrandId,
      selectedManager,
      totalTargets: targets.length
    })

    const filtered = targets.filter(target => {
      const yearMatch = target.year === selectedYear
      const brandMatch = selectedBrandId ? target.brand_id === selectedBrandId : true
      
      // Satış müdürü filtresi
      const managerMatch = selectedManager 
        ? brands.some(brand => 
            brand.id === target.brand_id && 
            brand.sales_manager_id === selectedManager
          )
        : true

      const matches = yearMatch && brandMatch && managerMatch
      console.log(`Target ${target.id} matches:`, { yearMatch, brandMatch, managerMatch, matches })
      
      return matches
    })

    console.log('Filtered targets result:', filtered)
    return filtered
  }

  const calculateSummary = () => {
    const filteredTargets = getFilteredTargets()
    const summary = filteredTargets.reduce((acc, target) => {
      acc.totalRevenue += target.revenue
      acc.totalProfit += target.profit
      return acc
    }, { totalRevenue: 0, totalProfit: 0 })

    return {
      ...summary,
      profitMargin: summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0
    }
  }

  const calculateQuarterlySummaries = (filteredTargets: Target[]): QuarterlySummaries => {
    console.log('Calculating quarterly summaries for filtered targets:', filteredTargets)
    
    // Tüm çeyrekler için başlangıç değerlerini tanımla
    const summary: QuarterlySummaries = {
      1: { revenue: 0, profit: 0, profitMargin: 0 },
      2: { revenue: 0, profit: 0, profitMargin: 0 },
      3: { revenue: 0, profit: 0, profitMargin: 0 },
      4: { revenue: 0, profit: 0, profitMargin: 0 }
    }

    // Her hedef için özeti güncelle
    filteredTargets.forEach(target => {
      const month = target.month || 1
      const quarter = Math.ceil(month / 3)
      console.log(`Processing target for month ${month} (quarter ${quarter}):`, target)
      
      if (quarter >= 1 && quarter <= 4) {
        const revenue = Number(target.revenue) || 0
        const profit = Number(target.profit) || 0
        
        summary[quarter].revenue += revenue
        summary[quarter].profit += profit
        
        // Karlılık oranını hesapla
        summary[quarter].profitMargin = summary[quarter].revenue > 0
          ? (summary[quarter].profit / summary[quarter].revenue) * 100
          : 0

        console.log(`Updated summary for quarter ${quarter}:`, summary[quarter])
      }
    })

    console.log('Final quarterly summaries:', summary)
    return summary
  }

  const handleQuarterChange = (quarter: string, field: 'revenue' | 'profit', value: string) => {
    setFormData({
      ...formData,
      quarters: {
        ...formData.quarters,
        [quarter]: {
          ...formData.quarters[quarter],
          [field]: parseFloat(value)
        }
      }
    })
  }

  // Tüm hedeflerin toplamını hesapla
  const calculateTotalSummary = () => {
    console.log('Calculating total summary for all targets:', targets)
    
    const summary = targets.reduce((acc, target) => {
      const revenue = Number(target.revenue) || 0
      const profit = Number(target.profit) || 0
      
      acc.totalRevenue += revenue
      acc.totalProfit += profit
      return acc
    }, { totalRevenue: 0, totalProfit: 0 })

    const result = {
      ...summary,
      profitMargin: summary.totalRevenue > 0 
        ? (summary.totalProfit / summary.totalRevenue) * 100 
        : 0
    }

    console.log('Total summary result:', result)
    return result
  }

  const handleDeleteBrandTargets = async (brandId: string) => {
    if (window.confirm('Bu markanın tüm hedeflerini silmek istediğinizden emin misiniz?')) {
      try {
        setIsLoading(true)
        setError(null)

        console.log('Deleting targets for brand:', brandId, 'year:', selectedYear)

        // Seçili markanın hedeflerini sil
        const { data, error } = await supabase
          .from('targets')
          .delete()
          .eq('brand_id', brandId)
          .eq('year', selectedYear)
          .select()

        if (error) {
          console.error('Delete error:', error)
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          })
          throw error
        }

        console.log('Deleted targets:', data)

        // Hedefleri yeniden yükle
        await fetchTargets()
        setSelectedBrandId('')
        
        // Başarı mesajı göster
        alert('Hedefler başarıyla silindi')
      } catch (error: any) {
        console.error('Error deleting targets:', error)
        setError(error.message || 'Hedefler silinirken bir hata oluştu')
        // Hata mesajı göster
        alert('Hedefler silinirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'))
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Hedefler</h1>
        {userRole === 'director' && (
          <button
            onClick={handleAddTarget}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Hedef Ekle
          </button>
        )}
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Ciro Hedefi
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatCurrency(calculateTotalSummary().totalRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Toplam Karlılık Hedefi
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {formatCurrency(calculateTotalSummary().totalProfit)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Ortalama Karlılık Oranı
                  </dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    %{calculateTotalSummary().profitMargin.toFixed(1)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler ve Edit Butonu */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yıl
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satış Müdürü
            </label>
            <select
              value={selectedManager}
              onChange={(e) => {
                setSelectedManager(e.target.value)
                setSelectedBrandId('') // Satış müdürü değiştiğinde seçili markayı sıfırla
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tüm Satış Müdürleri</option>
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka
            </label>
            <div className="flex gap-2">
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Tüm Markalar</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              {userRole === 'director' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => selectedBrandId && handleEditTarget(selectedBrandId)}
                    disabled={!selectedBrandId}
                    className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                      ${!selectedBrandId 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                      }`}
                    title={!selectedBrandId ? 'Lütfen önce bir marka seçin' : 'Seçili markanın hedeflerini düzenle'}
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => selectedBrandId && handleDeleteBrandTargets(selectedBrandId)}
                    disabled={!selectedBrandId}
                    className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
                      ${!selectedBrandId 
                        ? 'bg-gray-300 cursor-not-allowed' 
                        : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                      }`}
                    title={!selectedBrandId ? 'Lütfen önce bir marka seçin' : 'Seçili markanın tüm hedeflerini sil'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Çeyrek Bazlı Detay Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quarters.map((quarter) => {
          const quarterData = calculateQuarterlySummaries(getFilteredTargets())[quarter.value]
          return (
            <div key={quarter.value} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {quarter.label}
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Ciro Hedefi</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(quarterData.revenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Karlılık Hedefi</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(quarterData.profit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Karlılık Oranı</span>
                    <span className="text-sm font-semibold text-gray-900">
                      %{quarterData.profitMargin.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${Math.min(quarterData.profitMargin, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full">
            <h2 className="text-xl font-semibold mb-4">
              {selectedTarget ? 'Hedef Düzenle' : 'Yeni Hedef Ekle'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Marka
                  </label>
                  <select
                    value={formData.brand_id}
                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value })}
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
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                    min={2024}
                    max={2030}
                  />
                </div>
              </div>

              {/* Tüm çeyrekler için giriş */}
              <div className="space-y-6">
                {Object.entries(formData.quarters).map(([quarter, data]) => (
                  <div key={quarter} className="border-t pt-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      {quarter}. Çeyrek
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Ciro Hedefi (TL)
                        </label>
                        <input
                          type="number"
                          value={data.revenue}
                          onChange={(e) => handleQuarterChange(quarter, 'revenue', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                          min={0}
                          step="0.01"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Karlılık Hedefi (TL)
                        </label>
                        <input
                          type="number"
                          value={data.profit}
                          onChange={(e) => handleQuarterChange(quarter, 'profit', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                          min={0}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setSelectedTarget(null)
                    setFormData(initialFormData)
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 