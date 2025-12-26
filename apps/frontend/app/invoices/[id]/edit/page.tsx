'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RequirePermission } from '@/auth/RequirePermission'
import { useAuth } from '@/auth/useAuth'
import {
  fetchCustomers,
  fetchProducts,
  fetchInvoice,
  updateInvoiceDraft,
  CustomerSummary,
  Product,
  InvoiceDetail,
} from '@/lib/api'
import { formatCurrency } from '@/lib/format'

interface InvoiceItem {
  productId: string
  quantity: number
  productName: string
  unitPrice: string
}

export default function EditInvoicePage() {
  const router = useRouter()
  const params = useParams()
  const invoiceId = params.id as string
  const { user } = useAuth()
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  )
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const [customersData, productsData, invoiceData] = await Promise.all([
          fetchCustomers(),
          fetchProducts(user.id, user.storeId, user.role),
          fetchInvoice(invoiceId, user.id, user.storeId, user.role),
        ])

        if (!isMounted) return

        setCustomers(customersData)
        setProducts(productsData)
        setInvoice(invoiceData)

        // Check if invoice is DRAFT
        if (invoiceData.status !== 'DRAFT') {
          setError('لا يمكن تعديل فاتورة بعد إصدارها.')
          return
        }

        setSelectedCustomerId(invoiceData.customerId)
        setItems(
          invoiceData.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            productName: item.productName,
            unitPrice: item.unitPrice,
          })),
        )
      } catch (err) {
        if (!isMounted) return
        const message =
          err instanceof Error ? err.message : 'فشل تحميل البيانات.'
        setError(message)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [invoiceId, user.id, user.storeId, user.role])

  const handleAddItem = () => {
    if (products.length === 0) return

    const firstProduct = products[0]
    setItems([
      ...items,
      {
        productId: firstProduct.id,
        quantity: 1,
        productName: firstProduct.name,
        unitPrice: firstProduct.price,
      },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleItemChange = (
    index: number,
    field: 'productId' | 'quantity',
    value: string | number,
  ) => {
    const newItems = [...items]
    const item = newItems[index]

    if (field === 'productId') {
      const product = products.find((p) => p.id === value)
      if (product) {
        item.productId = product.id
        item.productName = product.name
        item.unitPrice = product.price
      }
    } else {
      item.quantity = Number(value) || 1
    }

    setItems(newItems)
  }

  const calculateLineTotal = (quantity: number, unitPrice: string): number => {
    return quantity * Number(unitPrice)
  }

  const calculateTotal = (): number => {
    return items.reduce(
      (sum, item) => sum + calculateLineTotal(item.quantity, item.unitPrice),
      0,
    )
  }

  const handleSave = async () => {
    if (!invoice || invoice.status !== 'DRAFT') {
      setError('لا يمكن تعديل فاتورة بعد إصدارها.')
      return
    }

    if (items.length === 0) {
      setError('يجب إضافة عنصر واحد على الأقل.')
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const invoiceItems = items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      }))

      await updateInvoiceDraft(
        invoiceId,
        selectedCustomerId,
        invoiceItems,
        user.id,
        user.storeId,
        user.role,
      )

      // Reload invoice data
      const updatedInvoice = await fetchInvoice(
        invoiceId,
        user.id,
        user.storeId,
        user.role,
      )
      setInvoice(updatedInvoice)
      setItems(
        updatedInvoice.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          productName: item.productName,
          unitPrice: item.unitPrice,
        })),
      )
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'فشل تحديث الفاتورة.'
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    router.push('/invoices')
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
                تعديل الفاتورة
              </h1>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                لا يمكن تعديل فاتورة بعد إصدارها
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={handleCancel}
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

  return (
    <RequirePermission permission="ISSUE_INVOICE">
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">تعديل الفاتورة</h1>
            <p className="text-sm text-gray-500 mt-1">
              الحالة: <span className="font-medium">مسودة</span>
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Customer Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                العميل (اختياري)
              </label>
              <select
                value={selectedCustomerId || ''}
                onChange={(e) =>
                  setSelectedCustomerId(e.target.value || null)
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">عميل نقدي</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Invoice Items */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">العناصر</h2>
                <button
                  onClick={handleAddItem}
                  disabled={products.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  إضافة عنصر
                </button>
              </div>

              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  لا توجد عناصر. اضغط "إضافة عنصر" لبدء إضافة العناصر.
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
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                handleItemChange(index, 'productId', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  'quantity',
                                  e.target.value,
                                )
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
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
                          <td className="px-4 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              حذف
                            </button>
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
                  {formatCurrency(calculateTotal())} ر.س
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || items.length === 0}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'جاري الحفظ...' : 'حفظ مسودة'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

