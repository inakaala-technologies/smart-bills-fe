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
