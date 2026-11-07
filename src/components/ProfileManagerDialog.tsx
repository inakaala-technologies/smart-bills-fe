import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  Typography,
} from '@mui/material'
import { Building2, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Role } from '../services/auth'

type ProfileManagerDialogProps = {
  open: boolean
  onClose: () => void
  currentRole?: Role
  availableAccounts?: Array<{ role: Role }>
  missingProfileRoles?: Role[]
  onSwitchAccount?: (role: Role) => void
  onAddProfile?: (role: Role) => void
}

const LIME = '#CDF27E'
const INK = '#0F032D'

const pillButtonSx = {
  minWidth: 74,
  minHeight: 34,
  borderRadius: 999,
  textTransform: 'none',
  fontWeight: 600,
  boxShadow: 'none',
  flexShrink: 0,
} as const

export function ProfileManagerDialog({
  open,
  onClose,
  currentRole,
  availableAccounts = [],
  missingProfileRoles = [],
  onSwitchAccount,
  onAddProfile,
}: ProfileManagerDialogProps) {
  const profileOptions: Array<{ role: Role; label: string; icon: typeof Building2 }> = [
    { role: 'BUSINESS', label: 'Business profile', icon: Building2 },
    { role: 'CUSTOMER', label: 'Customer profile', icon: UserRound },
  ]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: {
          sx: {
            borderRadius: '24px',
            backgroundColor: 'background.paper',
            backgroundImage: 'none',
            border: '1px solid var(--mui-palette-divider)',
          },
        },
      }}
    >
      <DialogTitle sx={{ pb: 1.25, fontWeight: 600, color: 'text.primary' }}>Manage profiles</DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1.5, color: 'text.secondary' }}>
          You can keep one business profile and one customer profile, or both at the same time.
        </Typography>

        <List disablePadding sx={{ display: 'grid', gap: 1 }}>
          {profileOptions.map(({ role, label, icon: Icon }) => {
            const isCurrent = currentRole === role
            const isAvailable = availableAccounts.some((account) => account.role === role) || isCurrent
            const isMissing = missingProfileRoles.includes(role)

            return (
              <ListItem
                key={role}
                disablePadding
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  // Theme-token strings (not theme.palette.*) so light AND dark mode both resolve correctly
                  border: '1px solid',
                  borderColor: isCurrent ? 'primary.main' : 'divider',
                  borderRadius: '14px',
                  px: 1.4,
                  py: 1.1,
                  bgcolor: 'action.hover',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                  <IconTile>
                    <Icon size={17} />
                  </IconTile>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>{label}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {isCurrent ? 'Current profile' : isAvailable ? 'Available' : 'Not added'}
                    </Typography>
                  </Box>
                </Box>

                {isCurrent ? (
                  <Button
                    variant="contained"
                    size="small"
                    disabled
                    sx={{
                      ...pillButtonSx,
                      '&.Mui-disabled': { bgcolor: 'action.selected', color: 'primary.main', opacity: 1 },
                    }}
                  >
                    Active
                  </Button>
                ) : isAvailable ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      onSwitchAccount?.(role)
                      onClose()
                    }}
                    sx={{ ...pillButtonSx, borderColor: 'primary.main', color: 'primary.main' }}
                  >
                    Switch
                  </Button>
                ) : isMissing ? (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => {
                      onAddProfile?.(role)
                      onClose()
                    }}
                    sx={{ ...pillButtonSx, bgcolor: LIME, color: INK, '&:hover': { bgcolor: '#C2E86C', boxShadow: 'none' } }}
                  >
                    Add
                  </Button>
                ) : (
                  <Button variant="text" size="small" disabled sx={pillButtonSx}>
                    Locked
                  </Button>
                )}
              </ListItem>
            )
          })}
        </List>

        <Divider sx={{ my: 1.5 }} />
        <Button fullWidth variant="text" onClick={onClose} sx={{ fontWeight: 600, textTransform: 'none', color: 'primary.main' }}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function IconTile({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'action.selected',
        color: 'primary.main',
      }}
    >
      {children}
    </Box>
  )
}