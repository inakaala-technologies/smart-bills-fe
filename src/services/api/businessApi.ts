import { apiClient, getErrorMessage } from './httpClient'
import { normalizeBusiness } from './normalizers'
import type { BusinessCreateRequest, BusinessInsights, BusinessOffer, BusinessSummary } from './types'

export async function uploadBusinessBanner(businessId: number, file: File): Promise<BusinessSummary> {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const response = await apiClient.post<Partial<BusinessSummary> & Record<string, unknown>>(
      `/api/v1/businesses/${businessId}/banner`,
      formData,
      { timeout: 60000 },
    )
    return normalizeBusiness(response.data)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not upload the banner image.'), { cause: error })
  }
}

export async function fetchBusinessOffers(businessId: number): Promise<BusinessOffer[]> {
  return (await apiClient.get<BusinessOffer[]>(`/api/v1/businesses/${businessId}/offers`)).data
}

export async function createBusinessOffer(
  businessId: number,
  offer: Omit<BusinessOffer, 'id' | 'businessId' | 'active' | 'imageUrl' | 'attachmentType'>,
  image?: File | null,
): Promise<BusinessOffer> {
  try {
    const url = `/api/v1/businesses/${businessId}/offers`

    // No file: same JSON request as before, so existing behavior is unchanged.
    if (!image) {
      return (await apiClient.post<BusinessOffer>(url, offer)).data
    }

    // With a file: send multipart (needs the backend change).
    const formData = new FormData()
    formData.append(
      'offer',
      new Blob([JSON.stringify(offer)], { type: 'application/json' }),
    )
    formData.append('image', image)

    return (await apiClient.post<BusinessOffer>(url, formData, { timeout: 60000 })).data
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

export async function setBusinessHomeServicesEnabled(businessId: number, enabled: boolean): Promise<{ ok: boolean; business?: BusinessSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/businesses/${businessId}/home-services-enabled`, undefined, { params: { enabled } })
    return { ok: true, business: normalizeBusiness(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update home services.') }
  }
}

export async function setBusinessHomeVisitCharge(businessId: number, charge: number): Promise<{ ok: boolean; business?: BusinessSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/businesses/${businessId}/home-visit-charge`, undefined, { params: { charge } })
    return { ok: true, business: normalizeBusiness(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update the visiting charge.') }
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
