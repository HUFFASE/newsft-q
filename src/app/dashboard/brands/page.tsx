'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Brand {
  id: string
  name: string
  logo_url?: string
  sales_manager_id: string
  sales_manager?: {
    full_name: string
  }
}

interface BrandResponse {
  id: string
  name: string
  logo_url: string | null
  sales_manager_id: string
  profiles: {
    full_name: string
  } | null
}

interface FormData {
  name: string
  logo_url: string
  sales_manager_id: string
}

interface UpdateData {
  name?: string
  logo_url?: string | null
  sales_manager_id?: string | null
}

interface SalesManager {
  id: string
  full_name: string
}

const initialFormData: FormData = {
  name: '',
  logo_url: '',
  sales_manager_id: '',
}

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [salesManagers, setSalesManagers] = useState<SalesManager[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    fetchUserRole()
    fetchBrands()
    fetchSalesManagers()
  }, [])

  useEffect(() => {
    if (selectedBrand) {
      setFormData({
        name: selectedBrand.name,
        logo_url: selectedBrand.logo_url || '',
        sales_manager_id: selectedBrand.sales_manager_id || '',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [selectedBrand])

  const fetchUserRole = async () => {
    try {
      console.log('Fetching user role...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth error:', userError)
        return
      }

      console.log('Current user:', {
        id: user?.id,
        email: user?.email,
        metadata: user?.user_metadata,
        appMetadata: user?.app_metadata
      })
      
      if (!user) {
        console.log('No user found')
        return
      }

      // Önce profiles tablosundan kontrol et
      console.log('Checking profiles table...')
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')  // Tüm alanları seçelim
        .eq('id', user.id)
        .limit(1)

      if (profileError) {
        console.error('Profile error:', profileError)
        return
      }

      console.log('Full profile data:', profileData)

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
      console.log('Current userRole state:', userRole)
    } catch (error: any) {
      console.error('Error fetching user role:', error)
    }
  }

  const fetchBrands = async () => {
    try {
      const { data, error } = await supabase
        .from('brands')
        .select(`
          id,
          name,
          logo_url,
          sales_manager_id,
          profiles (
            full_name
          )
        `)
        .order('name')
        .returns<BrandResponse[]>()

      if (error) throw error

      // Veriyi UI için dönüştür
      const transformedData: Brand[] = data.map(brand => ({
        id: brand.id,
        name: brand.name,
        logo_url: brand.logo_url || undefined,
        sales_manager_id: brand.sales_manager_id,
        sales_manager: brand.profiles ? {
          full_name: brand.profiles.full_name
        } : undefined
      }))

      setBrands(transformedData)
    } catch (error: any) {
      console.error('Error fetching brands:', error.message)
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

      setSalesManagers(data)
    } catch (error: any) {
      console.error('Error fetching sales managers:', error.message)
    }
  }

  const handleAddBrand = () => {
    setSelectedBrand(null)
    setFormData(initialFormData)
    setIsModalOpen(true)
  }

  const handleEditBrand = (brand: Brand) => {
    console.log('Editing brand:', brand)
    setSelectedBrand(brand)
    setFormData({
      name: brand.name,
      logo_url: brand.logo_url || '',
      sales_manager_id: brand.sales_manager_id
    })
    setIsModalOpen(true)
  }

  const handleDeleteBrand = async (brandId: string) => {
    if (window.confirm('Bu markayı silmek istediğinizden emin misiniz?')) {
      try {
        const { error } = await supabase
          .from('brands')
          .delete()
          .eq('id', brandId)

        if (error) throw error

        setBrands(brands.filter(brand => brand.id !== brandId))
      } catch (error: any) {
        console.error('Error deleting brand:', error.message)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (selectedBrand) {
        console.log('Updating brand with ID:', selectedBrand.id)
        console.log('Current form data:', formData)

        // Sadece değişen alanları güncelle
        const updates: UpdateData = {}
        
        if (formData.name !== selectedBrand.name) {
          updates.name = formData.name.trim()
        }
        
        if (formData.logo_url !== selectedBrand.logo_url) {
          updates.logo_url = formData.logo_url.trim() || null
        }
        
        if (formData.sales_manager_id !== selectedBrand.sales_manager_id) {
          updates.sales_manager_id = formData.sales_manager_id || null
        }

        console.log('Updates to be applied:', updates)

        if (Object.keys(updates).length > 0) {
          const { data, error } = await supabase
            .from('brands')
            .update(updates)
            .eq('id', selectedBrand.id)
            .select()
            .single()

          if (error) {
            console.error('Update error:', error)
            throw new Error(`Güncelleme hatası: ${error.message}`)
          }

          console.log('Update successful:', data)
          await fetchBrands()
        } else {
          console.log('No changes detected')
        }

        setIsModalOpen(false)
        setFormData(initialFormData)
        setSelectedBrand(null)
      } else {
        // Yeni marka ekleme
        const { error } = await supabase
          .from('brands')
          .insert([{
            name: formData.name.trim(),
            logo_url: formData.logo_url.trim() || null,
            sales_manager_id: formData.sales_manager_id || null
          }])

        if (error) {
          throw new Error(`Ekleme hatası: ${error.message}`)
        }

        await fetchBrands()
        setIsModalOpen(false)
        setFormData(initialFormData)
      }
    } catch (error: any) {
      console.error('Submit error:', error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Markalar</h1>
        {userRole === 'director' && (
          <button
            onClick={handleAddBrand}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Marka Ekle
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {brands.map((brand) => (
          <div key={brand.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                {brand.logo_url ? (
                  <img
                    src={brand.logo_url}
                    alt={brand.name}
                    className="h-12 w-12 object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center">
                    <span className="text-xl font-medium text-gray-600">
                      {brand.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-gray-900">{brand.name}</h3>
                <p className="text-sm text-gray-500">
                  {brand.sales_manager?.full_name || 'Satış müdürü atanmamış'}
                </p>
              </div>
              {userRole === 'director' && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditBrand(brand)}
                    className="p-2 text-gray-400 hover:text-gray-500"
                  >
                    <Edit2 className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBrand(brand.id)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Marka Ekleme/Düzenleme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">
              {selectedBrand ? 'Marka Düzenle' : 'Yeni Marka Ekle'}
            </h2>
            {error && (
              <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Marka Adı
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Logo URL
                </label>
                <input
                  type="text"
                  name="logo_url"
                  value={formData.logo_url}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Satış Müdürü
                </label>
                <select
                  name="sales_manager_id"
                  value={formData.sales_manager_id}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Satış müdürü seçin</option>
                  {salesManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? 'İşleniyor...' : selectedBrand ? 'Güncelle' : 'Ekle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 