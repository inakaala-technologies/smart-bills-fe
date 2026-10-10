import {
  Briefcase,
  Building,
  Car,
  CircleHelp,
  Dumbbell,
  GraduationCap,
  Hotel,
  House,
  Landmark,
  PartyPopper,
  PawPrint,
  Pill,
  Plane,
  ShoppingBag,
  ShoppingBasket,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  Truck,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

export const BUSINESS_TYPES = [
  { value: 'GYM_FITNESS', label: 'Gym & Fitness', icon: Dumbbell },
  { value: 'HAIR_SALON', label: 'Hair Salon & Barber', icon: Scissors },
  { value: 'SPA_WELLNESS', label: 'Spa & Wellness', icon: Sparkles },
  { value: 'HOTEL_ACCOMMODATION', label: 'Hotel & Accommodation', icon: Hotel },
  { value: 'RESTAURANT_CAFE', label: 'Restaurant & Cafe', icon: Utensils },
  { value: 'GROCERY_SUPERMARKET', label: 'Grocery & Supermarket', icon: ShoppingBasket },
  { value: 'RETAIL_SHOPPING', label: 'Retail & Shopping', icon: ShoppingBag },
  { value: 'HEALTHCARE_CLINIC', label: 'Healthcare & Clinic', icon: Stethoscope },
  { value: 'DENTAL_CARE', label: 'Dental Care', icon: Smile },
  { value: 'PHARMACY', label: 'Pharmacy', icon: Pill },
  { value: 'EDUCATION_TRAINING', label: 'Education & Training', icon: GraduationCap },
  { value: 'AUTOMOTIVE_REPAIR', label: 'Automotive & Repair', icon: Car },
  { value: 'HOME_SERVICES', label: 'Home Services', icon: House },
  { value: 'PROFESSIONAL_SERVICES', label: 'Professional Services', icon: Briefcase },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services', icon: Landmark },
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: Building },
  { value: 'TRAVEL_TOURISM', label: 'Travel & Tourism', icon: Plane },
  { value: 'EVENTS_ENTERTAINMENT', label: 'Events & Entertainment', icon: PartyPopper },
  { value: 'PET_SERVICES', label: 'Pet Services', icon: PawPrint },
  { value: 'LOGISTICS_DELIVERY', label: 'Logistics & Delivery', icon: Truck },
  { value: 'GENERAL_SERVICES', label: 'General Services', icon: Store },
  { value: 'OTHER', label: 'Other', icon: CircleHelp },
] as const

export function getBusinessTypeIcon(value?: string): LucideIcon {
  const normalized = normalizeBusinessType(value)
  return BUSINESS_TYPES.find((type) => type.value === normalized)?.icon ?? Store
}

export function normalizeBusinessType(value?: string) {
  const normalized = value?.trim().toUpperCase() ?? ''
  if (normalized === 'SERVICE') return 'GENERAL_SERVICES'
  const matchedType = BUSINESS_TYPES.find((type) => type.value === normalized || type.label.toUpperCase() === normalized)
  return matchedType?.value ?? normalized
}

export function getBusinessTypeLabel(value?: string) {
  if (!value) return 'Business'
  const normalized = normalizeBusinessType(value)
  return BUSINESS_TYPES.find((type) => type.value === normalized)?.label ?? value
}