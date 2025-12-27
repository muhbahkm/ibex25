'use client'

import { usePathname } from 'next/navigation'
import { AppLayout } from './AppLayout'

/**
 * LayoutWrapper Component
 *
 * Client component wrapper that provides the AppLayout to all pages.
 * Determines page title based on current route.
 */
export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Map routes to page titles
  const getPageTitle = (): string | undefined => {
    if (pathname === '/') return 'لوحة التحكم'
    if (pathname === '/invoices') return 'الفواتير'
    if (pathname === '/invoices/new') return 'فاتورة جديدة'
    if (pathname.startsWith('/invoices/') && pathname.includes('/edit'))
      return 'تعديل الفاتورة'
    if (pathname.startsWith('/invoices/') && pathname.includes('/issue'))
      return 'إصدار الفاتورة'
    if (pathname.startsWith('/invoices/')) return 'تفاصيل الفاتورة'
    if (pathname === '/ledger') return 'السجل المالي'
    if (pathname === '/reports') return 'التقارير'
    if (pathname === '/billing') return 'الاشتراكات والفوترة'
    return undefined
  }

  return <AppLayout pageTitle={getPageTitle()}>{children}</AppLayout>
}

