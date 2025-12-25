export function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-EG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value

  return date.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// B2: Format price from cents
export function formatPriceFromCents(priceCents: number, currency: string = 'USD'): string {
  const amount = priceCents / 100
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// B2: Format billing cycle label
export function formatBillingCycle(cycle: 'MONTHLY' | 'YEARLY'): string {
  return cycle === 'MONTHLY' ? 'شهري' : 'سنوي'
}


