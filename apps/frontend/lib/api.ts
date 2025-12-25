export interface CustomerSummary {
  id: string
  name: string
  isGuest: boolean
  storeName: string
}

export interface CustomerStatementSummary {
  totalInvoices: number
  unpaidInvoices: number
  paidInvoices: number
  cancelledInvoices: number
  outstandingBalance: number
  totalSales: number
  totalAmount: number
}

export interface CustomerStatement {
  summary: CustomerStatementSummary
  invoices: Array<{
    id: string
    status: string
    totalAmount: number
    createdAt: string
  }>
}

export interface StatementResponse {
  success: boolean
  data?: CustomerStatement
  error?: {
    code: string
    message: string
  }
}

interface CustomersResponse {
  success: boolean
  data?: CustomerSummary[]
  error?: {
    code: string
    message: string
  }
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  if (!baseUrl) {
    throw new Error('إعدادات الاتصال غير مكتملة. تأكد من ضبط متغيرات البيئة.')
  }

  return baseUrl.replace(/\/$/, '')
}

export async function fetchCustomers(): Promise<CustomerSummary[]> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/customers`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب قائمة العملاء من الخادم.')
  }

  const body = (await res.json()) as CustomersResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب قائمة العملاء.'
    throw new Error(message)
  }

  return body.data
}

export async function fetchCustomerStatement(
  customerId: string,
): Promise<CustomerStatement> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/customers/${customerId}/statement`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب بيانات العميل من الخادم.')
  }

  const body = (await res.json()) as StatementResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب كشف حساب العميل.'
    throw new Error(message)
  }

  return body.data
}

interface SettleResponse {
  success: boolean
  data?: {
    invoiceId: string
    previousStatus: string
    currentStatus: string
    settledAt: string
  }
  error?: {
    code: string
    message: string
  }
}

export async function settleInvoice(invoiceId: string): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices/${invoiceId}/settle`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = (await res.json()) as SettleResponse
    const message = body.error?.message || 'فشل تسوية الفاتورة.'
    throw new Error(message)
  }

  const body = (await res.json()) as SettleResponse

  if (!body.success) {
    const message = body.error?.message || 'فشل تسوية الفاتورة.'
    throw new Error(message)
  }
}

export interface LedgerEntry {
  id: string
  type: 'SALE' | 'RECEIPT'
  amount: number
  createdAt: string
}

interface LedgerResponse {
  success: boolean
  data?: LedgerEntry[]
  error?: {
    code: string
    message: string
  }
}

export async function fetchLedgerEntries(
  storeId: string,
  operatorId: string,
  fromDate?: string,
  toDate?: string,
): Promise<LedgerEntry[]> {
  const baseUrl = getApiBaseUrl()
  const params = new URLSearchParams({
    storeId,
    operatorId,
  })

  if (fromDate) {
    params.append('fromDate', fromDate)
  }

  if (toDate) {
    params.append('toDate', toDate)
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
    throw new Error('تعذر جلب بيانات السجل المالي من الخادم.')
  }

  const body = (await res.json()) as LedgerResponse | LedgerEntry[]

  // Handle both response formats:
  // 1. Wrapped response: { success: true, data: [...] }
  // 2. Direct array: [...]
  if (Array.isArray(body)) {
    return body
  }

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب بيانات السجل المالي.'
    throw new Error(message)
  }

  return body.data
}

// B1: Billing API
export interface StorePlan {
  plan: {
    code: string
    name: string
    description?: string
  }
  limits: {
    invoicesPerMonth?: number
    users?: number
    [key: string]: number | undefined
  }
  features: {
    ledger?: boolean
    reports?: boolean
    [key: string]: boolean | undefined
  }
  usage: {
    invoicesThisMonth: number
    usersCount: number
    [key: string]: number
  }
}

interface BillingResponse {
  success: boolean
  data?: StorePlan
  error?: {
    code: string
    message: string
  }
}

export async function fetchStorePlan(): Promise<StorePlan> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/billing/plan`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب معلومات الخطة من الخادم.')
  }

  const body = (await res.json()) as BillingResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب معلومات الخطة.'
    throw new Error(message)
  }

  return body.data
}

// B2: Pricing API
export interface StorePricing {
  plan: string
  pricing: Array<{
    cycle: 'MONTHLY' | 'YEARLY'
    priceCents: number
    currency: string
  }>
}

interface PricingResponse {
  success: boolean
  data?: StorePricing
  error?: {
    code: string
    message: string
  }
}

export async function fetchStorePricing(): Promise<StorePricing> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/billing/pricing`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب معلومات الأسعار من الخادم.')
  }

  const body = (await res.json()) as PricingResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب معلومات الأسعار.'
    throw new Error(message)
  }

  return body.data
}