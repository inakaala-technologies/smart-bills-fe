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
