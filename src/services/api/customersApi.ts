import { ApiClientError, apiClient, getErrorMessage } from './httpClient'
import { normalizeCustomer } from './normalizers'
import type { CustomerSummary } from './types'

export async function updateMyLocation(location: { locationAddress: string; latitude: number | null; longitude: number | null; country?: string; region?: string; city?: string }): Promise<void> {
  try {
    await apiClient.put('/api/v1/customers/my/location', {
      ...location,
      locationAddress: [location.city, location.region, location.country].join(', '),
    })
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 400) {
      throw new Error('Enter a location and a valid coordinate pair.', { cause: error })
    }
    throw new Error(getErrorMessage(error, 'Could not save your location.'), { cause: error })
  }
}

export async function searchCustomers(query: string): Promise<CustomerSummary[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  try {
    const { data } = await apiClient.get<Array<Record<string, unknown>> | { content?: Array<Record<string, unknown>> }>(
      '/api/v1/customers/search',
      { params: { q: trimmed, page: 0, size: 50 } },
    )
    const customers = Array.isArray(data) ? data : data.content ?? []
    return customers.map(normalizeCustomer)
  } catch {
    return []
  }
}

export async function addCustomerToBusiness(businessId: number, customer: { name: string; phone: string; email?: string }): Promise<{ ok: boolean; message?: string }> {
  try {
    const profileResponse = await apiClient.post<Record<string, unknown>>('/api/v1/customers', customer)
    if (!profileResponse.data.id) return { ok: false, message: 'Could not create the customer profile.' }

    await apiClient.post('/api/v1/business-customers', {
      businessId,
      customerProfileId: Number(profileResponse.data.id),
      status: 'ACTIVE',
    })
    return { ok: true }
  } catch (error) {
    if (error instanceof ApiClientError && error.status && error.status >= 400) {
      return { ok: false, message: error.message || 'Could not add this customer.' }
    }
    return { ok: false, message: getErrorMessage(error, 'Could not add this customer.') }
  }
}
