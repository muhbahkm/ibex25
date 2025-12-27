'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchInvoices, Invoice, settleInvoice } from '@/lib/api'
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
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-page-title mb-2">الفواتير</h1>
            <p className="text-muted">
              عرض وإدارة جميع الفواتير في المتجر
            </p>
          </div>
          <RequirePermission permission={Permission.ISSUE_INVOICE}>
            <Link href="/invoices/new">
              <Button variant="primary" size="md" className="gap-2">
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
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-12">
                  <LoadingState message="جاري تحميل الفواتير..." />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : invoices.length === 0 ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={5} align="center" className="py-12">
                  <EmptyState
                    message="لا توجد فواتير حتى الآن"
                    description="ابدأ بإنشاء فاتورة جديدة لإدارة مبيعاتك"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
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
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </RequirePermission>
  )
}

