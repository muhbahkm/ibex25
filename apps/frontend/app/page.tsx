 'use client'

import { useEffect, useState } from 'react'
import Icon from '@/components/Icon'
import {
  fetchCustomers,
  fetchCustomerStatement,
  settleInvoice,
  CustomerStatement,
  CustomerSummary,
} from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'

interface DashboardState {
  totalSales: number
  outstandingBalance: number
  invoicesCount: number
}

export default function Home() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  )
  const [statement, setStatement] = useState<CustomerStatement | null>(null)
  const [data, setData] = useState<DashboardState | null>(null)
  const [loadingCustomers, setLoadingCustomers] = useState<boolean>(true)
  const [loadingStatement, setLoadingStatement] = useState<boolean>(false)
  const [settlingInvoiceId, setSettlingInvoiceId] = useState<string | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadInitial() {
      try {
        setLoadingCustomers(true)
        setError(null)

        const customerList = await fetchCustomers()

        if (!isMounted) return

        setCustomers(customerList)

        if (customerList.length > 0) {
          const firstCustomerId = customerList[0].id
          setSelectedCustomerId(firstCustomerId)
          await loadStatement(firstCustomerId, isMounted)
        }
      } catch (err) {
        if (!isMounted) return
        const message =
          err instanceof Error
            ? err.message
            : 'حدث خطأ غير متوقع أثناء جلب البيانات.'
        setError(message)
      } finally {
        if (isMounted) {
          setLoadingCustomers(false)
        }
      }
    }

    async function loadStatement(
      customerId: string,
      stillMounted: boolean,
    ): Promise<void> {
      try {
        setLoadingStatement(true)
        setError(null)

        const statementData: CustomerStatement =
          await fetchCustomerStatement(customerId)

        if (!stillMounted) return

        setStatement(statementData)
        setData({
          totalSales: statementData.summary.totalSales,
          outstandingBalance: statementData.summary.outstandingBalance,
          invoicesCount: statementData.invoices.length,
        })
      } catch (err) {
        if (!stillMounted) return
        const message =
          err instanceof Error
            ? err.message
            : 'حدث خطأ غير متوقع أثناء جلب البيانات.'
        setError(message)
      } finally {
        if (stillMounted) {
          setLoadingStatement(false)
        }
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
  }, [])

  const formatInteger = (value: number) =>
    value.toLocaleString('ar-EG', {
      maximumFractionDigits: 0,
    })

  const isLoading = loadingCustomers || loadingStatement

  const totalSalesDisplay =
    data && !isLoading ? formatCurrency(data.totalSales) : '...'
  const outstandingBalanceDisplay =
    data && !isLoading ? formatCurrency(data.outstandingBalance) : '...'
  const invoicesCountDisplay =
    data && !isLoading ? formatInteger(data.invoicesCount) : '...'

  const handleCustomerChange = async (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const customerId = event.target.value
    setSelectedCustomerId(customerId)

    if (!customerId) {
      setData(null)
      setLoadingStatement(false)
      return
    }

    try {
      setLoadingStatement(true)
      setError(null)

      const statementData = await fetchCustomerStatement(customerId)

      setStatement(statementData)
      setData({
        totalSales: statementData.summary.totalSales,
        outstandingBalance: statementData.summary.outstandingBalance,
        invoicesCount: statementData.invoices.length,
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'حدث خطأ غير متوقع أثناء جلب البيانات.'
      setError(message)
    } finally {
      setLoadingStatement(false)
    }
  }

  const handleSettleInvoice = async (invoiceId: string) => {
    if (!selectedCustomerId) return

    try {
      setSettlingInvoiceId(invoiceId)
      setError(null)

      await settleInvoice(invoiceId)

      // Re-fetch statement after successful settlement
      const statementData = await fetchCustomerStatement(selectedCustomerId)

      setStatement(statementData)
      setData({
        totalSales: statementData.summary.totalSales,
        outstandingBalance: statementData.summary.outstandingBalance,
        invoicesCount: statementData.invoices.length,
      })
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'حدث خطأ أثناء تسوية الفاتورة.'
      setError(message)
    } finally {
      setSettlingInvoiceId(null)
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'مسددة'
      case 'UNPAID':
        return 'غير مسددة'
      case 'CANCELLED':
        return 'ملغاة'
      default:
        return status
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800'
      case 'UNPAID':
        return 'bg-orange-100 text-orange-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">لوحة التحكم</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Global loading state */}
        {isLoading && (
          <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            جاري تحميل بيانات لوحة التحكم...
          </div>
        )}
        {/* Customer Selector */}
        <section className="flex flex-col gap-3">
          <label
            htmlFor="customer"
            className="text-sm font-medium text-gray-700 flex items-center gap-2"
          >
            <Icon name="person" className="text-gray-500 text-xl" />
            اختر العميل
          </label>
          <select
            id="customer"
            className="max-w-md rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={selectedCustomerId ?? ''}
            onChange={handleCustomerChange}
            disabled={loadingCustomers || customers.length === 0}
          >
            {loadingCustomers && (
              <option value="">جاري تحميل قائمة العملاء...</option>
            )}
            {!loadingCustomers && customers.length === 0 && (
              <option value="">لا توجد عملاء</option>
            )}
            {!loadingCustomers &&
              customers.length > 0 &&
              customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} {customer.storeName && `— ${customer.storeName}`}
                </option>
              ))}
          </select>

          {!loadingCustomers && customers.length === 0 && (
            <p className="text-xs text-gray-500 mt-1">
              لا توجد عملاء مسجلون حتى الآن. أضف عملاء من نظام الخلفية لعرض بياناتهم هنا.
            </p>
          )}
        </section>

        {/* Error State */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {/* إجمالي المبيعات */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المبيعات</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalSalesDisplay}
                </p>
                {isLoading && (
                  <p className="mt-1 text-xs text-gray-400">جاري تحميل البيانات...</p>
                )}
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Icon name="payments" className="text-blue-600 text-2xl" />
              </div>
            </div>
          </div>

          {/* الرصيد المستحق */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الرصيد غير المسدد</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {outstandingBalanceDisplay}
                </p>
                {isLoading && (
                  <p className="mt-1 text-xs text-gray-400">جاري تحميل البيانات...</p>
                )}
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <Icon
                  name="account_balance_wallet"
                  className="text-orange-600 text-2xl"
                />
              </div>
            </div>
          </div>

          {/* عدد الفواتير */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الفواتير</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {invoicesCountDisplay}
                </p>
                {isLoading && (
                  <p className="mt-1 text-xs text-gray-400">جاري تحميل البيانات...</p>
                )}
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <Icon name="receipt" className="text-green-600 text-2xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Invoice Table */}
        {statement && (
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mt-2">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">الفواتير</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      التاريخ
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الحالة
                    </th>
                    <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      المبلغ الإجمالي
                    </th>
                    <th className="px-6 py-3.5 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      الإجراء
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {statement.invoices.length === 0 && !isLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        لا توجد فواتير لهذا العميل.
                      </td>
                    </tr>
                  )}

                  {statement.invoices.length === 0 && isLoading && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-6 py-8 whitespace-nowrap text-sm text-gray-500 text-center"
                      >
                        جاري تحميل الفواتير...
                      </td>
                    </tr>
                  )}

                  {statement.invoices.length > 0 &&
                    statement.invoices.map((invoice) => (
                      <tr key={invoice.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4.5 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(invoice.createdAt)}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              invoice.status,
                            )}`}
                          >
                            {getStatusLabel(invoice.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(invoice.totalAmount)}
                        </td>
                        <td className="px-6 py-4.5 whitespace-nowrap text-center text-sm">
                          {invoice.status === 'UNPAID' && (
                            <button
                              onClick={() => handleSettleInvoice(invoice.id)}
                              disabled={
                                settlingInvoiceId === invoice.id ||
                                settlingInvoiceId !== null
                              }
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {settlingInvoiceId === invoice.id
                                ? 'جاري التسوية...'
                                : 'تسوية'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

