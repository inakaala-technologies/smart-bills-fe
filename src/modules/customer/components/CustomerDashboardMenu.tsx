import { useState } from 'react'
import { alpha } from '@mui/material/styles'
import { Box, Menu, MenuItem } from '@mui/material'
import { UserPlus, UserRound, type LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ProfileManagerDialog } from '../../../components/ProfileManagerDialog'
import { logoutUser, type Role } from '../../../services/auth'
import type { DashboardTab } from '../../types'

type CustomerDashboardMenuProps = {
  tabs: Array<{ key: DashboardTab; label: string; icon: LucideIcon }>
  activeTab: DashboardTab
  onChangeTab: (tab: DashboardTab) => void
  anchorEl: null | HTMLElement
  isOpen: boolean
  onClose: () => void
  currentRole?: Role
  availableAccounts?: Array<{ role: Role }>
  missingProfileRoles?: Role[]
  onSwitchAccount?: (role: Role) => void
  onAddProfile?: (role: Role) => void
  onInviteFamily: () => void
}

export function CustomerDashboardMenu({
  tabs,
  activeTab,
  onChangeTab,
  anchorEl,
  isOpen,
  onClose,
  currentRole = 'CUSTOMER',
  availableAccounts = [],
  missingProfileRoles = [],
  onSwitchAccount,
  onAddProfile,
  onInviteFamily
}: CustomerDashboardMenuProps) {
  const navigate = useNavigate()
  const [managerOpen, setManagerOpen] = useState(false)

  return (
    <>
      <Menu
        id="customer-menu"
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
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <MenuItem
              key={tab.key}
              selected={activeTab === tab.key}
              onClick={() => {
                onChangeTab(tab.key)
                onClose()
              }}
              sx={{ gap: 1, py: 1.1, fontWeight: 600 }}
            >
              <Icon size={16} />
              {tab.label}
            </MenuItem>
          )
        })}

        <MenuItem
          onClick={() => {
            onInviteFamily()
            onClose()
          }}
          sx={{ gap: 1, py: 1.1, fontWeight: 600 }}
        >
          <UserPlus size={16} />
          Invite family member
        </MenuItem>

        {(availableAccounts.length > 0 || missingProfileRoles.length > 0) && (
          <>
            <Box component="div" sx={{ borderTop: '1px solid var(--mui-palette-divider)', my: 0.5 }} />
            <MenuItem
              onClick={() => {
                setManagerOpen(true)
                onClose()
              }}
              sx={{ gap: 1, py: 1.1, fontWeight: 700 }}
            >
              <UserRound size={15} />
              Manage profiles
            </MenuItem>
          </>
        )}
        <MenuItem
          onClick={() => {
            logoutUser()
            onClose()
            navigate('/')
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