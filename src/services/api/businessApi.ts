import { apiClient, getErrorMessage } from './httpClient'
import { normalizeBusiness } from './normalizers'
import { normalizeOfferAsset } from './offerNormalizers'
import type { BusinessCreateRequest, BusinessInsights, BusinessOffer, BusinessSummary } from './types'

export async function fetchBusinessOffers(businessId: number): Promise<BusinessOffer[]> {
  const { data } = await apiClient.get<BusinessOffer[]>(`/api/v1/businesses/${businessId}/offers`)
  // The backend sends the file as `attachmentUrl`; map it to `imageUrl`.
  return data.map(normalizeOfferAsset)
}

export async function createBusinessOffer(
  businessId: number,
  offer: Omit<BusinessOffer, 'id' | 'businessId' | 'active' | 'imageUrl' | 'attachmentType'>,
  image?: File | null,
): Promise<BusinessOffer> {
  try {
    const url = `/api/v1/businesses/${businessId}/offers`

    // No file: plain JSON request, same as before.
    if (!image) {
      return normalizeOfferAsset((await apiClient.post<BusinessOffer>(url, offer)).data)
    }

    // With a file: send multipart.
    const formData = new FormData()
    formData.append(
      'offer',
      new Blob([JSON.stringify(offer)], { type: 'application/json' }),
    )
    formData.append('image', image)

    const { data } = await apiClient.post<BusinessOffer>(url, formData, {
        timeout: 60000,
        // If apiClient defaults to "Content-Type: application/json", axios would
        // serialize this FormData to JSON and the file would be lost. Declaring
        // multipart here overrides that default; the browser still adds the
        // boundary automatically.
        headers: { 'Content-Type': 'multipart/form-data' },
      })

    return normalizeOfferAsset(data)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not publish this offer.'), { cause: error })
  }
}

export async function deactivateBusinessOffer(businessId: number, offerId: number): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/businesses/${businessId}/offers/${offerId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not remove this offer.'), { cause: error })
  }
}

export async function fetchBusinessInsights(businessId: number, months = 6): Promise<BusinessInsights> {
  const { data } = await apiClient.get<BusinessInsights>(`/api/v1/businesses/${businessId}/insights`, { params: { months } })
  return data
}

export async function fetchBusinessById(businessId: number): Promise<BusinessSummary | null> {
  try {
    const { data } = await apiClient.get<Record<string, unknown>>(`/api/v1/businesses/${businessId}`)
    return normalizeBusiness(data)
  } catch {
    return null
  }
}

export async function setBusinessMembershipsEnabled(businessId: number, enabled: boolean): Promise<{ ok: boolean; business?: BusinessSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/businesses/${businessId}/memberships-enabled`, undefined, { params: { enabled } })
    return { ok: true, business: normalizeBusiness(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update membership availability.') }
  }
}

export async function createBusiness(payload: BusinessCreateRequest): Promise<{ ok: boolean; business?: BusinessSummary; message?: string }> {
  try {
    const { data } = await apiClient.post<Record<string, unknown>>('/api/v1/businesses', payload)
    return { ok: true, business: normalizeBusiness(data), message: 'Business created successfully.' }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Failed to create business.') }
  }
}