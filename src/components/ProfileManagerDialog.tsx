import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  Typography,
  alpha,
} from '@mui/material'
import { Building2, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { Box } from '@mui/material'
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ pb: 1.25, fontWeight: 800 }}>Manage profiles</DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
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
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1,
                  border: `1px solid ${alpha(theme.palette.text.primary, 0.08)}`,
                  borderRadius: 2.5,
                  px: 1.4,
                  py: 1,
                  background: isCurrent ? alpha(theme.palette.primary.main, 0.04) : theme.palette.background.paper,
                })}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <BoxIcon>
                    <Icon size={16} />
                  </BoxIcon>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {isCurrent ? 'Current profile' : isAvailable ? 'Available' : 'Not added'}
                    </Typography>
                  </Box>
                </Box>

                {isCurrent ? (
                  <Button variant="contained" size="small" disabled sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
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
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
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
                    sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}
                  >
                    Add
                  </Button>
                ) : (
                  <Button variant="text" size="small" disabled sx={{ borderRadius: 999, textTransform: 'none', fontWeight: 700 }}>
                    Locked
                  </Button>
                )}
              </ListItem>
            )
          })}
        </List>

        <Divider sx={{ my: 1.5 }} />
        <Button fullWidth variant="text" onClick={onClose} sx={{ fontWeight: 700, textTransform: 'none' }}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function BoxIcon({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(15, 118, 110, 0.08)',
        color: '#0f766e',
      }}
    >
      {children}
    </div>
  )
}
