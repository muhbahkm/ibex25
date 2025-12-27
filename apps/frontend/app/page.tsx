'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { useBilling } from '@/billing/useBilling'
import { formatCurrency, formatDate } from '@/lib/format'
import {
  fetchInvoices,
  fetchProfitLossReport,
  Invoice,
} from '@/lib/api'
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
 * Dashboard Page Component
 *
 * Decision-oriented dashboard for store owners/managers.
 * Displays key business metrics and recent activity at a glance.
 */
export default function Home() {
  const { user } = useAuth()
  const { plan: storePlan, loading: loadingPlan } = useBilling()
  
  // Profit & Loss data
  const [profitLoss, setProfitLoss] = useState<{
    totalSales: number
    totalReceipts: number
    netRevenue: number
  } | null>(null)
  const [loadingProfitLoss, setLoadingProfitLoss] = useState<boolean>(true)
  const [profitLossError, setProfitLossError] = useState<string | null>(null)

  // Latest invoices
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState<boolean>(true)
  const [invoicesError, setInvoicesError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadDashboardData() {
      // Load profit & loss report
      try {
        setLoadingProfitLoss(true)
        setProfitLossError(null)

        const report = await fetchProfitLossReport(
          user.storeId,
          user.id,
        )

        if (!isMounted) return

        setProfitLoss(report)
      } catch (err) {
        if (!isMounted) return
        const message =
          err instanceof Error ? err.message : 'فشل تحميل بيانات التقرير المالي.'
        setProfitLossError(message)
      } finally {
        if (isMounted) {
          setLoadingProfitLoss(false)
        }
      }

      // Load latest invoices
      try {
        setLoadingInvoices(true)
        setInvoicesError(null)

        const allInvoices = await fetchInvoices(user.id, user.storeId, user.role)

        if (!isMounted) return

        // Take latest 5 (already sorted by createdAt DESC from backend)
        setInvoices(allInvoices.slice(0, 5))
      } catch (err) {
        if (!isMounted) return
        const message =
          err instanceof Error ? err.message : 'فشل تحميل قائمة الفواتير.'
        setInvoicesError(message)
      } finally {
        if (isMounted) {
          setLoadingInvoices(false)
        }
      }
    }

    loadDashboardData()

    return () => {
      isMounted = false
    }
  }, [user.id, user.storeId, user.role])

  const shortenInvoiceId = (id: string): string => {
    return id.substring(0, 8) + '...'
  }

  return (
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-page-title mb-2">لوحة التحكم</h1>
          <p className="text-muted">
            نظرة سريعة على أداء المتجر والأنشطة الأخيرة
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* إجمالي المبيعات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {loadingProfitLoss ? (
              <LoadingState message="جاري التحميل..." />
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  إجمالي المبيعات
                </p>
                <p className="text-body text-gray-500">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  إجمالي المبيعات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric">
                  {profitLoss ? formatCurrency(profitLoss.totalSales) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* إجمالي التحصيلات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {loadingProfitLoss ? (
              <LoadingState message="جاري التحميل..." />
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  إجمالي التحصيلات
                </p>
                <p className="text-body text-gray-500">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  إجمالي التحصيلات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric">
                  {profitLoss ? formatCurrency(profitLoss.totalReceipts) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* صافي الإيرادات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {loadingProfitLoss ? (
              <LoadingState message="جاري التحميل..." />
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  صافي الإيرادات
                </p>
                <p className="text-body text-gray-500">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  صافي الإيرادات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric">
                  {profitLoss ? formatCurrency(profitLoss.netRevenue) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* حالة الاشتراك */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {loadingPlan ? (
              <LoadingState message="جاري التحميل..." />
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                  حالة الاشتراك
                  </p>
                <p className="text-3xl font-semibold text-gray-900">
                  {storePlan?.plan.name || 'غير محدد'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {profitLossError && <ErrorMessage message={profitLossError} />}
        {invoicesError && <ErrorMessage message={invoicesError} />}

        {/* Latest Invoices */}
        <div>
          <h2 className="text-section-title mb-4">آخر الفواتير</h2>
          {loadingInvoices ? (
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
                      message="لا توجد فواتير"
                      description="لم يتم إنشاء أي فواتير حتى الآن"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableHeaderCell align="right">رقم الفاتورة</TableHeaderCell>
                <TableHeaderCell align="right">العميل</TableHeaderCell>
                <TableHeaderCell align="right">الحالة</TableHeaderCell>
                <TableHeaderCell align="left">المبلغ الإجمالي</TableHeaderCell>
                <TableHeaderCell align="right">الإجراء</TableHeaderCell>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell align="right">
                      <span className="text-body">{shortenInvoiceId(invoice.id)}</span>
                    </TableCell>
                    <TableCell align="right">
                      <span className="text-body">
                        {invoice.customerName || 'عميل نقدي'}
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell align="left">
                      <span className="text-numeric">
                        {formatCurrency(Number(invoice.totalAmount))} ر.س
                      </span>
                    </TableCell>
                    <TableCell align="right">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <Icon name="visibility" className="text-base" />
                        <span>عرض</span>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-section-title mb-4">روابط سريعة</h2>
          <div className="flex flex-wrap gap-3">
            <RequirePermission permission={Permission.ISSUE_INVOICE}>
              <Link href="/invoices/new">
                <Button variant="primary" size="md" className="gap-2">
                  <Icon name="add" />
                  <span>إنشاء فاتورة جديدة</span>
                </Button>
              </Link>
            </RequirePermission>
            <Link href="/invoices">
              <Button variant="secondary" size="md" className="gap-2">
                <Icon name="receipt" />
                <span>عرض كل الفواتير</span>
              </Button>
            </Link>
            <RequirePermission permission={Permission.VIEW_LEDGER}>
              <Link href="/ledger">
                <Button variant="secondary" size="md" className="gap-2">
                  <Icon name="account_balance" />
                  <span>عرض السجل المالي</span>
                </Button>
              </Link>
            </RequirePermission>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}
