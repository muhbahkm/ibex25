'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchInvoices, Invoice, settleInvoice, cancelInvoice } from '@/lib/api'
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
  EmptyState,
  ErrorMessage,
  TableSkeleton,
} from '@/components/ui'
import Icon from '@/components/Icon'

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
  const [cancellingInvoiceId, setCancellingInvoiceId] = useState<string | null>(
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
        err instanceof Error ? err.message : 'تعذر تحميل قائمة الفواتير'
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
        err instanceof Error ? err.message : 'تعذر تسوية الفاتورة'
      setError(message)
    } finally {
      setSettlingInvoiceId(null)
    }
  }

  const handleCancel = async (invoiceId: string) => {
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
      setCancellingInvoiceId(invoiceId)
      setError(null)

      await cancelInvoice(invoiceId, user.id, user.storeId, user.role)

      // Reload invoices after successful cancellation
      await loadInvoices()
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'تعذر إلغاء الفاتورة'
      setError(message)
    } finally {
      setCancellingInvoiceId(null)
    }
  }

  return (
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-page-title mb-2">سجل الفواتير</h1>
            <p className="text-muted hidden sm:block">
              إدارة ومتابعة جميع الفواتير الصادرة والمسودات
            </p>
          </div>
          <RequirePermission permission={Permission.ISSUE_INVOICE}>
            <Link href="/invoices/new" className="w-full sm:w-auto">
              <Button variant="primary" size="md" className="gap-2 w-full sm:w-auto">
                <Icon name="add" />
                <span>فاتورة جديدة</span>
              </Button>
            </Link>
          </RequirePermission>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} className="mb-6" />}

        {/* Invoices Table */}
        {isLoading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : invoices.length === 0 ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-12">
                  <EmptyState
                    message="لا توجد فواتير"
                    description="ابدأ بإنشاء فاتورة جديدة لإدارة مبيعاتك"
                    action={
                      <Link href="/invoices/new">
                        <Button variant="primary" size="md" className="gap-2">
                          <Icon name="add" />
                          <span>إنشاء فاتورة جديدة</span>
                        </Button>
                      </Link>
                    }
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableHeaderCell align="right">التاريخ</TableHeaderCell>
                  <TableHeaderCell align="right">العميل</TableHeaderCell>
                  <TableHeaderCell align="left">الإجمالي</TableHeaderCell>
                  <TableHeaderCell align="right">الحالة</TableHeaderCell>
                  <TableHeaderCell align="right">الإجراءات</TableHeaderCell>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell align="right">
                        <span className="text-body">
                          {formatDate(invoice.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <span className="text-body">
                          {invoice.customerName || 'عميل نقدي'}
                        </span>
                      </TableCell>
                      <TableCell align="left">
                        <span className="text-numeric">
                          {formatCurrency(Number(invoice.totalAmount))} ر.س
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell align="right">
                        <div className="flex items-center gap-2 justify-end">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-700 hover:text-primary-600 transition-colors"
                          >
                            <Icon name="visibility" className="text-base" />
                            <span>عرض</span>
                          </Link>
                          {invoice.status === 'UNPAID' && (
                            <>
                              <RequirePermission permission={Permission.SETTLE_INVOICE}>
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleSettle(invoice.id)}
                                  disabled={settlingInvoiceId === invoice.id}
                                  isLoading={settlingInvoiceId === invoice.id}
                                >
                                  تسوية
                                </Button>
                              </RequirePermission>
                              <RequirePermission permission={Permission.CANCEL_INVOICE}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleCancel(invoice.id)}
                                  disabled={cancellingInvoiceId === invoice.id}
                                  isLoading={cancellingInvoiceId === invoice.id}
                                  className="gap-1"
                                >
                                  {cancellingInvoiceId !== invoice.id && (
                                    <Icon name="cancel" className="text-sm" />
                                  )}
                                  <span>إلغاء</span>
                                </Button>
                              </RequirePermission>
                            </>
                          )}
                          {invoice.status === 'DRAFT' && (
                            <RequirePermission permission={Permission.CANCEL_INVOICE}>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleCancel(invoice.id)}
                                disabled={cancellingInvoiceId === invoice.id}
                                isLoading={cancellingInvoiceId === invoice.id}
                                className="gap-1"
                              >
                                {cancellingInvoiceId !== invoice.id && (
                                  <Icon name="cancel" className="text-sm" />
                                )}
                                <span>إلغاء</span>
                              </Button>
                            </RequirePermission>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="block mb-1"
                      >
                        <h3 className="text-body font-medium text-gray-900">
                          {invoice.customerName || 'عميل نقدي'}
                        </h3>
                      </Link>
                      <p className="text-muted text-xs">
                        {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>

                  <div className="flex items-center justify-between mb-3 pt-3 border-t border-gray-100">
                    <span className="text-muted text-xs">الإجمالي</span>
                    <span className="text-numeric font-semibold text-gray-900">
                      {formatCurrency(Number(invoice.totalAmount))} ر.س
                    </span>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-gray-700 hover:text-primary-600 transition-colors border border-gray-300 rounded-md"
                    >
                      <Icon name="visibility" className="text-base" />
                      <span>عرض</span>
                    </Link>
                    {invoice.status === 'UNPAID' && (
                      <>
                        <RequirePermission permission={Permission.SETTLE_INVOICE}>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleSettle(invoice.id)}
                            disabled={settlingInvoiceId === invoice.id}
                            isLoading={settlingInvoiceId === invoice.id}
                            className="flex-1"
                          >
                            تسوية
                          </Button>
                        </RequirePermission>
                        <RequirePermission permission={Permission.CANCEL_INVOICE}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCancel(invoice.id)}
                            disabled={cancellingInvoiceId === invoice.id}
                            isLoading={cancellingInvoiceId === invoice.id}
                            className="px-3"
                            title="إلغاء"
                          >
                            {cancellingInvoiceId !== invoice.id && (
                              <Icon name="cancel" />
                            )}
                          </Button>
                        </RequirePermission>
                      </>
                    )}
                    {invoice.status === 'DRAFT' && (
                      <RequirePermission permission={Permission.CANCEL_INVOICE}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleCancel(invoice.id)}
                          disabled={cancellingInvoiceId === invoice.id}
                          isLoading={cancellingInvoiceId === invoice.id}
                          className="flex-1 gap-1"
                        >
                          {cancellingInvoiceId !== invoice.id && (
                            <Icon name="cancel" className="text-sm" />
                          )}
                          <span>إلغاء</span>
                        </Button>
                      </RequirePermission>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  )
}

