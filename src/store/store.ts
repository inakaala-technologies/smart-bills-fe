import { configureStore } from '@reduxjs/toolkit'
import adminDashboardReducer from './adminDashboardSlice'
import authReducer from './authSlice'
import businessDashboardReducer from './businessDashboardSlice'
import customerDashboardReducer from './customerDashboardSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    adminDashboard: adminDashboardReducer,
    businessDashboard: businessDashboardReducer,
    customerDashboard: customerDashboardReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
