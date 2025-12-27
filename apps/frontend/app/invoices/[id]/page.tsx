'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { fetchInvoice, settleInvoice, cancelInvoice, InvoiceDetail } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  Button,
  StatusBadge,
  Table,
  TableHeader,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  LoadingState,
  ErrorMessage,
} from '@/components/ui'
import Icon from '@/components/Icon'

function getStatusDescription(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'مسودة: يمكنك التعديل عليها. لم تؤثر على السجل المالي بعد.'
    case 'ISSUED':
      return 'مصدرة: تم تثبيت البيع في السجل المالي.'
    case 'UNPAID':
      return 'غير مدفوعة: تم تسجيل البيع، بانتظار التحصيل.'
    case 'PAID':
      return 'مدفوعة: تم تحصيل المبلغ وتسجيله.'
    case 'CANCELLED':
      return 'ملغاة: تم إيقاف الفاتورة وعكس أثرها المالي.'
    default:
      return ''
  }
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
  const [isCancelling, setIsCancelling] = useState<boolean>(false)
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
        err instanceof Error ? err.message : 'تعذر تحميل بيانات الفاتورة'
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
      setError(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'تعذر تسوية الفاتورة'
      setError(message)
    } finally {
      setIsSettling(false)
    }
  }

  const handleCancel = async () => {
    if (!invoice) return

    // Confirm cancellation
    const confirmed = window.confirm(
      '⚠️ هل أنت متأكد من إلغاء هذه الفاتورة؟\n\n' +
      '• هذا الإجراء نهائي ولا يمكن التراجع عنه.\n' +
      '• سيتم تحديث السجل المالي تلقائياً لعكس العملية.\n' +
      '• ستتغير حالة الفاتورة إلى "ملغاة".\n\n' +
      'هل تريد المتابعة؟'
    )

    if (!confirmed) return

    try {
      setIsCancelling(true)
      setError(null)

      await cancelInvoice(invoiceId, user.id, user.storeId, user.role)

      // Reload invoice after successful cancellation
      const updatedInvoice = await fetchInvoice(
        invoiceId,
        user.id,
        user.storeId,
        user.role,
      )
      setInvoice(updatedInvoice)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'تعذر إلغاء الفاتورة'
      setError(message)
    } finally {
      setIsCancelling(false)
    }
  }

  if (isLoading) {
    return (
      <RequirePermission permission={Permission.VIEW_REPORTS}>
        <div className="max-w-4xl mx-auto">
          <LoadingState message="جاري تحميل بيانات الفاتورة..." />
        </div>
      </RequirePermission>
    )
  }

  if (!invoice) {
    return (
      <RequirePermission permission={Permission.VIEW_REPORTS}>
        <div className="max-w-4xl mx-auto space-y-4">
          <ErrorMessage message={error || 'الفاتورة غير موجودة.'} />
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-body text-primary-600 hover:text-primary-700"
          >
            <Icon name="arrow_back" />
            <span>العودة إلى قائمة الفواتير</span>
          </Link>
        </div>
      </RequirePermission>
    )
  }

  const calculateLineTotal = (quantity: number, unitPrice: string): number => {
    return quantity * Number(unitPrice)
  }

  return (
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title mb-1">تفاصيل الفاتورة</h1>
            <p className="text-muted hidden sm:block mb-1">
              عرض كامل تفاصيل الفاتورة وحالتها الحالية
            </p>
            <p className="text-body font-medium text-gray-900">رقم الفاتورة: {invoice.id}</p>
          </div>
          <Link
            href="/invoices"
            className="inline-flex items-center gap-2 text-body text-gray-700 hover:text-gray-900"
          >
            <Icon name="arrow_back" />
            <span>العودة إلى القائمة</span>
          </Link>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Invoice Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {/* Invoice Header - Status & Metadata */}
          <div className="p-6">
            <div className="flex flex-wrap items-center gap-6 mb-6">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  الحالة
                </label>
                <div className="flex flex-col gap-1">
                  <StatusBadge status={invoice.status} />
                  <span className="text-xs text-gray-500 max-w-xs">
                    {getStatusDescription(invoice.status)}
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  تاريخ الإنشاء
                </label>
                <span className="text-body">{formatDate(invoice.createdAt)}</span>
              </div>
              {invoice.paymentType && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    نوع الدفع
                  </label>
                  <span className="text-body">
                    {getPaymentTypeLabel(invoice.paymentType)}
                  </span>
                </div>
              )}
            </div>

            {/* Customer */}
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-xs font-medium text-gray-500 mb-2">
                العميل
              </label>
              <p className="text-body">{invoice.customerName || 'عميل نقدي'}</p>
            </div>
          </div>

          {/* Invoice Items */}
          <div className="p-6">
            <h2 className="text-section-title mb-4">العناصر</h2>
            {invoice.items.length === 0 ? (
              <div className="text-center py-8 text-muted">
                لا توجد عناصر
              </div>
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

          {/* Actions */}
          <div className="p-6 flex justify-end gap-3">
            {invoice.status === 'DRAFT' && (
              <>
                <Link href={`/invoices/${invoiceId}/edit`}>
                  <Button variant="primary" size="md" className="gap-2">
                    <Icon name="edit" />
                    <span>تعديل</span>
                  </Button>
                </Link>
                <RequirePermission permission={Permission.CANCEL_INVOICE}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    isLoading={isCancelling}
                    className="gap-2"
                  >
                    {!isCancelling && <Icon name="cancel" />}
                    <span>إلغاء الفاتورة</span>
                  </Button>
                </RequirePermission>
              </>
            )}
            {invoice.status === 'UNPAID' && (
              <>
                <RequirePermission permission={Permission.SETTLE_INVOICE}>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={handleSettle}
                    disabled={isSettling}
                    isLoading={isSettling}
                    className="gap-2"
                  >
                    {!isSettling && <Icon name="check_circle" />}
                    <span>تسوية الفاتورة</span>
                  </Button>
                </RequirePermission>
                <RequirePermission permission={Permission.CANCEL_INVOICE}>
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={handleCancel}
                    disabled={isCancelling}
                    isLoading={isCancelling}
                    className="gap-2"
                  >
                    {!isCancelling && <Icon name="cancel" />}
                    <span>إلغاء الفاتورة</span>
                  </Button>
                </RequirePermission>
              </>
            )}
            {(invoice.status === 'ISSUED' || invoice.status === 'PAID') && (
              <RequirePermission permission={Permission.CANCEL_INVOICE}>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={handleCancel}
                  disabled={isCancelling}
                  isLoading={isCancelling}
                  className="gap-2"
                >
                  {!isCancelling && <Icon name="cancel" />}
                  <span>إلغاء الفاتورة</span>
                </Button>
              </RequirePermission>
            )}
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

