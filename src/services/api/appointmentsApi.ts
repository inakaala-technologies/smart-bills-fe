import { apiClient, getErrorMessage } from './httpClient'
import { normalizeAppointment, normalizeAppointmentService, normalizeBusiness } from './normalizers'
import type { AppointmentAvailability, AppointmentCreateRequest, AppointmentServiceRequest, AppointmentServiceSummary, AppointmentStatus, AppointmentSummary, BusinessSummary } from './types'

export async function createAppointment(payload: AppointmentCreateRequest): Promise<{ ok: boolean; appointment?: AppointmentSummary; message?: string }> {
  try {
    const { data } = await apiClient.post<Record<string, unknown>>('/api/v1/appointments', payload)
    return { ok: true, appointment: normalizeAppointment(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not book appointment.') }
  }
}

export async function fetchAppointmentServices(businessId: number): Promise<AppointmentServiceSummary[]> {
  try {
    const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/appointment-services', { params: { businessId } })
    return data.map(normalizeAppointmentService)
  } catch {
    return []
  }
}

export async function setBusinessAppointmentsEnabled(businessId: number, enabled: boolean): Promise<{ ok: boolean; business?: BusinessSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/businesses/${businessId}/appointments-enabled`, undefined, { params: { enabled } })
    return { ok: true, business: normalizeBusiness(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update appointment availability.') }
  }
}

export async function saveAppointmentServices(businessId: number, services: AppointmentServiceRequest[]): Promise<{ ok: boolean; services?: AppointmentServiceSummary[]; message?: string }> {
  try {
    const { data } = await apiClient.put<Array<Record<string, unknown>>>(`/api/v1/businesses/${businessId}/appointment-services`, services)
    return { ok: true, services: data.map(normalizeAppointmentService) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not save services.') }
  }
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus, businessNote?: string): Promise<{ ok: boolean; appointment?: AppointmentSummary; message?: string }> {
  try {
    const { data } = await apiClient.put<Record<string, unknown>>(`/api/v1/appointments/${id}/status`, businessNote === undefined ? {} : { businessNote }, { params: { status } })
    return { ok: true, appointment: normalizeAppointment(data) }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update appointment.') }
  }
}

export async function fetchAppointmentAvailability(businessId: number, serviceId: number, date: string, staffUserId?: number): Promise<AppointmentAvailability> {
  const { data } = await apiClient.get<AppointmentAvailability>('/api/v1/appointments/availability', {
    params: { businessId, serviceId, date, staffUserId },
  })
  return data
}

export async function fetchAppointmentStaff(businessId: number): Promise<AppointmentAvailability['staff']> {
  const { data } = await apiClient.get<AppointmentAvailability['staff']>(`/api/v1/businesses/${businessId}/appointment-staff`)
  return data
}

export async function updateAppointmentStaff(id: number, staffUserId?: number): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiClient.put(`/api/v1/appointments/${id}/staff`, undefined, { params: { staffUserId } })
    return { ok: true }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not update the assigned staff member.') }
  }
}
