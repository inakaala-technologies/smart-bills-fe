import { getCurrentUser, type Role } from '../auth'
import { apiClient } from './httpClient'
import {
  normalizeAppointment,
  normalizeBusiness,
  normalizeCustomer,
  normalizeDocument,
  normalizeInvoice,
  normalizeMembership,
  normalizeMembershipNotification,
  normalizePayment,
  normalizeProduct,
} from './normalizers'
import type { BusinessDashboardSummary, BusinessInsightsInterval, DashboardData } from './types'

async function getFirstAvailable<T>(paths: string[]): Promise<T[]> {
  for (const path of paths) {
    try {
      const { data } = await apiClient.get<T[] | { content?: T[] }>(path, { params: { page: 0, size: 100 } })
      return Array.isArray(data) ? data : data.content ?? []
    } catch {
      continue
    }
  }
  return []
}

export async function fetchBusinessDashboardSummary(businessId?: number): Promise<BusinessDashboardSummary | null> {
  try {
    const { data } = await apiClient.get<Partial<BusinessDashboardSummary> & Record<string, unknown>>(
      '/api/v1/businesses/dashboard-summary',
      { params: typeof businessId === 'number' && businessId > 0 ? { businessId } : undefined },
    )
    return {
      totalRevenue: Number(data.totalRevenue ?? 0),
      billableRevenue: data.billableRevenue == null ? undefined : Number(data.billableRevenue),
      completedRevenue: data.completedRevenue == null ? undefined : Number(data.completedRevenue),
      activeMembers: Number(data.activeMembers ?? 0),
      pendingPayments: Number(data.pendingPayments ?? 0),
      pendingPaymentCount: data.pendingPaymentCount == null ? undefined : Number(data.pendingPaymentCount),
      newCustomers: Number(data.newCustomers ?? 0),
      invoiceCount: Number(data.invoiceCount ?? 0),
      appointmentCount: Number(data.appointmentCount ?? 0),
      recentTransactions: Array.isArray(data.recentTransactions) ? data.recentTransactions.map((item, index) => ({
        id: Number((item as Record<string, unknown>).id ?? index + 1),
        name: String((item as Record<string, unknown>).name ?? 'Customer'),
        amount: Number((item as Record<string, unknown>).amount ?? 0),
        meta: String((item as Record<string, unknown>).meta ?? ''),
        date: String((item as Record<string, unknown>).date ?? ''),
      })) : [],
      upcomingRenewals: Array.isArray(data.upcomingRenewals) ? data.upcomingRenewals.map((item, index) => ({
        id: Number((item as Record<string, unknown>).id ?? index + 1),
        name: String((item as Record<string, unknown>).name ?? 'Renewal'),
        daysLeft: Number((item as Record<string, unknown>).daysLeft ?? 0),
        note: String((item as Record<string, unknown>).note ?? ''),
      })) : [],
      revenueTrend: Array.isArray(data.revenueTrend) ? data.revenueTrend.map((item, index) => ({
        label: String((item as Record<string, unknown>).label ?? `D${index + 1}`),
        value: Number((item as Record<string, unknown>).value ?? 0),
      })) : [],
    }
  } catch {
    return null
  }
}

export async function fetchBusinessRevenueTrend(
  businessId: number,
  interval: BusinessInsightsInterval,
): Promise<BusinessDashboardSummary['revenueTrend']> {
  const { data } = await apiClient.get<Pick<BusinessDashboardSummary, 'revenueTrend'>>(
    '/api/v1/businesses/dashboard-summary',
    { params: { businessId, interval } },
  )
  return data.revenueTrend
}

export async function fetchDashboardData(selectedBusinessId?: number, roleOverride?: Role): Promise<DashboardData> {
  const currentRole = roleOverride ?? getCurrentUser()?.role ?? 'BUSINESS'
  const businessesPaths = currentRole === 'CUSTOMER'
    ? ['/api/v1/businesses/customer/invoices', '/api/v1/businesses/my', '/api/v1/businesses']
    : ['/api/v1/businesses/my', '/api/v1/businesses']
  const customersPaths = typeof selectedBusinessId === 'number' && selectedBusinessId > 0
    ? [`/api/v1/customers/business/${selectedBusinessId}`, '/api/v1/customers/my', '/api/v1/customers']
    : ['/api/v1/customers/my', '/api/v1/customers']
  const invoicesPaths = currentRole === 'CUSTOMER'
    ? ['/api/v1/billing/invoices/customer', '/api/v1/billing/invoices']
    : ['/api/v1/billing/invoices/business', '/api/v1/billing/invoices']

  const membershipsPath = currentRole === 'CUSTOMER' ? '/api/v1/memberships/my' : '/api/v1/memberships'
  const [businessesRaw, customersRaw, productsRaw, invoicesRaw, paymentsRaw, appointmentsRaw, membershipsRaw, membershipNotificationsRaw, documentsRaw] = await Promise.all([
    getFirstAvailable<Record<string, unknown>>(businessesPaths),
    getFirstAvailable<Record<string, unknown>>(customersPaths),
    getFirstAvailable<Record<string, unknown>>(['/api/v1/billing/products']),
    getFirstAvailable<Record<string, unknown>>(invoicesPaths),
    getFirstAvailable<Record<string, unknown>>(['/api/v1/payments']),
    getFirstAvailable<Record<string, unknown>>(['/api/v1/appointments']),
    getFirstAvailable<Record<string, unknown>>([membershipsPath]),
    currentRole === 'CUSTOMER' ? getFirstAvailable<Record<string, unknown>>(['/api/v1/membership-notifications/my']) : Promise.resolve([]),
    getFirstAvailable<Record<string, unknown>>(['/api/v1/documents']),
  ])

  const businesses = businessesRaw.map(normalizeBusiness)
  const customers = customersRaw.map(normalizeCustomer)
  const products = productsRaw.map(normalizeProduct)
  const invoices = invoicesRaw.map(normalizeInvoice)
  const payments = paymentsRaw.map(normalizePayment)
  const appointments = appointmentsRaw.map(normalizeAppointment)
  const memberships = membershipsRaw.map(normalizeMembership)
  const membershipNotifications = membershipNotificationsRaw.map(normalizeMembershipNotification)
  const documents = documentsRaw.map(normalizeDocument)
  const resolvedBusinessId = typeof selectedBusinessId === 'number' && selectedBusinessId > 0
    ? selectedBusinessId
    : currentRole === 'CUSTOMER'
      ? undefined
      : businesses[0]?.id ?? undefined

  const filterForBusiness = <T extends { businessId?: number }>(rows: T[]) => typeof resolvedBusinessId === 'number'
    ? rows.filter((row) => row.businessId == null || row.businessId === resolvedBusinessId)
    : rows

  return {
    businesses: typeof resolvedBusinessId === 'number' ? businesses.filter((business) => business.id === resolvedBusinessId) : businesses,
    customers: filterForBusiness(customers),
    products: filterForBusiness(products),
    invoices: filterForBusiness(invoices),
    payments: filterForBusiness(payments),
    appointments: filterForBusiness(appointments),
    memberships: filterForBusiness(memberships),
    membershipNotifications,
    documents: filterForBusiness(documents),
  }
}
