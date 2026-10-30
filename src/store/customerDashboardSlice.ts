import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchDashboardData, type DashboardData } from '../services/api'
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

type CustomerDashboardState = DashboardFreshness & {
  data: DashboardData
  loading: boolean
  selectedBusinessId: number | null
  selectedCustomerId: number | null
  activeTab: DashboardTab
  error: string | null
}

const initialState: CustomerDashboardState = {
  ...emptyFreshness,
  data: emptyDashboardData,
  loading: false,
  selectedBusinessId: null,
  selectedCustomerId: null,
  activeTab: 'overview',
  error: null,
}

export const fetchCustomerDashboard = createAsyncThunk('customerDashboard/fetch', async () => {
  return fetchDashboardData(undefined, 'CUSTOMER')
})

const customerDashboardSlice = createSlice({
  name: 'customerDashboard',
  initialState,
  reducers: {
    setActiveTab: (state, action: PayloadAction<DashboardTab>) => {
      state.activeTab = action.payload
    },
    setSelectedBusinessId: (state, action: PayloadAction<number | null>) => {
      state.selectedBusinessId = action.payload
    },
    setSelectedCustomerId: (state, action: PayloadAction<number | null>) => {
      state.selectedCustomerId = action.payload
    },
    resetCustomerDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomerDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchCustomerDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        Object.assign(state, markLoaded('customer'))
        if (!state.data.customers.length) {
          state.selectedCustomerId = null
        } else if (state.selectedCustomerId == null || !state.data.customers.some((customer) => customer.id === state.selectedCustomerId)) {
          state.selectedCustomerId = state.data.customers[0].id
        }
      })
      .addCase(fetchCustomerDashboard.rejected, (state, action) => {
        state.loading = false
        Object.assign(state, emptyFreshness)
        state.error = action.error.message ?? 'Unable to load the customer dashboard.'
        state.data = emptyDashboardData
      })
  },
})

export const { setActiveTab, setSelectedBusinessId, setSelectedCustomerId, resetCustomerDashboard } = customerDashboardSlice.actions
export default customerDashboardSlice.reducer
