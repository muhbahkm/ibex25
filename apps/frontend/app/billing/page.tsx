'use client'

import { useEffect, useState } from 'react'
import { RequirePermission } from '@/auth/RequirePermission'
import { Permission } from '@/auth/roles'
import { useAuth } from '@/auth/useAuth'
import { useBilling } from '@/billing/useBilling'
import { fetchStorePlan, fetchStorePricing, StorePlan, StorePricing } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import {
  Button,
  LoadingState,
  ErrorMessage,
} from '@/components/ui'
import Icon from '@/components/Icon'

/**
 * Billing Page Component
 *
 * Displays current subscription plan, usage, limits, and pricing information.
 * Read-only view of billing status.
 */
export default function BillingPage() {
  const { user } = useAuth()
  const { plan: storePlan, loading: loadingPlan } = useBilling()
  const [pricing, setPricing] = useState<StorePricing | null>(null)
  const [isLoadingPricing, setIsLoadingPricing] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPricing() {
      try {
        setIsLoadingPricing(true)
        setError(null)

        const pricingData = await fetchStorePricing(user.id, user.storeId, user.role)

        if (!isMounted) return

        setPricing(pricingData)
      } catch (err) {
        if (!isMounted) return
      const message =
        err instanceof Error ? err.message : 'تعذر تحميل معلومات الأسعار'
      setError(message)
      } finally {
        if (isMounted) {
          setIsLoadingPricing(false)
        }
      }
    }

    loadPricing()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <RequirePermission permission={Permission.VIEW_REPORTS}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-page-title mb-2">إدارة الاشتراك</h1>
          <p className="text-muted">
            تفاصيل باقتك الحالية وحدود الاستخدام
          </p>
        </div>

        {/* Error State */}
        {error && <ErrorMessage message={error} />}

        {/* Current Plan Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-section-title mb-4">الخطة الحالية</h2>
          {loadingPlan ? (
            <LoadingState message="جاري تحميل معلومات الخطة..." />
          ) : storePlan ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">
                  اسم الخطة
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-semibold text-gray-900">
                    {storePlan.plan.name}
                  </p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    نشط
                  </span>
                </div>
                {storePlan.plan.description && (
                  <p className="text-body text-gray-600 mt-1">
                    {storePlan.plan.description}
                  </p>
                )}
              </div>

              {/* Limits */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  الحدود
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(storePlan.limits).map(([key, value]) => {
                    if (value === undefined) return null
                    const label = key === 'invoicesPerMonth' ? 'فواتير شهرياً' : key === 'users' ? 'مستخدمين' : key
                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-body text-gray-700">{label}</span>
                        <span className="text-body font-medium text-gray-900">{value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Usage */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  الاستخدام الحالي
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(storePlan.usage).map(([key, value]) => {
                    const label = key === 'invoicesThisMonth' ? 'فواتير هذا الشهر' : key === 'usersCount' ? 'عدد المستخدمين' : key
                    const limit = storePlan.limits[key as keyof typeof storePlan.limits]
                    const isOverLimit = limit !== undefined && value > limit
                    const percentage = limit ? Math.min(100, Math.round((value / limit) * 100)) : 0
                    
                    return (
                      <div key={key} className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{label}</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-sm font-bold ${isOverLimit ? 'text-red-600' : 'text-gray-900'}`}>
                              {value}
                            </span>
                            {limit !== undefined && (
                              <span className="text-xs text-gray-500">
                                / {limit}
                              </span>
                            )}
                          </div>
                        </div>
                        {limit !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                isOverLimit ? 'bg-red-500' : percentage > 80 ? 'bg-yellow-500' : 'bg-primary-500'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        )}
                        {limit !== undefined && percentage > 80 && (
                          <p className="text-xs text-amber-600 mt-2">
                            {percentage >= 100 ? 'لقد وصلت للحد الأقصى' : 'قاربت على الوصول للحد الأقصى'}
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Features */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3">
                  الميزات
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(storePlan.features).map(([key, value]) => {
                    const label = key === 'ledger' ? 'السجل المالي' : key === 'reports' ? 'التقارير' : key
                    return (
                      <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <span className="text-body text-gray-700">{label}</span>
                        <span className={`text-body font-medium ${value ? 'text-green-600' : 'text-gray-400'}`}>
                          {value ? 'مفعل' : 'غير مفعل'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-body text-gray-500">لا توجد معلومات خطة متاحة</p>
          )}
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-section-title mb-4">الأسعار</h2>
          {isLoadingPricing ? (
            <LoadingState message="جاري تحميل معلومات الأسعار..." />
          ) : pricing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pricing.pricing.map((price) => {
                  const cycleLabel = price.cycle === 'MONTHLY' ? 'شهري' : 'سنوي'
                  const priceValue = price.priceCents / 100
                  return (
                    <div
                      key={price.cycle}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-body font-medium text-gray-900">
                          {cycleLabel}
                        </span>
                        <span className="text-2xl font-semibold text-gray-900 text-numeric">
                          {formatCurrency(priceValue)} {price.currency}
                        </span>
                      </div>
                      {price.cycle === 'YEARLY' && (
                        <p className="text-xs text-gray-500 mt-2">
                          توفير {formatCurrency((priceValue / 12) * 2)} شهرياً
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="text-body text-gray-500">لا توجد معلومات أسعار متاحة</p>
          )}
        </div>

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-blue-600 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-body font-semibold text-blue-900 mb-1">
                هل تحتاج لمساعدة في خطتك؟
              </p>
              <p className="text-body text-blue-800">
                لتغيير الخطة أو تحديث معلومات الدفع، نحن هنا للمساعدة. يرجى التواصل مع فريق الدعم وسنقوم بذلك فوراً.
              </p>
            </div>
          </div>
        </div>
      </div>
    </RequirePermission>
  )
}

