import { apiClient, getErrorMessage } from './httpClient'

export type PayslipEmployee = {
  id: number
  businessId: number
  customerProfileId: number
  name?: string | null
  email?: string | null
  phone?: string | null
  employeeCode?: string | null
  designation?: string | null
  createdAt: string
}

export type Payslip = {
  id: number
  businessId: number
  businessName?: string | null
  employeeId: number
  employeeName?: string | null
  payMonth: number
  payYear: number
  periodLabel: string
  note?: string | null
  fileName: string
  contentType: string
  createdAt: string
}

export const PAYSLIP_MAX_BYTES = 5 * 1024 * 1024

export async function fetchPayslipEmployees(businessId: number): Promise<PayslipEmployee[]> {
  const { data } = await apiClient.get<PayslipEmployee[]>(`/api/v1/businesses/${businessId}/employees`)
  return data
}

export async function addPayslipEmployee(
  businessId: number,
  payload: { identifier: string; employeeCode?: string; designation?: string },
): Promise<PayslipEmployee> {
  try {
    const { data } = await apiClient.post<PayslipEmployee>(`/api/v1/businesses/${businessId}/employees`, payload)
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not add this employee.'), { cause: error })
  }
}

export async function removePayslipEmployee(businessId: number, employeeId: number): Promise<void> {
  try {
    await apiClient.delete(`/api/v1/businesses/${businessId}/employees/${employeeId}`)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not remove this employee.'), { cause: error })
  }
}

export async function sendPayslip(
  businessId: number,
  employeeId: number,
  payload: { month: number; year: number; note: string; file: File },
): Promise<Payslip> {
  const formData = new FormData()
  formData.append('month', String(payload.month))
  formData.append('year', String(payload.year))
  if (payload.note.trim()) formData.append('note', payload.note.trim())
  formData.append('file', payload.file)
  try {
    const { data } = await apiClient.post<Payslip>(
      `/api/v1/businesses/${businessId}/employees/${employeeId}/payslips`,
      formData,
      { timeout: 60000 },
    )
    return data
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not send the payslip.'), { cause: error })
  }
}

export async function fetchBusinessPayslips(businessId: number): Promise<Payslip[]> {
  const { data } = await apiClient.get<Payslip[]>(`/api/v1/businesses/${businessId}/payslips`)
  return data
}

export async function fetchMyPayslips(): Promise<Payslip[]> {
  const { data } = await apiClient.get<Payslip[]>('/api/v1/customers/my/payslips')
  return data
}

export async function downloadPayslip(payslip: Pick<Payslip, 'id' | 'fileName'>): Promise<void> {
  try {
    const { data } = await apiClient.get<Blob>(`/api/v1/payslips/${payslip.id}/download`, { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const link = document.createElement('a')
    link.href = url
    link.download = payslip.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch (error) {
    throw new Error(getErrorMessage(error, 'Could not download this payslip.'), { cause: error })
  }
}
