'use client'

import { useEffect, useState } from 'react'
import { fetchStorePlan, fetchStorePricing, StorePlan, StorePricing } from '@/lib/api'

/**
 * useBilling Hook
 *
 * B1: Fetches and exposes billing plan information for the current store.
 * B2: Extended with pricing information.
 * This is read-only - no mutations, no payments, no billing logic.
 */
export function useBilling() {
  const [plan, setPlan] = useState<StorePlan | null>(null)
  const [pricing, setPricing] = useState<StorePricing | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadBilling() {
      try {
        setLoading(true)
        setError(null)

        // Load plan and pricing in parallel
        const [planData, pricingData] = await Promise.all([
          fetchStorePlan(),
          fetchStorePricing(),
        ])

        if (!isMounted) return

        setPlan(planData)
        setPricing(pricingData)
      } catch (err) {
        if (!isMounted) return

        const message = err instanceof Error ? err.message : 'فشل جلب معلومات الخطة.'
        setError(message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadBilling()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    plan,
    pricing,
    loading,
    error,
  }
}

