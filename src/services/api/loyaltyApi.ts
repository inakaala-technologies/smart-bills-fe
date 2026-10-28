import { apiClient, getErrorMessage } from './httpClient'
import type { LoyaltyBalance, LoyaltyCustomerBalance, LoyaltyProgramSettings, LoyaltyRule, LoyaltyTargetType } from './types'

type LoyaltyRuleRequest = {
  targetType: LoyaltyTargetType
  targetId: number
  points: number
  active: boolean
}

export async function fetchLoyaltyRules(businessId: number): Promise<LoyaltyRule[]> {
  const { data } = await apiClient.get<LoyaltyRule[]>(`/api/v1/businesses/${businessId}/loyalty/rules`)
  return data
}

export async function fetchLoyaltySettings(businessId: number): Promise<LoyaltyProgramSettings> {
  const { data } = await apiClient.get<LoyaltyProgramSettings>(`/api/v1/businesses/${businessId}/loyalty/settings`)
  return data
}

export async function saveLoyaltySettings(
  businessId: number,
  settings: { pointsPerCurrencyUnit: number; maxRedemptionPercent: number },
): Promise<{ ok: boolean; settings?: LoyaltyProgramSettings; message?: string }> {
  try {
    const { data } = await apiClient.put<LoyaltyProgramSettings>(`/api/v1/businesses/${businessId}/loyalty/settings`, settings)
    return { ok: true, settings: data }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not save loyalty settings.') }
  }
}

export async function saveLoyaltyRule(
  businessId: number,
  request: LoyaltyRuleRequest,
  ruleId?: number,
): Promise<{ ok: boolean; rule?: LoyaltyRule; message?: string }> {
  try {
    const url = `/api/v1/businesses/${businessId}/loyalty/rules${ruleId ? `/${ruleId}` : ''}`
    const { data } = await apiClient.request<LoyaltyRule>({
      url,
      method: ruleId ? 'PUT' : 'POST',
      data: request,
    })
    return { ok: true, rule: data }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not save loyalty rule.') }
  }
}

export async function fetchLoyaltyBalance(businessId: number, customerId: number): Promise<LoyaltyBalance> {
  const { data } = await apiClient.get<LoyaltyBalance>(
    `/api/v1/businesses/${businessId}/loyalty/customers/${customerId}/balance`,
  )
  return data
}

export async function fetchBusinessLoyaltyBalances(businessId: number): Promise<LoyaltyCustomerBalance[]> {
  const { data } = await apiClient.get<LoyaltyCustomerBalance[]>(`/api/v1/businesses/${businessId}/loyalty/balances`)
  return data
}

export async function earnLoyaltyPoints(
  businessId: number,
  customerId: number,
  points: number,
  idempotencyKey: string,
  reference?: { type?: string; id?: number; note?: string },
): Promise<{ ok: boolean; message?: string }> {
  try {
    await apiClient.post(`/api/v1/businesses/${businessId}/loyalty/customers/${customerId}/earn`, {
      points,
      idempotencyKey,
      referenceType: reference?.type,
      referenceId: reference?.id,
      note: reference?.note,
    })
    return { ok: true }
  } catch (error) {
    return { ok: false, message: getErrorMessage(error, 'Could not award loyalty points.') }
  }
}
