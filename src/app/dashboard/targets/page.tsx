'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Target {
  id: string
  brand_id: string
  year: number
  month: number
  revenue: number
  profit: number
  brands?: {
    name: string
  }
}

interface QuarterData {
  revenue: number
  profit: number
}

interface FormData {
  brand_id: string
  year: number
  quarters: {
    [key: number]: QuarterData
  }
}

interface Brand {
  id: string
  name: string
}

interface QuarterSummary {
  revenue: number
  profit: number
  profitMargin: number
}

interface QuarterlySummaries {
  [key: number]: QuarterSummary
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
    1: { revenue: 0, profit: 0 },
    2: { revenue: 0, profit: 0 },
    3: { revenue: 0, profit: 0 },
    4: { revenue: 0, profit: 0 }
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

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i)

  useEffect(() => {
    fetchUserRole()
    fetchTargets()
    fetchBrands()
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
          [selectedTarget.month]: {
            revenue: selectedTarget.revenue,
            profit: selectedTarget.profit
          }
        }
      })
    } else {
      setFormData(initialFormData)
    }
  }, [selectedTarget])

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
      const { data, error } = await supabase
        .from('targets')
        .select(`
          *,
          brands (
            name
          )
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('brand_id')

      if (error) {
        console.error('Error fetching targets:', error)
        throw error
      }

      console.log('Fetched targets:', data)
      setTargets(data)
    } catch (error: any) {
      console.error('Error in fetchTargets:', error.message)
    }
  }

  const fetchBrands = async () => {
    try {
      console.log('Fetching brands...')
      const { data, error } = await supabase
        .from('brands')
        .select('id, name')
        .order('name')

      if (error) {
        console.error('Error fetching brands:', error)
        throw error
      }

      console.log('Fetched brands:', data)
      setBrands(data)
    } catch (error: any) {
      console.error('Error in fetchBrands:', error.message)
    }
  }

  const handleAddTarget = () => {
    setSelectedTarget(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  const handleEditTarget = (target: Target) => {
    setSelectedTarget(target)
    setIsModalOpen(true)
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

      if (selectedTarget) {
        // Güncelleme - tek çeyrek
        const quarterData = {
          brand_id: formData.brand_id,
          year: formData.year,
          revenue: formData.quarters[selectedTarget.month].revenue,
          profit: formData.quarters[selectedTarget.month].profit
        }

        console.log('Updating target:', selectedTarget.id)
        const { data, error } = await supabase
          .from('targets')
          .update(quarterData)
          .eq('id', selectedTarget.id)
          .select()

        if (error) {
          console.error('Update error:', error)
          throw error
        }
        console.log('Update response:', data)
      } else {
        // Yeni hedefler ekleme - tüm çeyrekler
        const insertData = Object.entries(formData.quarters).map(([quarter, data]) => ({
          brand_id: formData.brand_id,
          year: formData.year,
          month: parseInt(quarter),
          revenue: data.revenue,
          profit: data.profit
        }))

        console.log('Inserting new targets:', insertData)
        const { data, error } = await supabase
          .from('targets')
          .insert(insertData)
          .select()

        if (error) {
          console.error('Insert error:', error)
          throw error
        }
        console.log('Insert response:', data)
      }

      await fetchTargets()
      setIsModalOpen(false)
      setFormData(initialFormData)
      setSelectedTarget(null)
    } catch (error: any) {
      console.error('Submit error:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(value)
  }

  const getFilteredTargets = () => {
    return targets.filter(target => {
      const yearMatch = selectedYear ? target.year === selectedYear : true
      const brandMatch = selectedBrandId ? target.brand_id === selectedBrandId : true
      return yearMatch && brandMatch
    })
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

  const calculateQuarterlySummary = (): QuarterlySummaries => {
    const filteredTargets = getFilteredTargets()
    const summary: QuarterlySummaries = {
      1: { revenue: 0, profit: 0, profitMargin: 0 },
      2: { revenue: 0, profit: 0, profitMargin: 0 },
      3: { revenue: 0, profit: 0, profitMargin: 0 },
      4: { revenue: 0, profit: 0, profitMargin: 0 }
    }

    filteredTargets.forEach(target => {
      const quarter = target.month as keyof QuarterlySummaries
      summary[quarter].revenue += target.revenue
      summary[quarter].profit += target.profit
      summary[quarter].profitMargin = summary[quarter].revenue > 0
        ? (summary[quarter].profit / summary[quarter].revenue) * 100
        : 0
    })

    return summary
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
                    {formatCurrency(calculateSummary().totalRevenue)}
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
                    {formatCurrency(calculateSummary().totalProfit)}
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
                    %{calculateSummary().profitMargin.toFixed(1)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Yıl Filtresi
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tüm Yıllar</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka Filtresi
            </label>
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
          </div>
        </div>
      </div>

      {/* Çeyrek Bazlı Detay Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quarters.map((quarter) => {
          const quarterData = calculateQuarterlySummary()[quarter.value]
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

              {selectedTarget ? (
                // Tek çeyrek düzenleme
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {quarters[selectedTarget.month - 1].label}
                    </label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Ciro Hedefi (TL)
                        </label>
                        <input
                          type="number"
                          value={formData.quarters[selectedTarget.month].revenue}
                          onChange={(e) => setFormData({
                            ...formData,
                            quarters: {
                              ...formData.quarters,
                              [selectedTarget.month]: {
                                ...formData.quarters[selectedTarget.month],
                                revenue: parseFloat(e.target.value)
                              }
                            }
                          })}
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
                          value={formData.quarters[selectedTarget.month].profit}
                          onChange={(e) => setFormData({
                            ...formData,
                            quarters: {
                              ...formData.quarters,
                              [selectedTarget.month]: {
                                ...formData.quarters[selectedTarget.month],
                                profit: parseFloat(e.target.value)
                              }
                            }
                          })}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          required
                          min={0}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Tüm çeyrekler için giriş
                <div className="space-y-6">
                  {quarters.map((quarter) => (
                    <div key={quarter.value} className="p-4 bg-gray-50 rounded-lg">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        {quarter.label}
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Ciro Hedefi (TL)
                          </label>
                          <input
                            type="number"
                            value={formData.quarters[quarter.value].revenue}
                            onChange={(e) => setFormData({
                              ...formData,
                              quarters: {
                                ...formData.quarters,
                                [quarter.value]: {
                                  ...formData.quarters[quarter.value],
                                  revenue: parseFloat(e.target.value)
                                }
                              }
                            })}
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
                            value={formData.quarters[quarter.value].profit}
                            onChange={(e) => setFormData({
                              ...formData,
                              quarters: {
                                ...formData.quarters,
                                [quarter.value]: {
                                  ...formData.quarters[quarter.value],
                                  profit: parseFloat(e.target.value)
                                }
                              }
                            })}
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
              )}

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false)
                    setFormData(initialFormData)
                    setSelectedTarget(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm disabled:opacity-50"
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