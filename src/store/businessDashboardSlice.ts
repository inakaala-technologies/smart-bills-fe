import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchBusinessDashboardSummary, fetchDashboardData, fetchMembershipPlans, type BusinessDashboardSummary, type DashboardData, type MembershipPlanSummary } from '../services/api'
import type { DashboardTab } from '../modules/types'
import { emptyFreshness, markLoaded, type DashboardFreshness } from './dashboardFreshness'

const emptyDashboardData: DashboardData = {
  businesses: [],
  customers: [],
  products: [],
  invoices: [],
  payments: [],
  appointments: [],
  memberships: [],
  membershipNotifications: [],
  documents: [],
}

type BusinessDashboardState = DashboardFreshness & {
  data: DashboardData
  summary: BusinessDashboardSummary | null
  membershipPlansByBusiness: Record<number, { plans: MembershipPlanSummary[]; loading: boolean; loaded: boolean; error: string | null }>
  summaryLoading: boolean
  loading: boolean
  selectedBusinessId: number | null
  activeTab: DashboardTab
  error: string | null
}

const initialState: BusinessDashboardState = {
  ...emptyFreshness,
  data: emptyDashboardData,
  summary: null,
  membershipPlansByBusiness: {},
  summaryLoading: false,
  loading: false,
  selectedBusinessId: null,
  activeTab: 'overview',
  error: null,
}

export const fetchBusinessDashboard = createAsyncThunk('businessDashboard/fetch', async (businessId?: number) => {
  return fetchDashboardData(businessId, 'BUSINESS')
})

export const fetchBusinessSummary = createAsyncThunk('businessDashboard/fetchSummary', async (businessId: number) => {
  return fetchBusinessDashboardSummary(businessId)
})

type MembershipPlansThunkState = {
  businessDashboard: Pick<BusinessDashboardState, 'membershipPlansByBusiness'>
}

export const fetchBusinessMembershipPlans = createAsyncThunk<
  { businessId: number; plans: MembershipPlanSummary[] },
  number,
  { state: MembershipPlansThunkState }
>(
  'businessDashboard/fetchMembershipPlans',
  async (businessId) => ({ businessId, plans: await fetchMembershipPlans(businessId) }),
  {
    condition: (businessId, { getState }) => {
      const cached = getState().businessDashboard.membershipPlansByBusiness[businessId]
      return !cached?.loaded && !cached?.loading
    },
  },
)

const businessDashboardSlice = createSlice({
  name: 'businessDashboard',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<DashboardTab>) => {
      state.activeTab = action.payload
    },
    setBusinessMembershipPlans: (state, action: PayloadAction<{ businessId: number; plans: MembershipPlanSummary[] }>) => {
      state.membershipPlansByBusiness[action.payload.businessId] = {
        plans: action.payload.plans,
        loading: false,
        loaded: true,
        error: null,
      }
    },
    setSelectedBusinessId: (state, action: PayloadAction<number | null>) => {
      if (state.selectedBusinessId !== action.payload) {
        state.summary = null
        state.summaryLoading = false
      }
      state.selectedBusinessId = action.payload
    },
    setBusinessFeatures: (state, action: PayloadAction<{ businessId: number; appointmentsEnabled: boolean;     membershipsEnabled: boolean; homeServicesEnabled?: boolean }>) => {
      const business = state.data.businesses.find((item) => item.id === action.payload.businessId)
      if (!business) return
      business.appointmentsEnabled = action.payload.appointmentsEnabled
          business.homeServicesEnabled = action.payload.homeServicesEnabled ?? false
      business.membershipsEnabled = action.payload.membershipsEnabled
    },
    setBusinessHomeVisitCharge: (state, action: PayloadAction<{ businessId: number; homeVisitCharge: number }>) => {
      const business = state.data.businesses.find((item) => item.id === action.payload.businessId)
      if (business) business.homeVisitCharge = action.payload.homeVisitCharge
    },
    resetBusinessDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBusinessDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchBusinessDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        const previousBusinessId = state.selectedBusinessId
        if (!state.data.businesses.length) {
          state.selectedBusinessId = null
        } else if (state.selectedBusinessId == null || !state.data.businesses.some((business) => business.id === state.selectedBusinessId)) {
          state.selectedBusinessId = state.data.businesses[0].id
        }
        if (state.selectedBusinessId !== previousBusinessId) {
          state.summary = null
          state.summaryLoading = false
        }
        Object.assign(state, markLoaded(`business:${state.selectedBusinessId ?? ''}`))
      })
      .addCase(fetchBusinessDashboard.rejected, (state, action) => {
        state.loading = false
        Object.assign(state, emptyFreshness)
        state.error = action.error.message ?? 'Unable to load the business dashboard.'
        state.data = emptyDashboardData
      })
      .addCase(fetchBusinessSummary.pending, (state, action) => {
        if (state.selectedBusinessId === action.meta.arg) state.summaryLoading = true
      })
      .addCase(fetchBusinessSummary.fulfilled, (state, action) => {
        if (state.selectedBusinessId !== action.meta.arg) return
        state.summaryLoading = false
        state.summary = action.payload
      })
      .addCase(fetchBusinessSummary.rejected, (state, action) => {
        if (state.selectedBusinessId !== action.meta.arg) return
        state.summaryLoading = false
        state.summary = null
      })
      .addCase(fetchBusinessMembershipPlans.pending, (state, action) => {
        const entry = state.membershipPlansByBusiness[action.meta.arg] ?? {
          plans: [],
          loading: false,
          loaded: false,
          error: null,
        }
        entry.loading = true
        entry.error = null
        state.membershipPlansByBusiness[action.meta.arg] = entry
      })
      .addCase(fetchBusinessMembershipPlans.fulfilled, (state, action) => {
        state.membershipPlansByBusiness[action.payload.businessId] = {
          plans: action.payload.plans,
          loading: false,
          loaded: true,
          error: null,
        }
      })
      .addCase(fetchBusinessMembershipPlans.rejected, (state, action) => {
        const entry = state.membershipPlansByBusiness[action.meta.arg]
        if (!entry) return
        entry.loading = false
        entry.error = action.error.message ?? 'Unable to load membership plans.'
      })
  },
})

export const { setActiveTab, setBusinessMembershipPlans, setSelectedBusinessId, setBusinessFeatures, setBusinessHomeVisitCharge, resetBusinessDashboard } = businessDashboardSlice.actions
export default businessDashboardSlice.reducer
