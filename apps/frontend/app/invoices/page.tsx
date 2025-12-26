'use client'

import { useEffect, useState } from 'react'
import { RequirePermission } from '@/auth/RequirePermission'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchInvoices, Invoice, settleInvoice } from '@/lib/api'

/**
 * Get Arabic label for invoice status
 */
function getStatusLabel(
  status: 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED',
): string {
  const labels: Record<
    'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED',
    string
  > = {
    DRAFT: 'مسودة',
    ISSUED: 'مُصدرة',
    UNPAID: 'غير مسددة',
    PAID: 'مسددة',
    CANCELLED: 'ملغاة',
  }
  return labels[status]
}

/**
 * Get badge color class for invoice status
 */
function getStatusBadgeColor(
  status: 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED',
): string {
  const colors: Record<
    'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED',
    string
  > = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ISSUED: 'bg-blue-100 text-blue-800',
    UNPAID: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return colors[status]
}

/**
 * Invoice List Page Component
 *
 * Displays all invoices for the current store in a read-only table.
 * Data is fetched from the backend API.
 */
export default function InvoicesPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [settlingInvoiceId, setSettlingInvoiceId] = useState<string | null>(
    null,
  )

  async function loadInvoices() {
    let isMounted = true

    try {
      setIsLoading(true)
      setError(null)

      const invoicesData = await fetchInvoices(user.id, user.storeId, user.role)

      if (!isMounted) return

      setInvoices(invoicesData)
    } catch (err) {
      if (!isMounted) return

      const message =
        err instanceof Error ? err.message : 'فشل تحميل قائمة الفواتير.'
      setError(message)
    } finally {
      if (isMounted) {
        setIsLoading(false)
      }
    }

    return () => {
      isMounted = false
    }
  }

  useEffect(() => {
    loadInvoices()
  }, [user.id, user.storeId, user.role])

  const handleSettle = async (invoiceId: string) => {
    try {
      setSettlingInvoiceId(invoiceId)
      setError(null)

      await settleInvoice(invoiceId, user.id, user.storeId, user.role)

      // Reload invoices after successful settlement
      await loadInvoices()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشل تسوية الفاتورة.'
      setError(message)
    } finally {
      setSettlingInvoiceId(null)
    }
  }

  return (
    <RequirePermission permission="VIEW_REPORTS">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">الفواتير</h1>
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Invoices Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      العميل
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجمالي
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراءات
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        جاري تحميل الفواتير...
                      </td>
                    </tr>
                  ) : invoices.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        لا توجد فواتير حتى الآن.
                      </td>
                    </tr>
                  ) : (
                    invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.customerName || 'عميل نقدي'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(Number(invoice.totalAmount))} ر.س
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              invoice.status,
                            )}`}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.status === 'UNPAID' && (
                            <RequirePermission permission="SETTLE_INVOICE">
                              <button
                                onClick={() => handleSettle(invoice.id)}
                                disabled={settlingInvoiceId === invoice.id}
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {settlingInvoiceId === invoice.id
                                  ? 'جاري التسوية...'
                                  : 'تسوية'}
                              </button>
                            </RequirePermission>
                          )}
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

