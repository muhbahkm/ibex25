'use client'

import { useEffect, useState } from 'react'
import { RequirePermission } from '@/auth/RequirePermission'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchLedgerEntries, LedgerEntry } from '@/lib/api'

/**
 * Get Arabic label for ledger entry type
 */
function getTypeLabel(type: 'SALE' | 'RECEIPT'): string {
  return type === 'SALE' ? 'بيع' : 'تحصيل'
}

/**
 * Ledger Page Component
 *
 * Displays financial events (SALE and RECEIPT) in a read-only table.
 * Data is fetched from the backend API.
 */
export default function LedgerPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadLedgerEntries() {
      try {
        setIsLoading(true)
        setError(null)

        const ledgerEntries = await fetchLedgerEntries(
          user.storeId,
          user.id,
        )

        if (!isMounted) return

        setEntries(ledgerEntries)
      } catch (err) {
        if (!isMounted) return

        const message =
          err instanceof Error ? err.message : 'فشل تحميل بيانات السجل المالي.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadLedgerEntries()

    return () => {
      isMounted = false
    }
  }, [user.storeId, user.id])

  return (
    <RequirePermission permission="VIEW_LEDGER">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              سجل الحركات المالية
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              عرض جميع الحركات المالية (مبيعات و تحصيلات)
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Ledger Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      النوع
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        جاري تحميل البيانات...
                      </td>
                    </tr>
                  ) : entries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        لا توجد حركات مالية
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(entry.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getTypeLabel(entry.type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(entry.amount)} ر.س
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

