'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { useAuth } from '@/auth/useAuth'
import { fetchInvoice, settleInvoice, InvoiceDetail } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'

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
 * Get Arabic label for payment type
 */
function getPaymentTypeLabel(paymentType: string | null): string {
  if (!paymentType) return 'غير محدد'
  return paymentType === 'CASH' ? 'نقدي' : 'آجل'
}

export default function InvoiceDetailsPage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSettling, setIsSettling] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadInvoice() {
      try {
        setIsLoading(true)
        setError(null)

        const invoiceData = await fetchInvoice(
          invoiceId,
          user.id,
          user.storeId,
          user.role,
        )

        if (!isMounted) return

        setInvoice(invoiceData)
      } catch (err) {
        if (!isMounted) return
        const message =
          err instanceof Error ? err.message : 'فشل تحميل بيانات الفاتورة.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadInvoice()

    return () => {
      isMounted = false
    }
  }, [invoiceId, user.id, user.storeId, user.role])

  const handleSettle = async () => {
    if (!invoice || invoice.status !== 'UNPAID') return

    try {
      setIsSettling(true)
      setError(null)

      await settleInvoice(invoiceId, user.id, user.storeId, user.role)

      // Reload invoice after successful settlement
      const updatedInvoice = await fetchInvoice(
        invoiceId,
        user.id,
        user.storeId,
        user.role,
      )
      setInvoice(updatedInvoice)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشل تسوية الفاتورة.'
      setError(message)
    } finally {
      setIsSettling(false)
    }
  }

  if (isLoading) {
    return (
      <RequirePermission permission="VIEW_REPORTS">
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <p className="text-gray-500">جاري التحميل...</p>
            </div>
          </div>
        </div>
      </RequirePermission>
    )
  }

  if (!invoice) {
    return (
      <RequirePermission permission="VIEW_REPORTS">
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {error || 'الفاتورة غير موجودة.'}
              </p>
            </div>
            <div className="mt-4">
              <Link
                href="/invoices"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← العودة إلى قائمة الفواتير
              </Link>
            </div>
          </div>
        </div>
      </RequirePermission>
    )
  }

  const calculateLineTotal = (quantity: number, unitPrice: string): number => {
    return quantity * Number(unitPrice)
  }

  return (
    <RequirePermission permission="VIEW_REPORTS">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">تفاصيل الفاتورة</h1>
              <Link
                href="/invoices"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                ← العودة إلى القائمة
              </Link>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Invoice Header */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الفاتورة
                </label>
                <p className="text-sm text-gray-900">{invoice.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الحالة
                </label>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                    invoice.status,
                  )}`}
                >
                  {getStatusLabel(invoice.status)}
                </span>
              </div>
              {invoice.paymentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    نوع الدفع
                  </label>
                  <p className="text-sm text-gray-900">
                    {getPaymentTypeLabel(invoice.paymentType)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  تاريخ الإنشاء
                </label>
                <p className="text-sm text-gray-900">
                  {formatDate(invoice.createdAt)}
                </p>
              </div>
            </div>

            {/* Customer */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العميل
              </label>
              <p className="text-sm text-gray-900">
                {invoice.customerName || 'عميل نقدي'}
              </p>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                العناصر
              </h2>
              {invoice.items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد عناصر
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الكمية
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          سعر الوحدة
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجمالي
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.productName}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(Number(item.unitPrice))} ر.س
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(
                              calculateLineTotal(item.quantity, item.unitPrice),
                            )}{' '}
                            ر.س
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mb-6 border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">
                  الإجمالي:
                </span>
                <span className="text-lg font-bold text-gray-900">
                  {formatCurrency(Number(invoice.totalAmount))} ر.س
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              {invoice.status === 'DRAFT' && (
                <Link
                  href={`/invoices/${invoiceId}/edit`}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  تعديل
                </Link>
              )}
              {invoice.status === 'UNPAID' && (
                <RequirePermission permission="SETTLE_INVOICE">
                  <button
                    onClick={handleSettle}
                    disabled={isSettling}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSettling ? 'جاري التسوية...' : 'تسوية الفاتورة'}
                  </button>
                </RequirePermission>
              )}
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

