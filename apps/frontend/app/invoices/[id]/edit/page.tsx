'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
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
import {
  Button,
  LoadingState,
  EmptyState,
  ErrorMessage,
  StatusBadge,
} from '@/components/ui'
import Icon from '@/components/Icon'

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
          <Button variant="secondary" size="md" onClick={handleCancel}>
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
            <h1 className="text-page-title mb-2">تعديل الفاتورة</h1>
            <p className="text-muted">الفاتورة #{invoice.id}</p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-body text-yellow-800">
              لا يمكن تعديل فاتورة بعد إصدارها. الفواتير المصدرة لا يمكن تعديلها.
            </p>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" size="md" onClick={handleCancel}>
              <Icon name="arrow_back" />
              <span>العودة إلى القائمة</span>
            </Button>
          </div>
        </div>
      </RequirePermission>
    )
  }

  return (
    <RequirePermission permission={Permission.ISSUE_INVOICE}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-page-title mb-2">تعديل الفاتورة</h1>
          <div className="flex items-center gap-4">
            <p className="text-muted">الفاتورة #{invoice.id}</p>
            <StatusBadge status={invoice.status} />
          </div>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Invoice Form Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
          {/* Customer Selection */}
          <div className="p-6">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              العميل (اختياري)
            </label>
            <select
              value={selectedCustomerId || ''}
              onChange={(e) =>
                setSelectedCustomerId(e.target.value || null)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-body"
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
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-section-title">العناصر</h2>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddItem}
                disabled={products.length === 0}
                className="gap-2"
              >
                <Icon name="add" />
                <span>إضافة عنصر</span>
              </Button>
            </div>

            {items.length === 0 ? (
              <EmptyState
                message="لا توجد عناصر"
                description="اضغط على 'إضافة عنصر' لبدء إضافة العناصر إلى الفاتورة"
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          المنتج
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الكمية
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          سعر الوحدة
                        </th>
                        <th className="px-6 py-3.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجمالي
                        </th>
                        <th className="px-6 py-3.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={item.productId}
                              onChange={(e) =>
                                handleItemChange(index, 'productId', e.target.value)
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-body"
                            >
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 text-body"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-numeric">
                              {formatCurrency(Number(item.unitPrice))} ر.س
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-numeric">
                              {formatCurrency(
                                calculateLineTotal(item.quantity, item.unitPrice),
                              )}{' '}
                              ر.س
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="inline-flex items-center gap-1.5 text-sm text-danger-600 hover:text-danger-700 transition-colors"
                            >
                              <Icon name="delete" className="text-base" />
                              <span>حذف</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-section-title">الإجمالي:</span>
              <span className="text-section-title text-numeric">
                {formatCurrency(calculateTotal())} ر.س
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="p-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={handleCancel}
              disabled={isSaving}
            >
              إلغاء
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              disabled={isSaving || items.length === 0}
              isLoading={isSaving}
              className="gap-2"
            >
              {!isSaving && <Icon name="save" />}
              <span>حفظ مسودة</span>
            </Button>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

