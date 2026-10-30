import type {
  AppointmentServiceSummary,
  AppointmentSummary,
  BusinessSummary,
  CustomerSummary,
  DocumentSummary,
  InvoiceSummary,
  MembershipNotificationSummary,
  MembershipPlanSummary,
  MembershipSummary,
  PaymentSummary,
  ProductSummary,
} from './types'

export function normalizeBusiness(raw: Partial<BusinessSummary> & Record<string, unknown>): BusinessSummary {
  const name = String(raw.name ?? raw.businessName ?? raw.companyName ?? raw.legalName ?? 'Business')
  return {
    id: Number(raw.id ?? 0),
    profileId: typeof raw.profileId === 'string' ? raw.profileId : undefined,
    name,
    businessName: typeof raw.businessName === 'string' ? raw.businessName : name,
    legalName: typeof raw.legalName === 'string' ? raw.legalName : undefined,
    businessType: typeof raw.businessType === 'string' ? raw.businessType : undefined,
    gstin: typeof raw.gstin === 'string' ? raw.gstin : undefined,
    pan: typeof raw.pan === 'string' ? raw.pan : undefined,
    imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : typeof raw.coverImageUrl === 'string' ? raw.coverImageUrl : undefined,
    bannerImageUrl: typeof raw.bannerImageUrl === 'string' ? raw.bannerImageUrl : undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    phone: typeof raw.phone === 'string' ? raw.phone : undefined,
    address: typeof raw.address === 'string' ? raw.address : undefined,
    country: typeof raw.country === 'string' ? raw.country : undefined,
    region: typeof raw.region === 'string' ? raw.region : undefined,
    city: typeof raw.city === 'string' ? raw.city : undefined,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : undefined,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : undefined,
    status: typeof raw.status === 'string' ? raw.status : 'active',
    appointmentsEnabled: raw.appointmentsEnabled === true,
    membershipsEnabled: raw.membershipsEnabled !== false,
    homeServicesEnabled: raw.homeServicesEnabled === true,
    homeVisitCharge: Number(raw.homeVisitCharge ?? 0),
  }
}

export function normalizeCustomer(raw: Partial<CustomerSummary> & Record<string, unknown>): CustomerSummary {
  const firstName = typeof raw.firstName === 'string' ? raw.firstName : ''
  const lastName = typeof raw.lastName === 'string' ? raw.lastName : ''
  const fullName = typeof raw.fullName === 'string'
    ? raw.fullName
    : typeof raw.name === 'string'
      ? raw.name
      : [firstName, lastName].filter(Boolean).join(' ') || 'Customer'

  return {
    id: Number(raw.id ?? 0),
    userId: typeof raw.userId === 'number' ? raw.userId : undefined,
    profileId: typeof raw.profileId === 'string' ? raw.profileId : undefined,
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    fullName,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: typeof raw.email === 'string' ? raw.email : undefined,
    phoneNumber: typeof raw.phoneNumber === 'string' ? raw.phoneNumber : typeof raw.maskedPhone === 'string' ? raw.maskedPhone : typeof raw.phone === 'string' ? raw.phone : undefined,
    locationAddress: typeof raw.locationAddress === 'string' ? raw.locationAddress : undefined,
    latitude: typeof raw.latitude === 'number' ? raw.latitude : undefined,
    longitude: typeof raw.longitude === 'number' ? raw.longitude : undefined,
  }
}

export function normalizeProduct(raw: Partial<ProductSummary> & Record<string, unknown>): ProductSummary {
  const name = String(raw.name ?? raw.productName ?? 'Product')
  return {
    id: Number(raw.id ?? 0),
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    name,
    productName: name,
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price ?? 0),
    status: typeof raw.status === 'string' ? raw.status : 'active',
  }
}

export function normalizeInvoice(raw: Partial<InvoiceSummary> & Record<string, unknown>): InvoiceSummary {
  return {
    id: Number(raw.id ?? 0),
    invoiceNumber: typeof raw.invoiceNumber === 'string' ? raw.invoiceNumber : `INV-${raw.id ?? 0}`,
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    customerId: typeof raw.customerId === 'number' ? raw.customerId : undefined,
    issueDate: typeof raw.issueDate === 'string' ? raw.issueDate : undefined,
    dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : undefined,
    subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : Number(raw.subtotal ?? 0),
    gstAmount: typeof raw.gstAmount === 'number' ? raw.gstAmount : Number(raw.gstAmount ?? 0),
    totalAmount: typeof raw.totalAmount === 'number' ? raw.totalAmount : Number(raw.totalAmount ?? 0),
    invoiceDiscountAmount: Number(raw.invoiceDiscountAmount ?? 0),
    invoiceDiscountType: raw.invoiceDiscountType === 'PERCENTAGE' || raw.invoiceDiscountType === 'AMOUNT' ? raw.invoiceDiscountType : undefined,
    invoiceDiscountValue: Number(raw.invoiceDiscountValue ?? 0),
    loyaltyPointsRedeemed: Number(raw.loyaltyPointsRedeemed ?? 0),
    loyaltyDiscountAmount: Number(raw.loyaltyDiscountAmount ?? 0),
    status: typeof raw.status === 'string' ? raw.status : 'DRAFT',
  }
}

export function normalizePayment(raw: Partial<PaymentSummary> & Record<string, unknown>): PaymentSummary {
  return {
    id: Number(raw.id ?? 0),
    invoiceId: typeof raw.invoiceId === 'number' ? raw.invoiceId : undefined,
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    customerId: typeof raw.customerId === 'number' ? raw.customerId : undefined,
    amount: typeof raw.amount === 'number' ? raw.amount : Number(raw.amount ?? 0),
    paymentMethod: typeof raw.paymentMethod === 'string' ? raw.paymentMethod : 'UPI',
    status: typeof raw.status === 'string' ? raw.status : 'PENDING',
    referenceNumber: typeof raw.referenceNumber === 'string' ? raw.referenceNumber : `REF-${raw.id ?? 0}`,
    paymentDate: typeof raw.paymentDate === 'string' ? raw.paymentDate : undefined,
  }
}

export function normalizeAppointment(raw: Partial<AppointmentSummary> & Record<string, unknown>): AppointmentSummary {
  return {
    id: Number(raw.id ?? 0),
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    customerId: typeof raw.customerId === 'number' ? raw.customerId : undefined,
    staffUserId: typeof raw.staffUserId === 'number' ? raw.staffUserId : undefined,
    appointmentServiceId: typeof raw.appointmentServiceId === 'number' ? raw.appointmentServiceId : undefined,
    serviceName: typeof raw.serviceName === 'string' ? raw.serviceName : 'Appointment service',
    servicePrice: typeof raw.servicePrice === 'number' ? raw.servicePrice : Number(raw.servicePrice ?? 0),
    loyaltyPointsRedeemed: Number(raw.loyaltyPointsRedeemed ?? 0),
    loyaltyDiscountAmount: Number(raw.loyaltyDiscountAmount ?? 0),
    homeVisit: raw.homeVisit === true,
    visitingCharge: Number(raw.visitingCharge ?? 0),
    visitAddress: typeof raw.visitAddress === 'string' ? raw.visitAddress : undefined,
    scheduledAt: typeof raw.scheduledAt === 'string' ? raw.scheduledAt : undefined,
    durationMinutes: typeof raw.durationMinutes === 'number' ? raw.durationMinutes : Number(raw.durationMinutes ?? 0),
    status: typeof raw.status === 'string' ? raw.status : 'BOOKED',
    notes: typeof raw.notes === 'string' ? raw.notes : undefined,
    businessNote: typeof raw.businessNote === 'string' ? raw.businessNote : undefined,
  }
}

export function normalizeAppointmentService(raw: Record<string, unknown>): AppointmentServiceSummary {
  return {
    id: Number(raw.id ?? 0),
    businessId: Number(raw.businessId ?? 0),
    name: String(raw.name ?? 'Service'),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    price: Number(raw.price ?? 0),
    durationMinutes: Number(raw.durationMinutes ?? 30),
    enabled: raw.enabled !== false,
  }
}

export function normalizeMembership(raw: Partial<MembershipSummary> & Record<string, unknown>): MembershipSummary {
  const status = typeof raw.status === 'string' ? raw.status.toUpperCase() : 'PENDING'
  return {
    id: Number(raw.id ?? 0),
    tenantId: typeof raw.tenantId === 'number' ? raw.tenantId : undefined,
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    customerId: typeof raw.customerId === 'number' ? raw.customerId : undefined,
    planId: typeof raw.planId === 'number' ? raw.planId : undefined,
    planName: typeof raw.planName === 'string' ? raw.planName : 'Membership',
    price: typeof raw.price === 'number' ? raw.price : Number(raw.price ?? 0),
    loyaltyPointsRedeemed: Number(raw.loyaltyPointsRedeemed ?? 0),
    loyaltyDiscountAmount: Number(raw.loyaltyDiscountAmount ?? 0),
    startDate: typeof raw.startDate === 'string' ? raw.startDate : undefined,
    endDate: typeof raw.endDate === 'string' ? raw.endDate : undefined,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
    status: status as MembershipSummary['status'],
    paymentStatus: typeof raw.paymentStatus === 'string' ? raw.paymentStatus : 'PENDING',
  }
}

export function normalizeMembershipPlan(raw: Partial<MembershipPlanSummary> & Record<string, unknown>): MembershipPlanSummary {
  return {
    id: Number(raw.id ?? 0),
    businessId: Number(raw.businessId ?? 0),
    name: typeof raw.name === 'string' ? raw.name : 'Membership plan',
    description: typeof raw.description === 'string' ? raw.description : undefined,
    price: Number(raw.price ?? 0),
    billingFrequency: typeof raw.billingFrequency === 'string' ? raw.billingFrequency : 'MONTHLY',
    durationMonths: Number(raw.durationMonths ?? 1),
    benefits: typeof raw.benefits === 'string' ? raw.benefits : undefined,
    maxMembers: typeof raw.maxMembers === 'number' ? raw.maxMembers : undefined,
    active: raw.active !== false,
  }
}

export function normalizeMembershipNotification(raw: Partial<MembershipNotificationSummary> & Record<string, unknown>): MembershipNotificationSummary {
  return {
    id: Number(raw.id ?? 0),
    businessId: Number(raw.businessId ?? 0),
    membershipId: Number(raw.membershipId ?? 0),
    customerId: Number(raw.customerId ?? 0),
    type: typeof raw.type === 'string' ? raw.type : 'RENEWAL_REMINDER',
    message: typeof raw.message === 'string' ? raw.message : '',
    sentAt: typeof raw.sentAt === 'string' ? raw.sentAt : '',
  }
}

export function normalizeDocument(raw: Partial<DocumentSummary> & Record<string, unknown>): DocumentSummary {
  const documentType = typeof raw.documentType === 'string' ? raw.documentType.toUpperCase() : 'OTHER'
  const status = typeof raw.status === 'string' ? raw.status.toUpperCase() : 'ACTIVE'
  return {
    id: Number(raw.id ?? 0),
    tenantId: typeof raw.tenantId === 'number' ? raw.tenantId : undefined,
    businessId: typeof raw.businessId === 'number' ? raw.businessId : undefined,
    customerId: typeof raw.customerId === 'number' ? raw.customerId : undefined,
    documentType: documentType as DocumentSummary['documentType'],
    fileName: typeof raw.fileName === 'string' ? raw.fileName : 'document',
    fileUrl: typeof raw.fileUrl === 'string' ? raw.fileUrl : '#',
    status: status as DocumentSummary['status'],
  }
}
