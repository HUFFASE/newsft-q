import { Home, Target, BarChart3, DollarSign, Users, Building, LineChart } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Ana Sayfa',
      icon: Home
    },
    {
      href: '/dashboard/targets',
      label: 'Hedefler',
      icon: Target
    },
    {
      href: '/dashboard/actuals',
      label: 'Gerçekleşenler',
      icon: DollarSign
    },
    {
      href: '/dashboard/forecast',
      label: 'Forecast',
      icon: LineChart
    },
    {
      href: '/dashboard/brands',
      label: 'Markalar',
      icon: Building
    },
    {
      href: '/dashboard/users',
      label: 'Kullanıcılar',
      icon: Users
    },
    {
      href: '/dashboard/analysis',
      label: 'Analiz ve Raporlar',
      icon: BarChart3
    }
  ]

  return (
    <div className="flex h-full">
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 overflow-y-auto bg-white">
          <div className="flex items-center flex-shrink-0 px-4">
            <span className="text-xl font-semibold text-gray-900">Forecast Tool</span>
          </div>
          <div className="flex-1 flex flex-col mt-5">
            <nav className="flex-1 px-2 space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <item.icon
                      className={`mr-3 flex-shrink-0 h-6 w-6 ${
                        isActive
                          ? 'text-gray-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  )
} 