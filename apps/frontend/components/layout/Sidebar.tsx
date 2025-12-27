'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icon from '@/components/Icon'

interface NavItem {
  label: string
  href: string
  icon?: string
}

const navItems: NavItem[] = [
  { label: 'لوحة التحكم', href: '/', icon: 'dashboard' },
  { label: 'الفواتير', href: '/invoices', icon: 'receipt' },
  { label: 'السجل المالي', href: '/ledger', icon: 'account_balance' },
  { label: 'التقارير', href: '/reports', icon: 'assessment' },
  { label: 'الاشتراكات', href: '/billing', icon: 'payment' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * Sidebar Component
 *
 * Primary navigation sidebar with links to main sections.
 * Supports RTL layout and responsive behavior.
 */
export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed right-0 top-0 h-full w-64 bg-white border-l border-gray-200 z-50 transform transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } lg:translate-x-0 lg:static lg:z-auto`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Brand */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-section-title text-gray-900">IBEX</h2>
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {navItems.map((item) => {
                // Check if current path matches the nav item
                // For root path, exact match only
                // For other paths, check if pathname starts with the href
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        // Close sidebar on mobile when link is clicked
                        if (window.innerWidth < 1024) {
                          onClose()
                        }
                      }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-md text-body transition-colors ${
                        isActive
                          ? 'bg-primary-50 text-primary-700 font-medium'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon && (
                        <Icon
                          name={item.icon}
                          className={isActive ? 'text-primary-600' : 'text-gray-500'}
                        />
                      )}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  )
}

