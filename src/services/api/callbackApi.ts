import { apiClient, getErrorMessage } from './httpClient'

export type CallbackRequestStatus = 'PENDING' | 'CONTACTED'

export type CallbackRequest = {
  id: number
  businessId: number
  customerProfileId?: number | null
  requesterName: string
  requesterEmail?: string | null
  requesterPhone?: string | null
  reason?: string | null
  status: CallbackRequestStatus
  createdAt: string
}

export const CALLBACK_REASON_MAX_LENGTH = 300

export async function requestBusinessCallback(businessId: number, reason: string): Promise<CallbackRequest> {
  try {
    const { data } = await apiClient.post<CallbackRequest>(
      `/api/v1/businesses/${businessId}/callback-requests`,
      { reason: reason.trim() },
    )
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not send your callback request.'), { cause: error })
  }
}

export async function fetchCallbackRequests(businessId: number): Promise<CallbackRequest[]> {
  const { data } = await apiClient.get<CallbackRequest[]>(`/api/v1/businesses/${businessId}/callback-requests`)
  return data
}

export async function updateCallbackRequestStatus(
  businessId: number,
  requestId: number,
  status: CallbackRequestStatus,
): Promise<CallbackRequest> {
  try {
    const { data } = await apiClient.patch<CallbackRequest>(
      `/api/v1/businesses/${businessId}/callback-requests/${requestId}/status`,
      { status },
    )
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not update this request.'), { cause: error })
  }
}
