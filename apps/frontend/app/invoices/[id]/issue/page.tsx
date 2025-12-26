'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RequirePermission } from '@/auth/RequirePermission'
import { useAuth } from '@/auth/useAuth'
import { fetchInvoice, issueInvoice, InvoiceDetail } from '@/lib/api'
import { formatCurrency } from '@/lib/format'

export default function IssueInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const { user } = useAuth()
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [paymentType, setPaymentType] = useState<'CASH' | 'CREDIT' | ''>('')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isIssuing, setIsIssuing] = useState<boolean>(false)
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

        // Check if invoice is DRAFT
        if (invoiceData.status !== 'DRAFT') {
          setError('لا يمكن إصدار فاتورة غير مسودة.')
        }
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

  const handleIssue = async () => {
    if (!invoice || invoice.status !== 'DRAFT') {
      setError('لا يمكن إصدار فاتورة غير مسودة.')
      return
    }

    if (!paymentType) {
      setError('يجب اختيار نوع الدفع.')
      return
    }

    try {
      setIsIssuing(true)
      setError(null)

      await issueInvoice(
        invoiceId,
        paymentType as 'CASH' | 'CREDIT',
        user.id,
        user.storeId,
        user.role,
      )

      // Redirect to invoice list after success
      router.push('/invoices')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشل إصدار الفاتورة.'
      setError(message)
    } finally {
      setIsIssuing(false)
    }
  }

  const handleCancel = () => {
    router.push(`/invoices/${invoiceId}/edit`)
  }

  if (isLoading) {
    return (
      <RequirePermission permission="ISSUE_INVOICE">
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
      <RequirePermission permission="ISSUE_INVOICE">
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                {error || 'الفاتورة غير موجودة.'}
              </p>
            </div>
          </div>
        </div>
      </RequirePermission>
    )
  }

  if (invoice.status !== 'DRAFT') {
    return (
      <RequirePermission permission="ISSUE_INVOICE">
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                إصدار الفاتورة
              </h1>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                لا يمكن إصدار فاتورة غير مسودة
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => router.push('/invoices')}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                العودة إلى القائمة
              </button>
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
    <RequirePermission permission="ISSUE_INVOICE">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">إصدار الفاتورة</h1>
            <p className="text-sm text-gray-500 mt-1">
              الحالة: <span className="font-medium"> مسودة</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Warning Message */}
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ إصدار هذه الفاتورة سيؤدي إلى قفلها ولن يمكن تعديلها بعد ذلك.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

            {/* Payment Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                نوع الدفع <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentType"
                    value="CASH"
                    checked={paymentType === 'CASH'}
                    onChange={(e) => setPaymentType(e.target.value as 'CASH')}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900">نقدي</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="paymentType"
                    value="CREDIT"
                    checked={paymentType === 'CREDIT'}
                    onChange={(e) =>
                      setPaymentType(e.target.value as 'CREDIT')
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-900">آجل</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancel}
                disabled={isIssuing}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleIssue}
                disabled={isIssuing || !paymentType}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isIssuing ? 'جاري الإصدار...' : 'تأكيد الإصدار'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

