'use client'

import { useEffect, useState } from 'react'
import { fetchStorePlan, StorePlan } from '@/lib/api'

/**
 * useBilling Hook
 *
 * B1: Fetches and exposes billing plan information for the current store.
 * This is read-only - no mutations, no payments, no billing logic.
 */
export function useBilling() {
  const [plan, setPlan] = useState<StorePlan | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadPlan() {
      try {
        setLoading(true)
        setError(null)

        const planData = await fetchStorePlan()

        if (!isMounted) return

        setPlan(planData)
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

    loadPlan()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    plan,
    loading,
    error,
  }
}

