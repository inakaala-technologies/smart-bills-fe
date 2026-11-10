import type { AxiosRequestConfig } from 'axios'
import { apiClient } from './httpClient'

export type PartnerApplicationForm = {
  partnerName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  retailerReference: string
  retailerName: string
  outletReference: string
  outletName: string
}

export type PartnerApplicationStatus = {
  applicationId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  partnerId: string | null
  decisionReason: string | null
  submittedAt: string
  reviewedAt: string | null
}

export type AdminPartnerApplication = PartnerApplicationForm & {
  applicationId: string
  publicKey: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  partnerId: string | null
  decisionReason: string | null
  submittedAt: string
  reviewedAt: string | null
  reviewedBy: number | null
}

export async function submitPartnerApplication(
  application: PartnerApplicationForm & { publicKey: string; proofSignature: string },
): Promise<{ applicationId: string; statusAccessToken: string; status: string }> {
  const { data } = await apiClient.post('/api/v1/pos-partner-applications', application)
  return data
}

export async function fetchPartnerApplicationStatus(
  applicationId: string,
  statusAccessToken: string,
): Promise<PartnerApplicationStatus> {
  const requestConfig: AxiosRequestConfig & { skipCache: boolean } = {
    headers: { 'X-Application-Access-Token': statusAccessToken },
    skipCache: true,
  }
  const { data } = await apiClient.get(
    `/api/v1/pos-partner-applications/${encodeURIComponent(applicationId)}/status`,
    requestConfig,
  )
  return data
}

export async function fetchAdminPartnerApplications(): Promise<AdminPartnerApplication[]> {
  const { data } = await apiClient.get<AdminPartnerApplication[]>('/api/v1/admin/pos-partner-applications')
  return data
}

export async function approvePartnerApplication(applicationId: string): Promise<AdminPartnerApplication> {
  const { data } = await apiClient.post<AdminPartnerApplication>(
    `/api/v1/admin/pos-partner-applications/${encodeURIComponent(applicationId)}/approve`,
  )
  return data
}

export async function rejectPartnerApplication(applicationId: string, reason: string): Promise<AdminPartnerApplication> {
  const { data } = await apiClient.post<AdminPartnerApplication>(
    `/api/v1/admin/pos-partner-applications/${encodeURIComponent(applicationId)}/reject`,
    { reason },
  )
  return data
}
