'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { fetchInvoice, issueInvoice, InvoiceDetail } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import {
  Button,
  LoadingState,
  EmptyState,
  ErrorMessage,
  StatusBadge,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui'
import Icon from '@/components/Icon'

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

      // Redirect to invoice detail page to show success
      router.push(`/invoices/${invoiceId}`)
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
      <RequirePermission permission={Permission.ISSUE_INVOICE}>
        <div className="max-w-4xl mx-auto">
          <LoadingState message="جاري تحميل بيانات الفاتورة..." />
        </div>
      </RequirePermission>
    )
  }

  if (!invoice) {
    return (
      <RequirePermission permission={Permission.ISSUE_INVOICE}>
        <div className="max-w-4xl mx-auto space-y-4">
          <ErrorMessage message={error || 'الفاتورة غير موجودة.'} />
          <Button variant="secondary" size="md" onClick={() => router.push('/invoices')}>
            <Icon name="arrow_back" />
            <span>العودة إلى القائمة</span>
          </Button>
        </div>
      </RequirePermission>
    )
  }

  if (invoice.status !== 'DRAFT') {
    return (
      <RequirePermission permission={Permission.ISSUE_INVOICE}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-page-title mb-2">إصدار الفاتورة</h1>
            <p className="text-muted">الفاتورة #{invoice.id}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-body text-yellow-800">
              لا يمكن إصدار فاتورة غير مسودة. الفواتير المصدرة لا يمكن إعادة إصدارها.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" size="md" onClick={() => router.push('/invoices')}>
              <Icon name="arrow_back" />
              <span>العودة إلى القائمة</span>
            </Button>
          </div>
        </div>
      </RequirePermission>
    )
  }

  const calculateLineTotal = (quantity: number, unitPrice: string): number => {
    return quantity * Number(unitPrice)
  }

  return (
    <RequirePermission permission={Permission.ISSUE_INVOICE}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <div className="mb-3">
            <Link
              href={`/invoices/${invoiceId}/edit`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-2"
            >
              <Icon name="arrow_back" className="text-base" />
              <span>العودة إلى التعديل</span>
            </Link>
          </div>
          <h1 className="text-page-title mb-2">إصدار الفاتورة</h1>
          <div className="flex flex-wrap items-center gap-4">
            <p className="text-muted">الفاتورة #{invoice.id.substring(0, 8)}...</p>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Critical Warning */}
        <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="warning" className="text-danger-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body font-semibold text-danger-900 mb-1">
                تنبيه هام: إصدار الفاتورة
              </p>
              <p className="text-body text-danger-800">
                إصدار الفاتورة يعني تثبيت عملية البيع في السجلات المالية وخصم المخزون. بعد الإصدار، لا يمكن تعديل الفاتورة ولكن يمكن إلغاؤها عند الضرورة. يرجى التأكد من صحة البيانات.
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Review Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {/* Customer */}
          <div className="p-6">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              العميل
            </label>
            <p className="text-body">{invoice.customerName || 'عميل نقدي'}</p>
          </div>

          {/* Invoice Items */}
          <div className="p-6">
            <h2 className="text-section-title mb-4">العناصر</h2>
            {invoice.items.length === 0 ? (
              <EmptyState message="لا توجد عناصر" />
            ) : (
              <Table>
                <TableHeader>
                  <TableHeaderCell align="right">المنتج</TableHeaderCell>
                  <TableHeaderCell align="right">الكمية</TableHeaderCell>
                  <TableHeaderCell align="left">سعر الوحدة</TableHeaderCell>
                  <TableHeaderCell align="left">الإجمالي</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell align="right">
                        <span className="text-body">{item.productName}</span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-body">{item.quantity}</span>
                      </TableCell>
                      <TableCell align="left">
                        <span className="text-numeric">
                          {formatCurrency(Number(item.unitPrice))} ر.س
                        </span>
                      </TableCell>
                      <TableCell align="left">
                        <span className="text-numeric">
                          {formatCurrency(
                            calculateLineTotal(item.quantity, item.unitPrice),
                          )}{' '}
                          ر.س
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Total */}
          <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-section-title">الإجمالي:</span>
              <span className="text-section-title text-numeric">
                {formatCurrency(Number(invoice.totalAmount))} ر.س
              </span>
            </div>
          </div>

          {/* Payment Type Selection */}
          <div className="p-6">
            <label className="block text-xs font-medium text-gray-500 mb-3">
              نوع الدفع <span className="text-danger-600">*</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="CASH"
                  checked={paymentType === 'CASH'}
                  onChange={(e) => setPaymentType(e.target.value as 'CASH')}
                  className="ml-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-body">نقدي</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="paymentType"
                  value="CREDIT"
                  checked={paymentType === 'CREDIT'}
                  onChange={(e) =>
                    setPaymentType(e.target.value as 'CREDIT')
                  }
                  className="ml-3 h-4 w-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-body">آجل</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={isIssuing}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleIssue}
              disabled={isIssuing || !paymentType}
              isLoading={isIssuing}
              className="gap-2"
            >
              {!isIssuing && <Icon name="check_circle" />}
              <span>إصدار الفاتورة</span>
            </Button>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

