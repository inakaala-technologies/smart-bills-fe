import type { AxiosRequestConfig } from 'axios'
import { apiClient, getErrorMessage } from './httpClient'

export type ReceiptLinkToken = {
  token: string
  expiresAt: string
}

export type ReceiptDeliveryPreference = {
  contactMatchingEnabled: boolean
  emailAvailable: boolean
  phoneAvailable: boolean
  emailEnabled: boolean
  phoneEnabled: boolean
}

export type CustomerReceiptLineItem = {
  productName: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export type CustomerReceipt = {
  id: number
  receiptNumber: string
  retailerName: string
  outletName: string
  transactionAt: string
  currency: string
  totalAmount: number
  items: CustomerReceiptLineItem[]
}

export async function fetchCustomerReceipts(): Promise<CustomerReceipt[]> {
  const requestConfig: AxiosRequestConfig & { skipCache: boolean } = { skipCache: true }
  const { data } = await apiClient.get<CustomerReceipt[]>('/api/v1/customer/receipts', requestConfig)
  return data
}

export async function fetchReceiptDeliveryPreference(): Promise<ReceiptDeliveryPreference> {
  const requestConfig: AxiosRequestConfig & { skipCache: boolean } = { skipCache: true }
  const { data } = await apiClient.get<ReceiptDeliveryPreference>(
    '/api/v1/customer/receipts/preferences',
    requestConfig,
  )
  return data
}

export async function updateReceiptDeliveryPreference(
  emailEnabled: boolean,
  phoneEnabled: boolean,
): Promise<ReceiptDeliveryPreference> {
  const { data } = await apiClient.put<ReceiptDeliveryPreference>(
    '/api/v1/customer/receipts/preferences',
    { emailEnabled, phoneEnabled },
  )
  return data
}

export async function createReceiptLinkToken(): Promise<{
  ok: boolean
  token?: ReceiptLinkToken
  message?: string
}> {
  try {
    const { data } = await apiClient.post<ReceiptLinkToken>(
      '/api/v1/customer/receipt-link-tokens',
    )
    return { ok: true, token: data }
  } catch (error) {
    return {
      ok: false,
      message: getErrorMessage(error, 'Could not create a receipt QR code.'),
    }
  }
}
