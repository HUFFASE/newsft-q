'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus } from 'lucide-react'

interface ActualsData {
  id: number
  year: number
  month: number
  revenue: number
  profit: number
  brand_id: number
  brand_name?: string
}

interface Brand {
  id: number
  name: string
}

interface SalesManager {
  id: string
  full_name: string
}

export default function ActualsPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedBrand, setSelectedBrand] = useState<number | null>(null)
  const [selectedManager, setSelectedManager] = useState<string | null>(null)
  const [brands, setBrands] = useState<Brand[]>([])
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [actualsData, setActualsData] = useState<ActualsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    brand_id: '',
    year: currentYear,
    month: 1,
    revenue: 0,
    profit: 0
  })

  // İlk yüklemede ve yıl değiştiğinde tüm verileri getir
  useEffect(() => {
    fetchUserRole()
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

      // Gerçekleşen verileri getir
      const { data: actualsResult, error: actualsError } = await supabase
        .from('actuals')
        .select('*, brands(name)')
        .eq('year', selectedYear)
        .order('month')

      if (actualsError) throw actualsError

      // Marka isimlerini ekle
      const actualsWithBrandNames = actualsResult?.map(actual => ({
        ...actual,
        brand_name: actual.brands?.name
      })) || []

      setActualsData(actualsWithBrandNames)

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
    let filtered = actualsData

    if (selectedBrand) {
      filtered = filtered.filter(f => f.brand_id === selectedBrand)
    } else if (selectedManager) {
      // Seçili müdüre ait marka ID'lerini al
      const managerBrandIds = brands.map(b => b.id)
      filtered = filtered.filter(f => managerBrandIds.includes(f.brand_id))
    }

    return filtered
  }

  const filteredData = getFilteredData()

  const fetchUserRole = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profileError) throw profileError
        
        setUserRole(profile?.role || null)
        console.log('Current userRole:', profile?.role)
      }
    } catch (err: any) {
      console.error('Error fetching user role:', err.message)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      const { data, error } = await supabase
        .from('actuals')
        .insert([
          {
            brand_id: formData.brand_id,
            year: formData.year,
            month: formData.month,
            revenue: formData.revenue,
            profit: formData.profit
          }
        ])

      if (error) throw error
      fetchAllData()
      setIsModalOpen(false)
    } catch (err: any) {
      console.error('Error adding actual:', err.message)
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
      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtreler</h3>
          {userRole === 'director' && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Gerçekleşen Ekle
            </button>
          )}
        </div>
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Gerçekleşen Ekle</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Marka</label>
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
                <label className="block text-sm font-medium text-gray-700">Yıl</label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  {Array.from({ length: 7 }, (_, i) => currentYear + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ay</label>
                <select
                  value={formData.month}
                  onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}. Ay
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Ciro</label>
                <input
                  type="number"
                  value={formData.revenue}
                  onChange={(e) => setFormData({ ...formData, revenue: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Karlılık</label>
                <input
                  type="number"
                  value={formData.profit}
                  onChange={(e) => setFormData({ ...formData, profit: Number(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Veri Tablosu */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ay
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Marka
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ciro
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Karlılık
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Karlılık Oranı
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((actual) => {
                const profitMargin = actual.revenue > 0 
                  ? (actual.profit / actual.revenue) * 100 
                  : 0

                return (
                  <tr key={actual.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {actual.month}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {actual.brand_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {actual.revenue.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {actual.profit.toLocaleString('tr-TR')} ₺
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{profitMargin.toFixed(2)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
} 