'use client'

import { RequirePermission } from '@/auth/RequirePermission'
import { formatCurrency, formatDate } from '@/lib/format'

/**
 * Ledger Entry (mocked structure)
 * This matches the backend LedgerEntry model structure.
 */
interface LedgerEntry {
  id: string
  type: 'SALE' | 'RECEIPT'
  amount: number
  createdAt: string
}

/**
 * Mocked ledger entries data
 * TEMPORARY: This will be replaced with actual API calls in future phases.
 */
const mockLedgerEntries: LedgerEntry[] = [
  {
    id: 'ledger-1',
    type: 'SALE',
    amount: 1500.0,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ledger-2',
    type: 'RECEIPT',
    amount: 1500.0,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'ledger-3',
    type: 'SALE',
    amount: 2500.75,
    createdAt: new Date().toISOString(),
  },
]

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
 * This is a scaffold phase - data is mocked and no backend integration exists yet.
 */
export default function LedgerPage() {
  // Using mocked data for now
  const entries = mockLedgerEntries

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
                  {entries.length === 0 ? (
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

