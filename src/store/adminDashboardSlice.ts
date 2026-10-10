import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchDashboardData, type DashboardData } from '../services/api'
import type { DashboardTab } from '../modules/types'

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

type AdminDashboardState = {
  data: DashboardData
  loading: boolean
  selectedBusinessId: number | null
  selectedCustomerId: number | null
  activeTab: DashboardTab
  error: string | null
}

const initialState: AdminDashboardState = {
  data: emptyDashboardData,
  loading: false,
  selectedBusinessId: null,
  selectedCustomerId: null,
  activeTab: 'overview',
  error: null,
}

export const fetchAdminDashboard = createAsyncThunk('adminDashboard/fetch', async () => {
  return fetchDashboardData(undefined, 'ADMIN')
})

const adminDashboardSlice = createSlice({
  name: 'adminDashboard',
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
    resetAdminDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminDashboard.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchAdminDashboard.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload
        if (!state.data.businesses.length) {
          state.selectedBusinessId = null
        } else if (state.selectedBusinessId == null || !state.data.businesses.some((business) => business.id === state.selectedBusinessId)) {
          state.selectedBusinessId = state.data.businesses[0].id
        }
      })
      .addCase(fetchAdminDashboard.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Unable to load the admin dashboard.'
        state.data = emptyDashboardData
      })
  },
})

export const { setActiveTab, setSelectedBusinessId, setSelectedCustomerId, resetAdminDashboard } = adminDashboardSlice.actions
export default adminDashboardSlice.reducer
