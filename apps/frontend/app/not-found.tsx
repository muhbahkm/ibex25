'use client'

import Link from 'next/link'
import { Button } from '@/components/ui'
import Icon from '@/components/Icon'

/**
 * 404 Not Found Page
 *
 * Displays when a route is not found.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-6 px-4">
        <div className="space-y-2">
          <h1 className="text-6xl font-bold text-gray-900">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700">الصفحة غير موجودة</h2>
          <p className="text-body text-gray-600 max-w-md mx-auto">
            عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/">
            <Button variant="primary" size="md" className="gap-2">
              <Icon name="home" />
              <span>العودة للصفحة الرئيسية</span>
            </Button>
          </Link>
          <Button
            variant="secondary"
            size="md"
            onClick={() => window.history.back()}
            className="gap-2"
          >
            <Icon name="arrow_back" />
            <span>العودة للصفحة السابقة</span>
          </Button>
        </div>
      </div>
    </div>
  )
}

