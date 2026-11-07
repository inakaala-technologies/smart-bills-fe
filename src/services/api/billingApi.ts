import { apiClient, getErrorMessage } from './httpClient'
import { normalizeInvoice } from './normalizers'
import type { InvoiceCreateRequest, InvoiceSummary } from './types'

export async function createInvoice(payload: InvoiceCreateRequest): Promise<{ ok: boolean; invoice?: InvoiceSummary; message?: string }> {
  try {
    const { data } = await apiClient.post<Record<string, unknown>>('/api/v1/billing/invoices', payload)
    return { ok: true, invoice: normalizeInvoice(data), message: 'Invoice generated successfully.' }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Failed to generate invoice.') }
  }
}

export async function updateInvoiceStatus(invoiceId: number, status: 'SENT' | 'PAID'): Promise<{ ok: boolean; invoice?: InvoiceSummary; message?: string }> {
  try {
    const { data } = await apiClient.patch<Record<string, unknown>>(`/api/v1/billing/invoices/${invoiceId}/status`, { status })
    return { ok: true, invoice: normalizeInvoice(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update invoice status.') }
  }
}

export type BusinessProduct = {
  id: number
  businessId: number
  name: string
  sku?: string | null
  description?: string | null
  hsnCode?: string | null
  price: number
  gstRate: number | null
  unit: string
  status: 'ACTIVE' | 'INACTIVE'
}

export type ProductPayload = {
  businessId: number
  name: string
  sku?: string
  description?: string
  hsnCode?: string
  price: number
  gstRate: number
  unit: string
}

export async function getBusinessProducts(
  businessId: number,
): Promise<{ ok: boolean; products: BusinessProduct[]; message?: string }> {
  try {
    const { data } = await apiClient.get<BusinessProduct[]>(
      '/api/v1/billing/products',
      { params: { businessId } },
    )
    return { ok: true, products: data }
  } catch (error) {
    return {
      ok: false,
      products: [],
      message: getErrorMessage(error, 'Failed to load products.'),
    }
  }
}

export async function createBusinessProduct(
  payload: ProductPayload,
): Promise<{ ok: boolean; product?: BusinessProduct; message?: string }> {
  try {
    const { data } = await apiClient.post<BusinessProduct>(
      '/api/v1/billing/products',
      payload,
    )
    return { ok: true, product: data }
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to save product.'),
    }
  }
}

export async function updateBusinessProduct(
  productId: number,
  payload: Partial<Omit<ProductPayload, 'businessId'>>,
): Promise<{ ok: boolean; product?: BusinessProduct; message?: string }> {
  try {
    const { data } = await apiClient.put<BusinessProduct>(
      `/api/v1/billing/products/${productId}`,
      payload,
    )
    return { ok: true, product: data }
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to update product.'),
    }
  }
}

export async function deactivateBusinessProduct(
  productId: number,
): Promise<{ ok: boolean; product?: BusinessProduct; message?: string }> {
  try {
    const { data } = await apiClient.patch<BusinessProduct>(
      `/api/v1/billing/products/${productId}/deactivate`,
    )
    return { ok: true, product: data }
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Failed to deactivate product.'),
    }
  }
}

export type BillCategory = {
    id: number
    code: string
    name: string
  }

export type InsuranceCatalogType =
    | 'health'
    | 'cyber'
    | 'car'
    | 'two-wheeler'
    | 'commercial-vehicle'
    | 'home'
    | 'travel'
    | 'life'
    | 'personal-accident'
    | 'other'

export function getInsuranceCatalogType(providerName: string): InsuranceCatalogType {
    const name = providerName.trim().toLowerCase()
    if (name.includes('personal accident')) return 'personal-accident'
    if (name.includes('commercial vehicle')) return 'commercial-vehicle'
    if (name.includes('two wheeler') || name.includes('two-wheeler')) return 'two-wheeler'
    if (name.includes('health')) return 'health'
    if (name.includes('cyber')) return 'cyber'
    if (name.includes('travel')) return 'travel'
    if (name.includes('home')) return 'home'
    if (name.includes('car')) return 'car'
    if (/\blife\b/.test(name)) return 'life'
    return 'other'
  }

export type BillProvider = {
    id: number
    code: string
    name: string
    categoryCode: string
    categoryName: string
  }

export type ProviderInputField = {
    fieldKey: string
    label: string
    inputType: string
    required: boolean
    placeholder: string | null
    helpText: string | null
    displayOrder: number
  }

export type ProviderFetchResponse = {
    format: string
    contentType: string | null
    jsonData: unknown
    xmlData: string | null
    pdfData: string | null
  }

export type CustomerBillConsentRequest = {
    providerCode: string
    requestedDataFields: string[]
    purposeCode: string
    statementVersion: string
    accepted: true
  }

export type CustomerBillConsentResponse = {
    consentRecordId: string
    providerCode: string
    providerName: string
    requestedDataFields: string[]
    purposeCode: string
    statementVersion: string
    statementHash: string
    status: string
    acceptedAt: string
    revokedAt: string | null
    savedBillId: number | null
    createdAt: string
    updatedAt: string
  }

export type SavedBill = {
    id: number
    providerCode: string
    providerName: string
    categoryCode: string
    consumerNumber: string | null
    providerInputs: Record<string, string>
    responseFormat: string | null
    contentType: string | null
    jsonData: unknown
    xmlData: string | null
    pdfAvailable: boolean
    fetchedAt: string | null
    createdAt: string
    updatedAt: string
  }

export type SavedBillPage = {
    content: SavedBill[]
    totalElements: number
    totalPages: number
    number: number
    size: number
  }

export async function fetchBillCatalog(): Promise<BillCategory[]> {
    const { data } = await apiClient.get<BillCategory[]>('/api/v1/bills/categories')
    return data
  }

export async function fetchBillProviders(categoryCode: string): Promise<BillProvider[]> {
    const { data } = await apiClient.get<BillProvider[]>('/api/v1/bills/providers', {
      params: { category: categoryCode },
    })
    return data
  }

export async function fetchProviderFields(providerCode: string): Promise<ProviderInputField[]> {
    const { data } = await apiClient.get<ProviderInputField[]>(
      `/api/v1/bills/providers/${encodeURIComponent(providerCode)}/fields`,
    )
    return data
  }

export async function acceptCustomerBillConsent(
    payload: CustomerBillConsentRequest,
  ): Promise<CustomerBillConsentResponse> {
    const { data } = await apiClient.post<CustomerBillConsentResponse>(
      '/api/v1/bills/consents',
      payload,
    )
    if (!data || typeof data.consentRecordId !== 'string' || !data.consentRecordId.trim()
      || data.status !== 'ACCEPTED') {
      throw new Error('The consent service did not confirm acceptance.')
    }
    return data
  }

export async function submitBillFetch(
    providerCode: string,
    providerInputs: Record<string, string>,
    applicationConsentRecordId: string,
    consentArtifact?: Record<string, unknown>,
  ): Promise<ProviderFetchResponse> {
    const { data } = await apiClient.post<ProviderFetchResponse>('/api/v1/bills/fetch', {
      providerCode,
      providerInputs,
      applicationConsentRecordId,
      ...(consentArtifact ? { consentArtifact } : {}),
    })
    return data
  }

export async function fetchSavedBills(category?: string, page = 0, size = 20): Promise<SavedBillPage> {
    const { data } = await apiClient.get<SavedBillPage>('/api/v1/bills/saved', {
      params: { ...(category ? { category } : {}), page, size },
    })
    return data
  }

export async function fetchSavedBill(id: number): Promise<SavedBill> {
    const { data } = await apiClient.get<SavedBill>(`/api/v1/bills/saved/${id}`)
    return data
  }

export async function fetchSavedBillPdf(id: number): Promise<Blob> {
    const { data } = await apiClient.get<Blob>(`/api/v1/bills/saved/${id}/pdf`, {
      responseType: 'blob',
    })
    return data
  }
