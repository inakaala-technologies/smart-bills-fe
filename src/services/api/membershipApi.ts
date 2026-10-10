import { apiClient, getErrorMessage } from './httpClient'
import { normalizeCustomer, normalizeMembership, normalizeMembershipPlan } from './normalizers'
import type { BusinessMembershipRequest, CustomerSummary, MembershipPlanSummary, MembershipSummary } from './types'

export async function fetchMembershipPlans(businessId: number): Promise<MembershipPlanSummary[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>(`/api/v1/businesses/${businessId}/membership-plans`)
  return data.map(normalizeMembershipPlan)
}

export async function saveMembershipPlan(businessId: number, plan: Omit<MembershipPlanSummary, 'id' | 'businessId'>, planId?: number): Promise<{ ok: boolean; plan?: MembershipPlanSummary; message?: string }> {
  try {
    const url = `/api/v1/businesses/${businessId}/membership-plans${planId ? `/${planId}` : ''}`
    const { data } = await apiClient.request<Record<string, unknown>>({ url, method: planId ? 'PUT' : 'POST', data: plan })
    return { ok: true, plan: normalizeMembershipPlan(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not save membership plan.') }
  }
}

export async function searchMembershipUsers(businessId: number, query: string): Promise<CustomerSummary[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>(`/api/v1/businesses/${businessId}/member-search`, { params: { q: query } })
  return data.map(normalizeCustomer)
}

export async function createManagedMembership(businessId: number, request: {
  planId: number
  profileId?: string
  memberName?: string
  email?: string
  phone?: string
  startDate: string
  paymentStatus: 'PAID' | 'PENDING' | 'FREE'
}): Promise<{ ok: boolean; membership?: MembershipSummary; message?: string }> {
  try {
    const { data } = await apiClient.post<Record<string, unknown>>(`/api/v1/businesses/${businessId}/memberships`, request)
    return { ok: true, membership: normalizeMembership(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not add membership.') }
  }
}

export async function updateManagedMembership(businessId: number, membershipId: number, request: {
  planId: number
  startDate: string
  endDate?: string
  paymentStatus: 'PAID' | 'PENDING' | 'FREE'
  status: NonNullable<MembershipSummary['status']>
}): Promise<{ ok: boolean; membership?: MembershipSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/businesses/${businessId}/memberships/${membershipId}`, request)
    return { ok: true, membership: normalizeMembership(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update membership.') }
  }
}

export async function sendMembershipReminder(membershipId: number, message?: string): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiClient.post(`/api/v1/memberships/${membershipId}/reminders`, { message })
    return { ok: true, message: 'In-app renewal reminder sent.' }
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
      return { ok: false, message: 'A reminder was already sent in the last 24 hours.' }
    }
    return { ok: false, message: getErrorMessage(error, 'Could not send renewal reminder.') }
  }
}

export async function addBusinessMembership(payload: BusinessMembershipRequest): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiClient.post('/api/v1/business-users', payload)
    return { ok: true, message: 'Business access linked successfully.' }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Failed to link business access.') }
  }
}
