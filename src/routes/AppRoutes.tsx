import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Box } from '@mui/material'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { DetailView } from '../components/DetailView'
import { BusinessDetailPage } from '../components/BusinessDetailPage'
import { CustomerBusinessDetailPage } from '../components/CustomerBusinessDetailPage'
import { AuthPage } from '../pages/AuthPage'
import { AdminDashboard } from '../modules/admin/AdminDashboard'
import { BusinessDashboard } from '../modules/business/BusinessDashboard'
import { CustomerDashboard } from '../modules/customer/CustomerDashboard'
import { fetchBusinessById, fetchDashboardData, type BusinessSummary, type MembershipSummary, type PaymentSummary } from '../services/api'
import { fetchLoyaltyBalance } from '../services/api/loyaltyApi'
import { getCurrentUser, getCurrentUserProfile, type Role } from '../services/auth'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import type { RootState } from '../store/store'
import { fetchAdminDashboard } from '../store/adminDashboardSlice'
import { fetchBusinessDashboard, fetchBusinessSummary } from '../store/businessDashboardSlice'
import { fetchCustomerDashboard } from '../store/customerDashboardSlice'
import { appStyles } from '../theme/styles'
import { setAuthUser } from '../store/authSlice'
import { InsuranceHomePage, InsuranceCategoryPage } from '../pages/InsurancePages'
import { getDashboardPath, isDashboardPathname } from './dashboardPaths'
import { isDashboardFresh } from '../store/dashboardFreshness'

function AuthenticatedRoute({ children }: { children: ReactNode }) {
  const authUser = useAppSelector((state: RootState) => state.auth.authUser)
  return authUser?.accessToken ? <>{children}</> : <Navigate to="/" replace />
}

function RoleRoute({ allow, role, children }: { allow: Role; role: Role; children: ReactNode }) {
  return role === allow ? <>{children}</> : <Navigate to={getDashboardPath(role)} replace />
}

function BusinessDetailRoute({
  fallbackBusiness,
  role,
}: {
  fallbackBusiness: BusinessSummary | null
  role: Role
}) {
  const { id } = useParams()
  const [business, setBusiness] = useState<BusinessSummary | null>(fallbackBusiness)
  const [loadedBusinessId, setLoadedBusinessId] = useState<number | null>(null)
  const [invoiceCount, setInvoiceCount] = useState(0)
  const [paymentCount, setPaymentCount] = useState(0)
  const [payments, setPayments] = useState<PaymentSummary[]>([])
  const [memberships, setMemberships] = useState<MembershipSummary[]>([])
  const [appointmentCount, setAppointmentCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [nextAppointmentLabel, setNextAppointmentLabel] = useState<string | undefined>()
  const [recentInvoices, setRecentInvoices] = useState<Array<{ id: number; title: string; amount: string; status: string; date: string }>>([])
  const [recentAppointments, setRecentAppointments] = useState<Array<{ id: number; title: string; subtitle: string; status: string }>>([])
  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null)
  const businessId = Number(id)

  useEffect(() => {
    if (!Number.isFinite(businessId)) {
      return
    }

    fetchBusinessById(businessId)
      .then((detail) => {
        setBusiness(detail ?? fallbackBusiness)
      })
      .catch(() => {
        setBusiness(fallbackBusiness)
      })
      .finally(() => setLoadedBusinessId(businessId))

    fetchDashboardData(businessId, role)
      .then((detailData) => {
        const invoices = detailData.invoices ?? []
        const payments = detailData.payments ?? []
        const appointments = detailData.appointments ?? []
        const currentUser = getCurrentUser()
        const currentEmail = currentUser?.email.trim().toLowerCase()
        const currentPhone = currentUser?.phone?.replace(/\D/g, '')
        const currentCustomer = detailData.customers.find((customer) => (
          (currentEmail && customer.email?.trim().toLowerCase() === currentEmail)
          || (currentPhone && customer.phoneNumber?.replace(/\D/g, '') === currentPhone)
        ))
        const currentCustomerId = currentCustomer?.id ?? Number(currentUser?.id)
        const customerMemberships = detailData.memberships.filter((membership) => (
          membership.businessId === businessId
          && (role !== 'CUSTOMER' || membership.customerId === currentCustomerId)
        ))

        const resolvedRevenue = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0)
        const nextAppointment = appointments
          .filter((appointment) => appointment.scheduledAt)
          .sort((first, second) => new Date(first.scheduledAt ?? 0).getTime() - new Date(second.scheduledAt ?? 0).getTime())[0]

        setInvoiceCount(invoices.length)
        setPaymentCount(payments.length)
        setPayments(payments)
        setMemberships(customerMemberships)
        if (role === 'CUSTOMER' && currentCustomer?.id) {
          fetchLoyaltyBalance(businessId, currentCustomer.id)
            .then((result) => setLoyaltyPoints(Number(result.balance ?? 0)))
            .catch(() => setLoyaltyPoints(null))
        }
        setAppointmentCount(appointments.length)
        setTotalRevenue(resolvedRevenue)
        setNextAppointmentLabel(
          nextAppointment?.scheduledAt
            ? new Date(nextAppointment.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
            : undefined,
        )
        setRecentInvoices(
          invoices.slice(0, 3).map((invoice) => ({
            id: invoice.id,
            title: invoice.invoiceNumber ?? `INV-${invoice.id}`,
            amount: `₹${Number(invoice.totalAmount ?? 0).toLocaleString('en-IN')}`,
            status: invoice.status ?? 'PAID',
            date: invoice.issueDate
              ? new Date(invoice.issueDate).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
              : 'Recently',
          })),
        )
        setRecentAppointments(
          appointments.slice(0, 3).map((appointment) => ({
            id: appointment.id,
            title: appointment.serviceName ?? `Appointment ${appointment.id}`,
            subtitle: appointment.scheduledAt
              ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
              : 'Schedule pending',
            status: appointment.status ?? 'BOOKED',
          })),
        )
      })
      .catch(() => {
        setInvoiceCount(0)
        setPaymentCount(0)
        setPayments([])
        setMemberships([])
        setAppointmentCount(0)
        setTotalRevenue(0)
        setNextAppointmentLabel(undefined)
        setRecentInvoices([])
        setRecentAppointments([])
      })
  }, [businessId, fallbackBusiness, role])

  if (!Number.isFinite(businessId)) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  if (loadedBusinessId !== businessId) {
    return <Box sx={{ minHeight: '50vh' }} />
  }

  if (!business) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return (
    role === 'CUSTOMER' ? (
      <CustomerBusinessDetailPage
        business={business}
        memberships={memberships}
        payments={payments}
        invoiceCount={invoiceCount}
        appointmentCount={appointmentCount}
        totalRevenue={totalRevenue}
        nextAppointmentLabel={nextAppointmentLabel}
        recentInvoices={recentInvoices}
        recentAppointments={recentAppointments}
        loyaltyPoints={loyaltyPoints}
      />
    ) : (
      <BusinessDetailPage
        business={business}
        invoiceCount={invoiceCount}
        paymentCount={paymentCount}
        appointmentCount={appointmentCount}
        totalRevenue={totalRevenue}
        nextAppointmentLabel={nextAppointmentLabel}
        recentInvoices={recentInvoices}
        recentAppointments={recentAppointments}
      />
    )
  )
}

function AppointmentRouteRedirect() {
  const { id } = useParams()
  const role = getCurrentUser()?.role ?? 'BUSINESS'
  const target = getDashboardPath(role, 'appointments')
  return <Navigate to={id ? `${target}?appointmentId=${id}` : target} replace />
}

function LegacyDashboardRedirect({ role }: { role: Role }) {
  const { tab } = useParams()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const targetTab = tab ?? searchParams.get('tab') ?? undefined
  searchParams.delete('tab')
  const query = searchParams.toString()
  const target = getDashboardPath(role, targetTab)

  return <Navigate to={query ? `${target}?${query}` : target} replace />
}

export default function AppRoutes() {
  const dispatch = useAppDispatch()
  const location = useLocation()
  const adminState = useAppSelector((state: RootState) => state.adminDashboard)
  const businessState = useAppSelector((state: RootState) => state.businessDashboard)
  const customerState = useAppSelector((state: RootState) => state.customerDashboard)
  const authState = useAppSelector((state: RootState) => state.auth)
  const authUser = authState.authUser ?? getCurrentUser()

  useEffect(() => {
    const handleUnauthorized = () => dispatch(setAuthUser(null))
    window.addEventListener('bhive:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('bhive:unauthorized', handleUnauthorized)
  }, [dispatch])

  useEffect(() => {
    let isMounted = true

    const refreshCurrentUser = async () => {
      const currentUser = getCurrentUser()
      if (!currentUser?.id) {
        return
      }

      const refreshedUser = await getCurrentUserProfile()
      if (refreshedUser && isMounted) {
        dispatch(setAuthUser(refreshedUser))
      }
    }

    void refreshCurrentUser()
    return () => {
      isMounted = false
    }
  }, [dispatch])

  const dashboardRole = authUser?.role ?? 'BUSINESS'
  const data = dashboardRole === 'ADMIN' ? adminState.data : dashboardRole === 'CUSTOMER' ? customerState.data : businessState.data
  const selectedBusinessId = dashboardRole === 'ADMIN' ? adminState.selectedBusinessId : dashboardRole === 'CUSTOMER' ? customerState.selectedBusinessId : businessState.selectedBusinessId

  const onDashboardPath = isDashboardPathname(location.pathname)
  const onBusinessOverview = location.pathname === getDashboardPath('BUSINESS', 'overview')
  const businessSummaryLoaded = businessState.summary !== null

  // Re-fetch only when the cached dashboard is missing, stale, or invalidated by a write.
  useEffect(() => {
    if (!authUser?.id || !onDashboardPath) {
      return
    }

    if (dashboardRole === 'ADMIN') {
      if (!isDashboardFresh(adminState, 'admin')) dispatch(fetchAdminDashboard())
      return
    }

    if (dashboardRole === 'CUSTOMER') {
      if (!isDashboardFresh(customerState, 'customer')) dispatch(fetchCustomerDashboard())
      return
    }

    const dashboardFresh = isDashboardFresh(businessState, `business:${selectedBusinessId ?? ''}`)
    if (!dashboardFresh) dispatch(fetchBusinessDashboard(selectedBusinessId ?? undefined))
    if (dashboardRole === 'BUSINESS'
      && onBusinessOverview
      && selectedBusinessId !== null
      && (!dashboardFresh || !businessSummaryLoaded)) {
      dispatch(fetchBusinessSummary(selectedBusinessId))
    }
    // The freshness fields are read on purpose but must not retrigger the effect themselves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser?.id, dashboardRole, dispatch, location.pathname, onDashboardPath, onBusinessOverview, selectedBusinessId, businessSummaryLoaded])

  const businessDetail = useMemo(
    () => data.businesses.find((business) => business.id === selectedBusinessId) ?? data.businesses[0] ?? null,
    [data.businesses, selectedBusinessId],
  )

  return (
    <Box sx={appStyles.shell}>
      <Routes>
        <Route
          path="/"
          element={<AuthPage />}
        />

        <Route
          path="/dashboard/:tab?"
          element={
            <AuthenticatedRoute>
              <LegacyDashboardRedirect role={dashboardRole} />
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/customer/dashboard/:tab?"
          element={
            <AuthenticatedRoute>
              <RoleRoute allow="CUSTOMER" role={dashboardRole}>
                <CustomerDashboard />
              </RoleRoute>
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/business/dashboard/:tab?"
          element={
            <AuthenticatedRoute>
              <RoleRoute allow="BUSINESS" role={dashboardRole}>
                <BusinessDashboard />
              </RoleRoute>
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/admin/dashboard/:tab?"
          element={
            <AuthenticatedRoute>
              <RoleRoute allow="ADMIN" role={dashboardRole}>
                <AdminDashboard />
              </RoleRoute>
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/business/:id"
          element={
            <AuthenticatedRoute>
              <BusinessDetailRoute
                fallbackBusiness={businessDetail}
                role={dashboardRole}
              />
            </AuthenticatedRoute>
          }
        />

                <Route
          path="/customer/:id"
          element={
            <AuthenticatedRoute>
              <DetailView />
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/appointments"
          element={
            <AuthenticatedRoute>
              <Navigate to={getDashboardPath(dashboardRole, 'appointments')} replace />
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/appointments/:id"
          element={
            <AuthenticatedRoute>
              <AppointmentRouteRedirect />
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/insurance"
          element={
            <AuthenticatedRoute>
              <RoleRoute allow="CUSTOMER" role={dashboardRole}>
                <InsuranceHomePage />
              </RoleRoute>
            </AuthenticatedRoute>
          }
        />

        <Route
          path="/insurance/:category"
          element={
            <AuthenticatedRoute>
              <RoleRoute allow="CUSTOMER" role={dashboardRole}>
                <InsuranceCategoryPage />
              </RoleRoute>
            </AuthenticatedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  )
}
