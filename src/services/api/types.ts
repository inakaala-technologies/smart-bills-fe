export type BusinessSummary = {
  id: number
  profileId?: string
  name?: string
  businessName?: string
  companyName?: string
  legalName?: string
  businessType?: string
  gstin?: string
  pan?: string
  imageUrl?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  region?: string
  city?: string
  latitude?: number
  longitude?: number
  status?: string
  appointmentsEnabled?: boolean
  membershipsEnabled?: boolean
}

export type CustomerSummary = {
  id: number
  userId?: number
  profileId?: string
  businessId?: number
  fullName?: string
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  locationAddress?: string
  latitude?: number
  longitude?: number
}

export type NearbyBusinessSummary = {
  id: number
  name: string
  businessType?: string
  address?: string
  latitude: number
  longitude: number
  distanceKm: number
}

export type BusinessOffer = {
  id: number
  businessId: number
  title: string
  description?: string
  discountLabel: string
  startsAt: string
  endsAt: string
  active: boolean
  targetSegment?: CustomerSegment
}

export type CustomerSegment = 'ALL' | 'NEW' | 'LOYAL' | 'AT_RISK' | 'MEMBERS'

export type NearbyOfferSummary = {
  id: number
  businessId: number
  businessName: string
  address?: string
  title: string
  description?: string
  discountLabel: string
  endsAt: string
  distanceKm: number
}

export type ProductSummary = {
  id: number
  businessId?: number
  name?: string
  productName?: string
  price?: number
  status?: string
}

export type InvoiceSummary = {
  id: number
  invoiceNumber?: string
  businessId?: number
  customerId?: number
  issueDate?: string
  dueDate?: string
  subtotal?: number
  gstAmount?: number
  totalAmount?: number
  loyaltyPointsRedeemed?: number
  loyaltyDiscountAmount?: number
  status?: string
}

export type PaymentSummary = {
  id: number
  invoiceId?: number
  businessId?: number
  customerId?: number
  amount?: number
  paymentMethod?: string
  status?: string
  referenceNumber?: string
  paymentDate?: string
}

export type AppointmentSummary = {
  id: number
  businessId?: number
  customerId?: number
  staffUserId?: number
  appointmentServiceId?: number
  serviceName?: string
  servicePrice?: number
  loyaltyPointsRedeemed?: number
  loyaltyDiscountAmount?: number
  scheduledAt?: string
  durationMinutes?: number
  status?: string
  notes?: string
  businessNote?: string
  createdAt?: string
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  businessName?: string
  staffName?: string
}

export type AppointmentServiceSummary = {
  id: number
  businessId: number
  name: string
  description?: string
  price: number
  durationMinutes: number
  enabled: boolean
}

export type AppointmentStaffOption = { userId: number; label: string }
export type AppointmentAvailability = { date: string; availableSlots: string[]; staff: AppointmentStaffOption[] }

export type BusinessInsightsInterval = 'DAILY' | 'WEEKLY' | 'MONTHLY'

export type BusinessInsights = {
  revenueTrend: Array<{ label: string; amount: number }>
  paymentAging: Array<{ label: string; amount: number; invoiceCount: number }>
  memberships: { active: number; renewingSoon: number; churned: number; renewalRate: number }
  customers: { acquiredLast30Days: number; repeatCustomers: number; retentionRate: number; acquisitionTrend: Array<{ label: string; amount: number }> }
}

export type MembershipSummary = {
  id: number
  tenantId?: number
  businessId?: number
  customerId?: number
  planId?: number
  planName?: string
  price?: number
  loyaltyPointsRedeemed?: number
  loyaltyDiscountAmount?: number
  startDate?: string
  endDate?: string
  updatedAt?: string
  paymentStatus?: 'PAID' | 'PENDING' | 'FREE' | string
  status?: 'ACTIVE' | 'PENDING' | 'EXPIRED' | 'CANCELLED' | 'RENEWED' | string
}

export type MembershipPlanSummary = {
  id: number
  businessId: number
  name: string
  description?: string
  price: number
  billingFrequency: string
  durationMonths: number
  benefits?: string
  maxMembers?: number
  active: boolean
}

export type LoyaltyTargetType = 'PRODUCT' | 'SERVICE' | 'MEMBERSHIP'

export type LoyaltyRule = {
  id: number
  businessId: number
  targetType: LoyaltyTargetType
  targetId: number
  points: number
  active: boolean
}

export type LoyaltyBalance = {
  businessId: number
  customerId: number
  balance: number
}

export type LoyaltyCustomerBalance = {
  customerId: number
  balance: number
}

export type LoyaltyProgramSettings = {
  businessId: number
  configured: boolean
  pointsPerCurrencyUnit: number | null
  maxRedemptionPercent: number | null
}

export type MembershipNotificationSummary = {
  id: number
  businessId: number
  membershipId: number
  customerId: number
  type: string
  message: string
  sentAt: string
}

export type AppNotificationSummary = {
  id: number
  type: string
  title: string
  message: string
  targetUrl?: string
  appointmentId?: number
  createdAt: string
  readAt: string | null
}

export type NotificationFeed = {
  notifications: AppNotificationSummary[]
  unreadCount: number
}

export type DocumentSummary = {
  id: number
  tenantId?: number
  businessId?: number
  customerId?: number
  documentType?: 'INVOICE' | 'RECEIPT' | 'CONTRACT' | 'ID_PROOF' | 'MEMBERSHIP' | 'CERTIFICATE' | 'PROFILE' | 'OTHER' | string
  fileName?: string
  fileUrl?: string
  status?: 'ACTIVE' | 'PENDING_UPLOAD' | 'ARCHIVED' | 'DELETED' | string
}

export type DashboardData = {
  businesses: BusinessSummary[]
  customers: CustomerSummary[]
  products: ProductSummary[]
  invoices: InvoiceSummary[]
  payments: PaymentSummary[]
  appointments: AppointmentSummary[]
  memberships: MembershipSummary[]
  membershipNotifications: MembershipNotificationSummary[]
  documents: DocumentSummary[]
}

export type BusinessDashboardSummary = {
  totalRevenue: number
  billableRevenue?: number
  completedRevenue?: number
  activeMembers: number
  pendingPayments: number
  pendingPaymentCount?: number
  newCustomers: number
  invoiceCount: number
  appointmentCount: number
  recentTransactions: Array<{ id: number; name: string; amount: number; meta: string; date: string }>
  upcomingRenewals: Array<{ id: number; name: string; daysLeft: number; note: string }>
  revenueTrend: Array<{ label: string; value: number }>
}

export type BusinessCreateRequest = {
  name: string
  legalName?: string
  businessType?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  address?: string
  country?: string
  region?: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  status?: string
  tenantId?: number
}

export type BusinessMembershipRequest = {
  businessId: number
  userId: number
  tenantId?: number
  role?: string
  status?: string
}

export type InvoiceCreateRequest = {
  businessId: number
  customerId: number
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  subtotal: number
  gstAmount: number
  totalAmount: number
  status?: 'DRAFT' | 'SENT' | 'PAID'
  loyaltyPointsToRedeem?: number
}

export type AppointmentCreateRequest = {
  businessId: number
  appointmentServiceId: number
  scheduledAt: string
  staffUserId?: number
  notes?: string
  loyaltyPointsToRedeem?: number
}

export type AppointmentServiceRequest = Omit<AppointmentServiceSummary, 'id' | 'businessId'> & {
  id?: number
}

export type AppointmentStatus = 'BOOKED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
