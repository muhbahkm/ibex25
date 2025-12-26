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

export async function settleInvoice(
  invoiceId: string,
  userId: string,
  storeId: string,
  role: string,
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices/${invoiceId}/settle`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    body: JSON.stringify({
      operatorContext: {
        operatorId: userId,
        storeId: storeId,
      },
    }),
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

export interface Invoice {
  id: string
  customerName: string | null
  totalAmount: string
  status: 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED'
  createdAt: string
}

interface InvoicesResponse {
  success: boolean
  data?: Invoice[]
  error?: {
    code: string
    message: string
  }
}

export async function fetchInvoices(
  userId: string,
  storeId: string,
  role: string,
): Promise<Invoice[]> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب قائمة الفواتير من الخادم.')
  }

  const body = (await res.json()) as InvoicesResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب قائمة الفواتير.'
    throw new Error(message)
  }

  return body.data
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

// Products API
export interface Product {
  id: string
  name: string
  price: string
}

interface ProductsResponse {
  success: boolean
  data?: Product[]
  error?: {
    code: string
    message: string
  }
}

export async function fetchProducts(
  userId: string,
  storeId: string,
  role: string,
): Promise<Product[]> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/products`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب قائمة المنتجات من الخادم.')
  }

  const body = (await res.json()) as ProductsResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب قائمة المنتجات.'
    throw new Error(message)
  }

  return body.data
}

// Invoice Detail API
export interface InvoiceDetail {
  id: string
  customerId: string | null
  customerName: string | null
  status: 'DRAFT' | 'ISSUED' | 'UNPAID' | 'PAID' | 'CANCELLED'
  totalAmount: string
  createdAt: string
  items: Array<{
    id: string
    productId: string
    productName: string
    quantity: number
    unitPrice: string
  }>
}

interface InvoiceDetailResponse {
  success: boolean
  data?: InvoiceDetail
  error?: {
    code: string
    message: string
  }
}

export async function fetchInvoice(
  invoiceId: string,
  userId: string,
  storeId: string,
  role: string,
): Promise<InvoiceDetail> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices/${invoiceId}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error('تعذر جلب بيانات الفاتورة من الخادم.')
  }

  const body = (await res.json()) as InvoiceDetailResponse

  if (!body.success || !body.data) {
    const message = body.error?.message || 'فشل جلب بيانات الفاتورة.'
    throw new Error(message)
  }

  return body.data
}

// Create Invoice API
interface CreateInvoiceRequest {
  storeId: string
  createdBy: string
  customerId: string | null
  items: Array<{
    productId: string
    quantity: number
  }>
  operatorContext: {
    operatorId: string
    storeId: string
  }
}

interface CreateInvoiceResponse {
  success: boolean
  data?: {
    id: string
    status: string
    [key: string]: unknown
  }
  error?: {
    code: string
    message: string
  }
}

export async function createInvoice(
  customerId: string | null,
  items: Array<{ productId: string; quantity: number }>,
  userId: string,
  storeId: string,
  role: string,
): Promise<string> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices`

  const body: CreateInvoiceRequest = {
    storeId,
    createdBy: userId,
    customerId,
    items,
    operatorContext: {
      operatorId: userId,
      storeId,
    },
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorBody = (await res.json()) as CreateInvoiceResponse
    const message = errorBody.error?.message || 'فشل إنشاء الفاتورة.'
    throw new Error(message)
  }

  const responseBody = (await res.json()) as CreateInvoiceResponse

  if (!responseBody.success || !responseBody.data) {
    const message = responseBody.error?.message || 'فشل إنشاء الفاتورة.'
    throw new Error(message)
  }

  return responseBody.data.id
}

// Update Invoice Draft API
interface UpdateInvoiceDraftRequest {
  customerId?: string | null
  items?: Array<{
    productId: string
    quantity: number
  }>
  operatorContext: {
    operatorId: string
    storeId: string
  }
}

interface UpdateInvoiceDraftResponse {
  success: boolean
  data?: {
    id: string
    [key: string]: unknown
  }
  error?: {
    code: string
    message: string
  }
}

export async function updateInvoiceDraft(
  invoiceId: string,
  customerId: string | null | undefined,
  items: Array<{ productId: string; quantity: number }> | undefined,
  userId: string,
  storeId: string,
  role: string,
): Promise<void> {
  const baseUrl = getApiBaseUrl()
  const url = `${baseUrl}/invoices/${invoiceId}/draft`

  const body: UpdateInvoiceDraftRequest = {
    operatorContext: {
      operatorId: userId,
      storeId,
    },
  }

  if (customerId !== undefined) {
    body.customerId = customerId
  }

  if (items !== undefined) {
    body.items = items
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': userId,
      'x-store-id': storeId,
      'x-role': role,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!res.ok) {
    const errorBody = (await res.json()) as UpdateInvoiceDraftResponse
    const message = errorBody.error?.message || 'فشل تحديث الفاتورة.'
    throw new Error(message)
  }

  const responseBody = (await res.json()) as UpdateInvoiceDraftResponse

  if (!responseBody.success) {
    const message = responseBody.error?.message || 'فشل تحديث الفاتورة.'
    throw new Error(message)
  }
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