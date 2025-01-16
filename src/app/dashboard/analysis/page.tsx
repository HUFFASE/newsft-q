'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'

// Chart.js bileşenlerini kaydet
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

interface Forecast {
  id: string
  brand_id: string
  year: number
  quarter: number
  revenue: number
  profit: number
}

interface AnalysisData {
  targets: any[]
  actuals: any[]
  brands: any[]
  salesManagers: any[]
  forecasts: Forecast[]
}

interface SummaryData {
  targetTotal: number
  actualTotal: number
  achievementRate: number
  targetProfit: number
  actualProfit: number
  profitRate: number
  bestPerformingBrand: {
    name: string
    rate: number
  }
  worstPerformingBrand: {
    name: string
    rate: number
  }
}

interface QuarterlyData {
  quarter: number
  forecastTotal: number
  targetTotal: number
  actualTotal: number
  accuracy: number
}

interface ForecastAnalysis {
  quarterlyData: QuarterlyData[]
  averageAccuracy: number
  trendData: {
    labels: string[]
    datasets: {
      label: string
      data: number[]
      borderColor: string
      backgroundColor: string
    }[]
  }
}

export default function AnalysisPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedQuarter, setSelectedQuarter] = useState<number>(0)
  const [selectedManager, setSelectedManager] = useState<string>('')
  const [data, setData] = useState<AnalysisData>({
    targets: [],
    actuals: [],
    brands: [],
    salesManagers: [],
    forecasts: []
  })
  const [isLoading, setIsLoading] = useState(true)

  const years = Array.from({ length: 7 }, (_, i) => 2024 + i)
  const quarters = [
    { value: 1, label: '1. Çeyrek' },
    { value: 2, label: '2. Çeyrek' },
    { value: 3, label: '3. Çeyrek' },
    { value: 4, label: '4. Çeyrek' }
  ]

  useEffect(() => {
    fetchData()
  }, [selectedYear, selectedBrand, selectedQuarter, selectedManager])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Hedefleri çek
      const { data: targets, error: targetsError } = await supabase
        .from('targets')
        .select('*')
        .eq('year', selectedYear)

      if (targetsError) throw targetsError

      // Gerçekleşenleri çek
      const { data: actuals, error: actualsError } = await supabase
        .from('actuals')
        .select('*')
        .eq('year', selectedYear)

      if (actualsError) throw actualsError

      // Markaları çek
      const { data: brands, error: brandsError } = await supabase
        .from('brands')
        .select('*')

      if (brandsError) throw brandsError

      // Satış müdürlerini çek
      const { data: salesManagers, error: managersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'sales_manager')

      if (managersError) throw managersError

      // Forecast verilerini çek
      const { data: forecasts, error: forecastsError } = await supabase
        .from('forecasts')
        .select('*')
        .eq('year', selectedYear)

      if (forecastsError) throw forecastsError

      setData({
        targets: targets || [],
        actuals: actuals || [],
        brands: brands || [],
        salesManagers: salesManagers || [],
        forecasts: forecasts || []
      })
    } catch (error) {
      console.error('Veri çekilirken hata:', error)
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

  const calculateSummaryData = (): SummaryData => {
    // Filtrelenmiş verileri al
    let filteredTargets = data.targets
    let filteredActuals = data.actuals
    let filteredBrands = data.brands

    // Marka filtresi
    if (selectedBrand) {
      filteredTargets = filteredTargets.filter(t => t.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
      filteredBrands = filteredBrands.filter(b => b.id === selectedBrand)
    }
    // Satış müdürü filtresi
    else if (selectedManager) {
      const managerBrandIds = data.brands
        .filter(b => b.sales_manager_id === selectedManager)
        .map(b => b.id)
      
      filteredTargets = filteredTargets.filter(t => managerBrandIds.includes(t.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
      filteredBrands = filteredBrands.filter(b => managerBrandIds.includes(b.id))
    }

    // Çeyrek filtresi
    if (selectedQuarter) {
      filteredTargets = filteredTargets.filter(t => t.quarter === selectedQuarter)
      filteredActuals = filteredActuals.filter(a => a.quarter === selectedQuarter)
    }

    // Hedef ve gerçekleşen toplamları
    const targetTotal = filteredTargets.reduce((sum, target) => sum + (target.revenue || 0), 0)
    const actualTotal = filteredActuals.reduce((sum, actual) => sum + (actual.revenue || 0), 0)
    const achievementRate = targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0

    // Karlılık hesaplamaları
    const targetProfit = filteredTargets.reduce((sum, target) => sum + (target.profit || 0), 0)
    const actualProfit = filteredActuals.reduce((sum, actual) => sum + (actual.profit || 0), 0)
    const profitRate = actualTotal > 0 ? (actualProfit / actualTotal) * 100 : 0

    // Marka bazlı performans hesaplamaları
    const brandPerformance = filteredBrands.map(brand => {
      const brandTargets = filteredTargets.filter(t => t.brand_id === brand.id)
      const brandActuals = filteredActuals.filter(a => a.brand_id === brand.id)
      
      const targetSum = brandTargets.reduce((sum, t) => sum + (t.revenue || 0), 0)
      const actualSum = brandActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      
      return {
        name: brand.name,
        rate: targetSum > 0 ? (actualSum / targetSum) * 100 : 0
      }
    })

    // En iyi ve en kötü performans gösteren markalar
    const sortedBrands = [...brandPerformance].sort((a, b) => b.rate - a.rate)
    const bestPerformingBrand = sortedBrands[0] || { name: '-', rate: 0 }
    const worstPerformingBrand = sortedBrands[sortedBrands.length - 1] || { name: '-', rate: 0 }

    return {
      targetTotal,
      actualTotal,
      achievementRate,
      targetProfit,
      actualProfit,
      profitRate,
      bestPerformingBrand,
      worstPerformingBrand
    }
  }

  const summaryData = calculateSummaryData()

  const calculateTrendData = () => {
    // Filtrelenmiş verileri al
    let filteredTargets = data.targets
    let filteredActuals = data.actuals

    // Marka filtresi
    if (selectedBrand) {
      filteredTargets = filteredTargets.filter(t => t.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
    }
    // Satış müdürü filtresi
    else if (selectedManager) {
      const managerBrandIds = data.brands
        .filter(b => b.sales_manager_id === selectedManager)
        .map(b => b.id)
      
      filteredTargets = filteredTargets.filter(t => managerBrandIds.includes(t.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
    }

    // Çeyreklik toplamları hesapla
    const quarterlyData = [1, 2, 3, 4].map(quarter => {
      const quarterTargets = filteredTargets.filter(t => t.quarter === quarter)
      const quarterActuals = filteredActuals.filter(a => a.quarter === quarter)

      return {
        quarter,
        targetTotal: quarterTargets.reduce((sum, t) => sum + (t.revenue || 0), 0),
        actualTotal: quarterActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      }
    })

    return {
      labels: quarterlyData.map(d => `${d.quarter}. Çeyrek`),
      datasets: [
        {
          label: 'Hedef',
          data: quarterlyData.map(d => d.targetTotal),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
        {
          label: 'Gerçekleşen',
          data: quarterlyData.map(d => d.actualTotal),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        }
      ]
    }
  }

  const trendOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Çeyreklik Trend Analizi'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y)
            }
            return label
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  const calculateComparisonData = () => {
    // Filtrelenmiş verileri al
    let filteredTargets = data.targets
    let filteredActuals = data.actuals
    let filteredBrands = data.brands

    // Marka filtresi
    if (selectedBrand) {
      filteredTargets = filteredTargets.filter(t => t.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
      filteredBrands = filteredBrands.filter(b => b.id === selectedBrand)
    }
    // Satış müdürü filtresi
    else if (selectedManager) {
      const managerBrandIds = data.brands
        .filter(b => b.sales_manager_id === selectedManager)
        .map(b => b.id)
      
      filteredTargets = filteredTargets.filter(t => managerBrandIds.includes(t.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
      filteredBrands = filteredBrands.filter(b => managerBrandIds.includes(b.id))
    }

    // Çeyrek filtresi
    if (selectedQuarter) {
      filteredTargets = filteredTargets.filter(t => t.quarter === selectedQuarter)
      filteredActuals = filteredActuals.filter(a => a.quarter === selectedQuarter)
    }

    // Marka bazlı toplamları hesapla
    const brandTotals = filteredBrands.map(brand => {
      const brandTargets = filteredTargets.filter(t => t.brand_id === brand.id)
      const brandActuals = filteredActuals.filter(a => a.brand_id === brand.id)

      return {
        name: brand.name,
        targetTotal: brandTargets.reduce((sum, t) => sum + (t.revenue || 0), 0),
        actualTotal: brandActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      }
    })

    // En yüksek toplam değere sahip 5 markayı seç
    const top5Brands = [...brandTotals]
      .sort((a, b) => (b.targetTotal + b.actualTotal) - (a.targetTotal + a.actualTotal))
      .slice(0, 5)

    return {
      labels: top5Brands.map(b => b.name),
      datasets: [
        {
          label: 'Hedef',
          data: top5Brands.map(b => b.targetTotal),
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
        {
          label: 'Gerçekleşen',
          data: top5Brands.map(b => b.actualTotal),
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        }
      ]
    }
  }

  const comparisonOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Marka Bazlı Karşılaştırma (İlk 5)'
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || ''
            if (label) {
              label += ': '
            }
            if (context.parsed.y !== null) {
              label += formatCurrency(context.parsed.y)
            }
            return label
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            return formatCurrency(value)
          }
        }
      }
    }
  }

  const calculateDetailedData = () => {
    // Filtrelenmiş verileri al
    let filteredTargets = data.targets
    let filteredActuals = data.actuals
    let filteredBrands = data.brands

    // Marka filtresi
    if (selectedBrand) {
      filteredTargets = filteredTargets.filter(t => t.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
      filteredBrands = filteredBrands.filter(b => b.id === selectedBrand)
    }
    // Satış müdürü filtresi
    else if (selectedManager) {
      const managerBrandIds = data.brands
        .filter(b => b.sales_manager_id === selectedManager)
        .map(b => b.id)
      
      filteredTargets = filteredTargets.filter(t => managerBrandIds.includes(t.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
      filteredBrands = filteredBrands.filter(b => managerBrandIds.includes(b.id))
    }

    // Çeyrek filtresi
    if (selectedQuarter) {
      filteredTargets = filteredTargets.filter(t => t.quarter === selectedQuarter)
      filteredActuals = filteredActuals.filter(a => a.quarter === selectedQuarter)
    }

    // Her marka için detaylı hesaplamalar
    return filteredBrands.map(brand => {
      const brandTargets = filteredTargets.filter(t => t.brand_id === brand.id)
      const brandActuals = filteredActuals.filter(a => a.brand_id === brand.id)

      const targetRevenue = brandTargets.reduce((sum, t) => sum + (t.revenue || 0), 0)
      const actualRevenue = brandActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      const revenueAchievement = targetRevenue > 0 ? (actualRevenue / targetRevenue) * 100 : 0

      const targetProfit = brandTargets.reduce((sum, t) => sum + (t.profit || 0), 0)
      const actualProfit = brandActuals.reduce((sum, a) => sum + (a.profit || 0), 0)
      const profitAchievement = targetProfit > 0 ? (actualProfit / targetProfit) * 100 : 0

      const profitMargin = actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : 0

      return {
        name: brand.name,
        targetRevenue,
        actualRevenue,
        revenueAchievement,
        targetProfit,
        actualProfit,
        profitAchievement,
        profitMargin
      }
    }).sort((a, b) => b.revenueAchievement - a.revenueAchievement)
  }

  const calculateForecastAnalysis = () => {
    // Filtrelenmiş verileri al
    let filteredTargets = data.targets
    let filteredActuals = data.actuals
    let filteredForecasts = data.forecasts
    let filteredBrands = data.brands

    // Marka filtresi
    if (selectedBrand) {
      filteredTargets = filteredTargets.filter(t => t.brand_id === selectedBrand)
      filteredActuals = filteredActuals.filter(a => a.brand_id === selectedBrand)
      filteredForecasts = filteredForecasts.filter(f => f.brand_id === selectedBrand)
      filteredBrands = filteredBrands.filter(b => b.id === selectedBrand)
    }
    // Satış müdürü filtresi
    else if (selectedManager) {
      const managerBrandIds = data.brands
        .filter(b => b.sales_manager_id === selectedManager)
        .map(b => b.id)
      
      filteredTargets = filteredTargets.filter(t => managerBrandIds.includes(t.brand_id))
      filteredActuals = filteredActuals.filter(a => managerBrandIds.includes(a.brand_id))
      filteredForecasts = filteredForecasts.filter(f => managerBrandIds.includes(f.brand_id))
      filteredBrands = filteredBrands.filter(b => managerBrandIds.includes(b.id))
    }

    // Çeyrek filtresi
    if (selectedQuarter) {
      filteredTargets = filteredTargets.filter(t => t.quarter === selectedQuarter)
      filteredActuals = filteredActuals.filter(a => a.quarter === selectedQuarter)
      filteredForecasts = filteredForecasts.filter(f => f.quarter === selectedQuarter)
    }

    // Çeyreklik toplamları hesapla
    const quarterlyData = [1, 2, 3, 4].map(quarter => {
      const quarterForecasts = filteredForecasts.filter(f => f.quarter === quarter)
      const quarterTargets = filteredTargets.filter(t => t.quarter === quarter)
      const quarterActuals = filteredActuals.filter(a => a.quarter === quarter)

      const forecastTotal = quarterForecasts.reduce((sum, f) => sum + (f.revenue || 0), 0)
      const targetTotal = quarterTargets.reduce((sum, t) => sum + (t.revenue || 0), 0)
      const actualTotal = quarterActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)

      // Forecast doğruluğu hesapla
      let accuracy = 0
      if (actualTotal > 0) {
        const forecastDeviation = Math.abs(forecastTotal - actualTotal)
        accuracy = 100 - ((forecastDeviation / actualTotal) * 100)
      }

      return {
        quarter,
        forecastTotal,
        targetTotal,
        actualTotal,
        accuracy
      }
    })

    // Ortalama doğruluk oranı
      const completedQuarters = quarterlyData.filter(q => q.actualTotal > 0)
      const averageAccuracy = completedQuarters.length > 0
        ? completedQuarters.reduce((sum, q) => sum + q.accuracy, 0) / completedQuarters.length
        : 0

      return {
        quarterlyData,
        averageAccuracy,
        trendData: {
          labels: quarterlyData.map(d => `${d.quarter}. Çeyrek`),
          datasets: [
            {
              label: 'Forecast',
              data: quarterlyData.map(d => d.forecastTotal),
              borderColor: 'rgb(234, 179, 8)',
              backgroundColor: 'rgba(234, 179, 8, 0.5)',
            },
            {
              label: 'Hedef',
              data: quarterlyData.map(d => d.targetTotal),
              borderColor: 'rgb(53, 162, 235)',
              backgroundColor: 'rgba(53, 162, 235, 0.5)',
            },
            {
              label: 'Gerçekleşen',
              data: quarterlyData.map(d => d.actualTotal),
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.5)',
            }
          ]
        }
      }
    }

  const calculateManagerPerformance = () => {
    return data.salesManagers.map(manager => {
      const managerBrands = data.brands.filter(b => b.sales_manager_id === manager.id)
      const brandIds = managerBrands.map(b => b.id)
      
      const targets = data.targets.filter(t => brandIds.includes(t.brand_id))
      const actuals = data.actuals.filter(a => brandIds.includes(a.brand_id))
      
      const targetTotal = targets.reduce((sum, t) => sum + (t.revenue || 0), 0)
      const actualTotal = actuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      const targetProfit = targets.reduce((sum, t) => sum + (t.profit || 0), 0)
      const actualProfit = actuals.reduce((sum, a) => sum + (a.profit || 0), 0)

      return {
        name: manager.full_name,
        targetTotal,
        actualTotal,
        achievementRate: targetTotal > 0 ? (actualTotal / targetTotal) * 100 : 0,
        profitRate: actualTotal > 0 ? (actualProfit / actualTotal) * 100 : 0,
        brandCount: managerBrands.length
      }
    }).sort((a, b) => b.achievementRate - a.achievementRate)
  }

  const calculateGrowthAnalysis = () => {
    const quarterlyGrowth = Array(4).fill({ revenue: 0, profit: 0 })
    
    // Her çeyrek için büyüme oranını hesapla
    for (let q = 1; q <= 4; q++) {
      const currentQuarterActuals = data.actuals.filter(a => a.quarter === q)
      const prevQuarterActuals = data.actuals.filter(a => a.quarter === q - 1)
      
      const currentRevenue = currentQuarterActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      const prevRevenue = prevQuarterActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      const currentProfit = currentQuarterActuals.reduce((sum, a) => sum + (a.profit || 0), 0)
      const prevProfit = prevQuarterActuals.reduce((sum, a) => sum + (a.profit || 0), 0)
      
      quarterlyGrowth[q - 1] = {
        revenue: prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0,
        profit: prevProfit > 0 ? ((currentProfit - prevProfit) / prevProfit) * 100 : 0
      }
    }
    
    return quarterlyGrowth
  }

  const calculateDeviationData = () => {
    const deviations = data.brands.map(brand => {
      const brandTargets = data.targets.filter(t => t.brand_id === brand.id)
      const brandActuals = data.actuals.filter(a => a.brand_id === brand.id)
      
      const targetSum = brandTargets.reduce((sum, t) => sum + (t.revenue || 0), 0)
      const actualSum = brandActuals.reduce((sum, a) => sum + (a.revenue || 0), 0)
      
      const deviation = targetSum > 0 ? Math.abs((actualSum - targetSum) / targetSum * 100) : 0
      return deviation
    })

    const criticalCount = deviations.filter(d => d > 20).length
    const moderateCount = deviations.filter(d => d >= 10 && d <= 20).length
    const normalCount = deviations.filter(d => d < 10).length

    return {
      labels: ['Kritik Sapma (>%20)', 'Orta Sapma (%10-%20)', 'Normal Sapma (<%10)'],
      datasets: [{
        data: [criticalCount, moderateCount, normalCount],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Kırmızı
          'rgba(234, 179, 8, 0.8)',   // Sarı
          'rgba(34, 197, 94, 0.8)',   // Yeşil
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(234, 179, 8)',
          'rgb(34, 197, 94)',
        ],
        borderWidth: 1
      }]
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Analiz ve Raporlar</h1>
      </div>

      {/* Filtreler */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Çeyrek
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value={0}>Tüm Çeyrekler</option>
              {quarters.map((quarter) => (
                <option key={quarter.value} value={quarter.value}>
                  {quarter.label}
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
              onChange={(e) => setSelectedManager(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tüm Satış Müdürleri</option>
              {data.salesManagers.map((manager) => (
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
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">Tüm Markalar</option>
              {data.brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Özet Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Hedef Gerçekleştirme
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Gerçekleşme Oranı</span>
                    <span className="text-lg font-semibold text-gray-900">
                      %{summaryData.achievementRate.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Hedef</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(summaryData.targetTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Gerçekleşen</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(summaryData.actualTotal)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${Math.min(summaryData.achievementRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Karlılık Analizi
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Karlılık Oranı</span>
                    <span className="text-lg font-semibold text-gray-900">
                      %{summaryData.profitRate.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Hedeflenen Kar</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(summaryData.targetProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Gerçekleşen Kar</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(summaryData.actualProfit)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${Math.min(summaryData.profitRate, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Performans Özeti
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">En İyi Performans</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {summaryData.bestPerformingBrand.name}
                      </div>
                      <div className="text-xs text-green-600">
                        %{summaryData.bestPerformingBrand.rate.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">En Düşük Performans</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {summaryData.worstPerformingBrand.name}
                      </div>
                      <div className="text-xs text-red-600">
                        %{summaryData.worstPerformingBrand.rate.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Sapma Analizi
                    </div>
                    <div className="text-sm font-medium text-gray-900 mt-1">
                      {Math.abs(summaryData.achievementRate - 100) > 20 
                        ? 'Kritik sapma tespit edildi'
                        : 'Normal aralıkta'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grafik Alanları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trend Analizi Grafiği */}
            <div className="bg-white p-6 rounded-lg shadow">
              <Line data={calculateTrendData()} options={trendOptions} />
            </div>
            
            {/* Karşılaştırmalı Analiz Grafiği */}
            <div className="bg-white p-6 rounded-lg shadow">
              <Bar data={calculateComparisonData()} options={comparisonOptions} />
            </div>
          </div>

          {/* Detaylı Tablo */}
          <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Detaylı Analiz Tablosu
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marka
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hedef Gelir
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gerçekleşen Gelir
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gerçekleşme %
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hedef Kar
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gerçekleşen Kar
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kar Gerçekleşme %
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kar Marjı %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {calculateDetailedData().map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.targetRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.actualRevenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          item.revenueAchievement >= 100 ? 'text-green-600' :
                          item.revenueAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          %{item.revenueAchievement.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.targetProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                        {formatCurrency(item.actualProfit)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          item.profitAchievement >= 100 ? 'text-green-600' :
                          item.profitAchievement >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          %{item.profitAchievement.toFixed(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <span className={`font-medium ${
                          item.profitMargin >= 20 ? 'text-green-600' :
                          item.profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          %{item.profitMargin.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forecast Analiz Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Forecast Doğruluk Analizi */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Forecast Doğruluk Analizi
              </h3>
              <div className="space-y-4">
                {calculateForecastAnalysis().quarterlyData.map((data, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{index + 1}. Çeyrek</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${
                        data.accuracy >= 90 ? 'text-green-600' :
                        data.accuracy >= 80 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        %{data.accuracy.toFixed(1)}
                      </span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            data.accuracy >= 90 ? 'bg-green-600' :
                            data.accuracy >= 80 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}
                          style={{ width: `${data.accuracy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Ortalama Doğruluk</span>
                    <span className="text-lg font-semibold text-gray-900">
                      %{calculateForecastAnalysis().averageAccuracy.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Forecast Trend Analizi */}
            <div className="bg-white p-6 rounded-lg shadow">
              <Line 
                data={calculateForecastAnalysis().trendData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Forecast Trend Analizi'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          let label = context.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (context.parsed.y !== null) {
                            label += formatCurrency(Number(context.parsed.y));
                          }
                          return label;
                        }
                      }
                    }
                  },
                  scales: {
                    y: {
                      ticks: {
                        callback: function(value) {
                          return formatCurrency(Number(value));
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Performans Analiz Kartları */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            {/* Satış Müdürü Performans Tablosu */}
            <div className="bg-white p-6 rounded-lg shadow overflow-hidden">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Satış Müdürü Performansları
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Satış Müdürü
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Marka Sayısı
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gerçekleşme %
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Karlılık %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {calculateManagerPerformance().map((manager, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {manager.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                          {manager.brandCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${
                            manager.achievementRate >= 100 ? 'text-green-600' :
                            manager.achievementRate >= 80 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            %{manager.achievementRate.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${
                            manager.profitRate >= 20 ? 'text-green-600' :
                            manager.profitRate >= 15 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            %{manager.profitRate.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Çeyreklik Büyüme Analizi */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Çeyreklik Büyüme Analizi
              </h3>
              <div className="space-y-6">
                {calculateGrowthAnalysis().map((growth, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-500">{index + 1}. Çeyrek</span>
                      <div className="flex space-x-4">
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Gelir Büyümesi</span>
                          <span className={`text-sm font-medium ${
                            growth.revenue > 0 ? 'text-green-600' : 
                            growth.revenue < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {growth.revenue > 0 ? '+' : ''}{growth.revenue.toFixed(1)}%
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">Kar Büyümesi</span>
                          <span className={`text-sm font-medium ${
                            growth.profit > 0 ? 'text-green-600' : 
                            growth.profit < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {growth.profit > 0 ? '+' : ''}{growth.profit.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${growth.revenue >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${Math.min(Math.abs(growth.revenue), 100)}%` }}
                        />
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${growth.profit >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${Math.min(Math.abs(growth.profit), 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hedef Sapma Dağılımı */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Hedef Sapma Dağılımı
              </h3>
              <Pie 
                data={calculateDeviationData()} 
                options={{
                  plugins: {
                    legend: {
                      position: 'bottom'
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
                          const value = context.raw as number
                          const percentage = ((value / total) * 100).toFixed(1)
                          return `${context.label}: ${value} marka (%${percentage})`
                        }
                      }
                    }
                  }
                }} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 