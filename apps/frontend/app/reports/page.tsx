'use client'

import { useEffect, useState } from 'react'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency } from '@/lib/format'
import { fetchProfitLossReport } from '@/lib/api'
import {
  Button,
  LoadingState,
  ErrorMessage,
} from '@/components/ui'
import Icon from '@/components/Icon'

/**
 * Reports Page Component
 *
 * Displays Profit & Loss report with Total Sales, Total Receipts, and Net Revenue.
 * Data is fetched from the backend API.
 */
export default function ReportsPage() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')
  
  // Financial data - populated from API
  const [totalSales, setTotalSales] = useState<number | null>(null)
  const [totalReceipts, setTotalReceipts] = useState<number | null>(null)
  const [netRevenue, setNetRevenue] = useState<number | null>(null)

  async function loadReports() {
    let isMounted = true

    try {
      setIsLoading(true)
      setError(null)

      // Convert date strings to ISO format if provided
      const fromDateISO = fromDate ? new Date(fromDate).toISOString() : undefined
      const toDateISO = toDate ? new Date(toDate).toISOString() : undefined

      const report = await fetchProfitLossReport(
        user.storeId,
        user.id,
        user.id,
        user.role,
        fromDateISO,
        toDateISO,
      )

      if (!isMounted) return

      setTotalSales(report.totalSales)
      setTotalReceipts(report.totalReceipts)
      setNetRevenue(report.netRevenue)
    } catch (err) {
      if (!isMounted) return

      const message =
        err instanceof Error ? err.message : 'تعذر تحميل التقرير'
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
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.storeId, user.id])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    loadReports()
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    setTimeout(() => {
      loadReports()
    }, 0)
  }

  return (
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-page-title mb-2">الأرباح والخسائر</h1>
          <p className="text-muted hidden sm:block">
            تحليل الأداء المالي بناءً على السجل المالي الموثق
          </p>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleFilter} className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-4">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="fromDate"
                className="block text-xs font-medium text-gray-500 mb-2"
              >
                من تاريخ
              </label>
              <input
                type="date"
                id="fromDate"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-body"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="toDate"
                className="block text-xs font-medium text-gray-500 mb-2"
              >
                إلى تاريخ
              </label>
              <input
                type="date"
                id="toDate"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-body"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading}
                isLoading={isLoading}
                className="gap-2 w-full sm:w-auto"
              >
                {!isLoading && <Icon name="filter_list" />}
                <span>تصفية</span>
              </Button>
              {(fromDate || toDate) && (
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handleClearFilters}
                  disabled={isLoading}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Icon name="clear" />
                  <span>مسح</span>
                </Button>
              )}
            </div>
          </form>
        </div>

        {/* Info Card - How to read this report */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="lightbulb" className="text-gray-500 text-xl flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-900">
                كيف تقرأ هذا التقرير؟
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">
                هذه الأرقام تعكس واقعك المالي بدقة بناءً على الفواتير والسجل المالي:
                <br />
                • <strong>إجمالي المبيعات:</strong> قيمة الفواتير التي أصدرتها (سواء دُفعت أم لا). تعكس حجم نشاطك التجاري.
                <br />
                • <strong>إجمالي التحصيلات:</strong> السيولة النقدية التي دخلت فعلياً للصندوق.
                <br />
                • <strong>صافي الإيرادات:</strong> (المبيعات - التحصيلات) يمثل المبالغ المتبقية لك عند العملاء (الديون المستحقة).
              </p>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <LoadingState message="جاري التحميل..." />
              </div>
            ))}
          </div>
        ) : totalSales === null || totalReceipts === null || netRevenue === null ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Icon name="assessment" className="text-gray-400 text-6xl mb-4" />
              <p className="text-lg font-medium text-gray-900 mb-2">لا توجد بيانات للعرض</p>
              <p className="text-body text-gray-500 max-w-md">
                الأرقام تظهر هنا تلقائياً بمجرد وجود نشاط في السجل المالي
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Sales Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    إجمالي المبيعات
                  </p>
                  <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                    {totalSales !== null ? formatCurrency(totalSales) : '—'} ر.س
                  </p>
                </div>
                <div className="p-3 bg-primary-50 rounded-lg flex-shrink-0 mr-4">
                  <Icon name="payments" className="text-primary-600 text-2xl" />
                </div>
              </div>
            </div>

            {/* Total Receipts Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    إجمالي التحصيلات
                  </p>
                  <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                    {totalReceipts !== null ? formatCurrency(totalReceipts) : '—'} ر.س
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg flex-shrink-0 mr-4">
                  <Icon name="account_balance_wallet" className="text-green-600 text-2xl" />
                </div>
              </div>
            </div>

            {/* Net Revenue Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wide">
                    صافي الإيرادات
                  </p>
                  <p className="text-3xl font-semibold text-gray-900 text-numeric leading-tight">
                    {netRevenue !== null ? formatCurrency(netRevenue) : '—'} ر.س
                  </p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg flex-shrink-0 mr-4">
                  <Icon name="trending_up" className="text-blue-600 text-2xl" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequirePermission>
  )
}

