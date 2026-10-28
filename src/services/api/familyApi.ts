import { ApiClientError, apiClient } from './httpClient'
import { normalizeInvoice } from './normalizers'
import type { InvoiceSummary } from './types'

export type FamilyMemberStatus = 'PENDING' | 'ACCEPTED'

export type FamilyMember = {
    id: number
    familyId: number
    userId: number
    status: FamilyMemberStatus
    invitedBy?: number | null
    joinedAt?: string | null
}

export type Family = {
    familyId: number
    createdBy: number
    createdAt: string
    members: FamilyMember[]
}

function getStatus(error: unknown): number | undefined {
    if (error instanceof ApiClientError) return error.status
    return (error as { response?: { status?: number } })?.response?.status
}

export async function fetchMyFamily(): Promise<Family | null> {
    try {
        const { data } = await apiClient.get<Family>('/api/v1/families/me')
        return data
    } catch (error) {
        if (getStatus(error) === 404) return null
        throw error
    }
}

export async function fetchFamilyInvitations(): Promise<FamilyMember[]> {
    const { data } = await apiClient.get<FamilyMember[]>('/api/v1/families/invitations')
    return Array.isArray(data) ? data : []
}

export async function createFamily(): Promise<void> {
    await apiClient.post('/api/v1/families')
}

export async function inviteFamilyMember(contact: string): Promise<void> {
    await apiClient.post('/api/v1/families/invite', { contact })
}

export async function acceptFamilyInvitation(familyMemberId: number): Promise<void> {
    await apiClient.post(`/api/v1/families/invitations/${familyMemberId}/accept`)
}

export async function rejectFamilyInvitation(familyMemberId: number): Promise<void> {
    await apiClient.post(`/api/v1/families/invitations/${familyMemberId}/reject`)
}

export async function fetchFamilyInvoices(): Promise<InvoiceSummary[]> {
    const { data } = await apiClient.get<Record<string, unknown>[]>(
        '/api/v1/billing/invoices/family',
    )
    return Array.isArray(data) ? data.map(normalizeInvoice) : []
}