'use client'

import { useEffect, useState } from 'react'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { formatCurrency, formatDate } from '@/lib/format'
import { fetchLedgerEntries, LedgerEntry } from '@/lib/api'
import {
  Button,
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
 * Get Arabic label for ledger entry type
 */
function getTypeLabel(type: 'SALE' | 'RECEIPT'): string {
  return type === 'SALE' ? 'بيع' : 'تحصيل'
}

/**
 * Ledger Page Component
 *
 * Displays financial events (SALE and RECEIPT) in a read-only table.
 * Data is fetched from the backend API.
 */
export default function LedgerPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LedgerEntry[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  async function loadLedgerEntries() {
    let isMounted = true

    try {
      setIsLoading(true)
      setError(null)

      // Convert date strings to ISO format if provided
      const fromDateISO = fromDate ? new Date(fromDate).toISOString() : undefined
      const toDateISO = toDate ? new Date(toDate).toISOString() : undefined

      const ledgerEntries = await fetchLedgerEntries(
        user.storeId,
        user.id,
        fromDateISO,
        toDateISO,
      )

      if (!isMounted) return

      setEntries(ledgerEntries)
    } catch (err) {
      if (!isMounted) return

      const message =
        err instanceof Error ? err.message : 'فشل تحميل بيانات السجل المالي.'
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
    loadLedgerEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.storeId, user.id])

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault()
    loadLedgerEntries()
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    // Reload with empty dates - loadLedgerEntries will use the updated state
    // We need to wait for state update, so use setTimeout
    setTimeout(() => {
      loadLedgerEntries()
    }, 0)
  }

  const handleExportCSV = async () => {
    try {
      setError(null)

      // Build query parameters with current filters
      const params = new URLSearchParams({
        storeId: user.storeId,
        operatorId: user.id,
        export: 'csv',
      })

      if (fromDate) {
        params.append('fromDate', new Date(fromDate).toISOString())
      }

      if (toDate) {
        params.append('toDate', new Date(toDate).toISOString())
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '')
      if (!baseUrl) {
        throw new Error('إعدادات الاتصال غير مكتملة.')
      }

      const url = `${baseUrl}/ledger?${params.toString()}`

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      })

      if (!res.ok) {
        throw new Error('فشل تصدير بيانات السجل المالي.')
      }

      // Get CSV content
      const csv = await res.text()

      // Create blob and trigger download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)
      link.setAttribute('href', urlBlob)
      link.setAttribute('download', 'ledger.csv')
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(urlBlob)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشل تصدير بيانات السجل المالي.'
      setError(message)
    }
  }

  return (
    <RequirePermission permission={Permission.VIEW_LEDGER}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-page-title mb-2">سجل الحركات المالية</h1>
            <p className="text-muted">
              عرض جميع الحركات المالية (مبيعات و تحصيلات) في المتجر
            </p>
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <form onSubmit={handleFilter} className="flex flex-wrap items-end gap-4">
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
            <div className="flex gap-2">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isLoading}
                isLoading={isLoading}
                className="gap-2"
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
                  className="gap-2"
                >
                  <Icon name="clear" />
                  <span>مسح</span>
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={handleExportCSV}
                disabled={isLoading}
                className="gap-2"
              >
                <Icon name="download" />
                <span>تصدير CSV</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Ledger Table */}
        {isLoading ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3} align="center" className="py-12">
                  <LoadingState message="جاري تحميل بيانات السجل المالي..." />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : entries.length === 0 ? (
          <Table>
            <TableBody>
              <TableRow>
                <TableCell colSpan={3} align="center" className="py-12">
                  <EmptyState
                    message="لا توجد حركات مالية"
                    description={
                      fromDate || toDate
                        ? 'لا توجد حركات مالية في الفترة المحددة'
                        : 'لم يتم تسجيل أي حركات مالية حتى الآن'
                    }
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableHeaderCell align="right">التاريخ</TableHeaderCell>
              <TableHeaderCell align="right">النوع</TableHeaderCell>
              <TableHeaderCell align="left">المبلغ</TableHeaderCell>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell align="right">
                    <span className="text-body">{formatDate(entry.createdAt)}</span>
                  </TableCell>
                  <TableCell align="right">
                    <span className="text-body">{getTypeLabel(entry.type)}</span>
                  </TableCell>
                  <TableCell align="left">
                    <span className="text-numeric">
                      {formatCurrency(entry.amount)} ر.س
                    </span>
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

