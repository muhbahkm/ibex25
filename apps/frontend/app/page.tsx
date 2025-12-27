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
          user.id,
          user.role,
        )

        if (!isMounted) return

        setProfitLoss(report)
      } catch (err) {
        if (!isMounted) return
        // Calm error message
        setProfitLossError('تعذر تحميل ملخص المبيعات حالياً')
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
        // Calm error message
        setInvoicesError('تعذر تحميل الفواتير الأخيرة')
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
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        {/* Page Header */}
        <div className="mb-2">
          <h1 className="text-page-title mb-2">مرحباً بك في آيبكس 👋</h1>
          <p className="text-muted hidden sm:block">
            ملخص أداء المتجر اليومي وأهم المستجدات
          </p>
        </div>

        {/* Onboarding Welcome - Shows only when no data exists */}
        {!loadingProfitLoss && !loadingInvoices && invoices.length === 0 && profitLoss?.totalSales === 0 && (
          <div className="bg-primary-50 border border-primary-100 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-primary-900 mb-2">
              أهلاً بك في بداية جديدة! 🚀
            </h2>
            <p className="text-primary-800 mb-4 max-w-2xl">
              نظام آيبكس مصمم ليجعل إدارتك المالية سهلة وموثوقة. لتبدأ العمل بشكل صحيح، اتبع الخطوات التالية:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-md border border-primary-100">
                <div className="flex items-center gap-2 mb-2 text-primary-700 font-medium">
                  <span className="w-6 h-6 flex items-center justify-center bg-primary-100 rounded-full text-xs">1</span>
                  إنشاء فاتورة
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  أنشئ أول فاتورة مبيعات لعملائك سواء كانت مسودة أو جاهزة للإصدار.
                </p>
                <Link href="/invoices/new" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  ابدأ الآن &larr;
                </Link>
              </div>
              <div className="bg-white p-4 rounded-md border border-primary-100 opacity-75">
                <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs">2</span>
                  مراقبة السجل
                </div>
                <p className="text-sm text-gray-600">
                  كل حركة مالية (بيع أو تحصيل) سيتم تسجيلها تلقائياً في السجل المالي غير القابل للتعديل.
                </p>
              </div>
              <div className="bg-white p-4 rounded-md border border-primary-100 opacity-75">
                <div className="flex items-center gap-2 mb-2 text-gray-700 font-medium">
                  <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full text-xs">3</span>
                  متابعة التقارير
                </div>
                <p className="text-sm text-gray-600">
                  شاهد أداء متجرك من خلال تقارير الأرباح والخسائر التي يتم تحديثها لحظياً.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* إجمالي المبيعات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {loadingProfitLoss ? (
              <div className="flex flex-col justify-center min-h-[100px]">
                <LoadingState message="جاري التحميل..." />
              </div>
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  إجمالي المبيعات
                </p>
                <p className="text-body text-gray-400">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  إجمالي المبيعات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                  {profitLoss ? formatCurrency(profitLoss.totalSales) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* إجمالي التحصيلات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {loadingProfitLoss ? (
              <div className="flex flex-col justify-center min-h-[100px]">
                <LoadingState message="جاري التحميل..." />
              </div>
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  إجمالي التحصيلات
                </p>
                <p className="text-body text-gray-400">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  إجمالي التحصيلات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                  {profitLoss ? formatCurrency(profitLoss.totalReceipts) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* صافي الإيرادات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {loadingProfitLoss ? (
              <div className="flex flex-col justify-center min-h-[100px]">
                <LoadingState message="جاري التحميل..." />
              </div>
            ) : profitLossError ? (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  صافي الإيرادات
                </p>
                <p className="text-body text-gray-400">—</p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  صافي الإيرادات
                </p>
                <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                  {profitLoss ? formatCurrency(profitLoss.netRevenue) : '0'} ر.س
                </p>
              </div>
            )}
          </div>

          {/* حالة الاشتراك */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            {loadingPlan ? (
              <div className="flex flex-col justify-center min-h-[100px]">
                <LoadingState message="جاري التحميل..." />
              </div>
            ) : (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-4 uppercase tracking-wide">
                  حالة الاشتراك
                </p>
                <p className="text-2xl font-semibold text-gray-900 leading-tight">
                  {storePlan?.plan.name || 'غير محدد'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {(profitLossError || invoicesError) && (
          <div className="space-y-3">
            {profitLossError && <ErrorMessage message={profitLossError} />}
            {invoicesError && <ErrorMessage message={invoicesError} />}
          </div>
        )}

        {/* Latest Invoices Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-section-title">آخر الفواتير</h2>
          </div>
          <div className="p-6">
            {loadingInvoices ? (
              <div className="py-12">
                <LoadingState message="جاري تحميل الفواتير..." />
              </div>
            ) : invoices.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  message="ابدأ رحلة مبيعاتك"
                  description="لم تقم بإنشاء أي فاتورة بعد. أنشئ فاتورتك الأولى الآن لتبدأ في تتبع مبيعاتك."
                  action={
                    <Link href="/invoices/new">
                      <Button variant="primary" size="md" className="gap-2">
                        <Icon name="add" />
                        <span>إنشاء فاتورة جديدة</span>
                      </Button>
                    </Link>
                  }
                />
              </div>
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
                        <span className="text-body font-medium">{shortenInvoiceId(invoice.id)}</span>
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
                        <span className="text-numeric font-medium">
                          {formatCurrency(Number(invoice.totalAmount))} ر.س
                        </span>
                      </TableCell>
                      <TableCell align="right">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors font-medium"
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
        </div>

        {/* Quick Links Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          <h2 className="text-section-title mb-4 sm:mb-5">روابط سريعة</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
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
