import { alpha, Divider, Menu, MenuItem } from '@mui/material'
import { Award, BadgeCheck, Building2, CalendarCheck2, ChartColumnIncreasing, Home, Megaphone, PhoneCall, ReceiptText, UserRound, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ProfileManagerDialog } from '../../../components/ProfileManagerDialog'
import type { DashboardTab } from '../../types'
import type { Role } from '../../../services/auth'

const roleNav: Array<{ key: DashboardTab; label: string }> = [
  { key: 'overview', label: 'Home' },
  { key: 'businesses', label: 'Business' },
  { key: 'invoices', label: 'Invoices' },
  { key: 'appointments', label: 'Appointments' },
  { key: 'memberships', label: 'Memberships' },
  { key: 'loyalty', label: 'Loyalty points' },
  { key: 'retention', label: 'Retention' },
  { key: 'callbacks', label: 'Callback requests' },
  { key: 'insights', label: 'Insights' },
  { key: 'offers', label: 'Offers' },
  { key: 'profile', label: 'Profile' },
]

export type BusinessMenuProps = {
  activeTab: DashboardTab
  anchorEl: null | HTMLElement
  isOpen: boolean
  onClose: () => void
  onChangeTab: (tab: DashboardTab) => void
  onLogout: () => void
  appointmentsEnabled: boolean
  membershipsEnabled: boolean
  currentRole?: Role
  availableAccounts?: Array<{ role: Role }>
  missingProfileRoles?: Role[]
  onSwitchAccount?: (role: Role) => void
  onAddProfile?: (role: Role) => void
}

export function BusinessMenu({ activeTab, anchorEl, isOpen, onClose, onChangeTab, onLogout, appointmentsEnabled, membershipsEnabled, currentRole = 'BUSINESS', availableAccounts = [], missingProfileRoles = [], onSwitchAccount, onAddProfile }: BusinessMenuProps) {
  const [managerOpen, setManagerOpen] = useState(false)
  const visibleRoleNav = roleNav.filter((tab) => (
    (tab.key !== 'appointments' || appointmentsEnabled)
    && (tab.key !== 'memberships' || membershipsEnabled)
  ))

  return (
    <>
      <Menu
        id="business-menu"
        anchorEl={anchorEl}
        open={isOpen}
        onClose={onClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: (theme) => ({
              mt: 1,
              minWidth: 180,
              borderRadius: 2.5,
              border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
              boxShadow: `0 12px 32px ${alpha(theme.palette.common.black, 0.12)}`,
            }),
          },
        }}
      >
        {visibleRoleNav.map((tab) => (
          <MenuItem
            key={tab.key}
            selected={activeTab === tab.key}
            onClick={() => {
              onChangeTab(tab.key)
              onClose()
            }}
            sx={{ gap: 1, py: 1.1, fontWeight: 600 }}
          >
            {tab.key === 'overview' ? <Home size={16} /> : tab.key === 'businesses' ? <Building2 size={16} /> : tab.key === 'invoices' ? <ReceiptText size={16} /> : tab.key === 'appointments' ? <CalendarCheck2 size={16} /> : tab.key === 'memberships' ? <BadgeCheck size={16} /> : tab.key === 'loyalty' ? <Award size={16} /> : tab.key === 'offers' ? <Megaphone size={16} /> : tab.key === 'retention' ? <UsersRound size={16} /> : tab.key === 'callbacks' ? <PhoneCall size={16} /> : tab.key === 'insights' ? <ChartColumnIncreasing size={16} /> : <UserRound size={16} />}
            {tab.label}
          </MenuItem>
        ))}
        {(availableAccounts.length > 0 || missingProfileRoles.length > 0) && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={() => {
                setManagerOpen(true)
                onClose()
              }}
              sx={{ gap: 1, py: 1.1, fontWeight: 700 }}
            >
              <UserRound size={16} />
              Manage profiles
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={() => {
            onLogout()
            onClose()
          }}
          sx={{ gap: 1, py: 1.1, fontWeight: 700, color: 'error.main' }}
        >
          Logout
        </MenuItem>
      </Menu>

      <ProfileManagerDialog
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        currentRole={currentRole}
        availableAccounts={availableAccounts}
        missingProfileRoles={missingProfileRoles}
        onSwitchAccount={onSwitchAccount}
        onAddProfile={onAddProfile}
      />
    </>
  )
}
