import { useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  Button,
  ButtonBase,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { ChevronRight, CircleHelp, FileText, LogOut, Pencil, Save, Settings, ShieldCheck } from 'lucide-react'
import { BusinessTypeIcon } from '../../../components/BusinessTypeIcon'
import { LocationPicker, type LocationValue } from '../../../components/LocationPicker'
import type { DashboardData } from '../../../services/api'
import { updateCurrentUserProfile, type AuthUser } from '../../../services/auth'

type CustomerProfilePanelProps = {
  authUser: AuthUser | null
  data: DashboardData
  onProfileUpdated: (user: AuthUser) => void
  onOpenManageDialog: () => void
  onOpenBusinesses: () => void
  onOpenDocuments: () => void
  onOpenBusiness: (businessId: number) => void
  onLogout: () => void
}

export function CustomerProfilePanel({ authUser, data, onProfileUpdated, onOpenManageDialog, onOpenBusinesses, onOpenDocuments, onOpenBusiness, onLogout }: CustomerProfilePanelProps) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState<LocationValue>({ locationAddress: '', latitude: null, longitude: null })
  const [editError, setEditError] = useState('')
  const [profileNotice, setProfileNotice] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const customerEmail = authUser?.email.trim().toLowerCase()
  const customerPhone = authUser?.phone?.replace(/\D/g, '')
  const linkedCustomer = data.customers.find((customer) => (
    (customerEmail && customer.email?.trim().toLowerCase() === customerEmail)
    || (customerPhone && customer.phoneNumber?.replace(/\D/g, '') === customerPhone)
  ))
  const currentCustomerId = linkedCustomer?.id ?? Number(authUser?.id)
  const memberBusinessIds = new Set(
    data.memberships
      .filter((membership) => (
        membership.customerId === currentCustomerId
        && membership.businessId !== undefined
        && !['EXPIRED', 'CANCELLED'].includes(membership.status?.toUpperCase() ?? '')
      ))
      .map((membership) => membership.businessId as number),
  )
  const initials = (authUser?.name ?? 'Customer')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  const businessContacts = data.businesses.filter((business) => business.email || business.phone)

  const openProfileEditor = () => {
    setEditName(authUser?.name ?? '')
    setEditPhone(authUser?.phone ?? '')
    setEditLocation({
      locationAddress: linkedCustomer?.locationAddress ?? '',
      latitude: linkedCustomer?.latitude ?? null,
      longitude: linkedCustomer?.longitude ?? null,
    })
    setEditError('')
    setProfileNotice('')
    setEditOpen(true)
  }

  const saveProfile = async () => {
    setSavingProfile(true)
    setEditError('')
    const result = await updateCurrentUserProfile({ name: editName, phone: editPhone, location: editLocation })
    if (!result.ok || !result.user) {
      setEditError(result.message ?? 'Could not update your profile.')
      setSavingProfile(false)
      return
    }

    onProfileUpdated(result.user)
    setProfileNotice('Profile details updated.')
    setEditOpen(false)
    setSavingProfile(false)
  }

  const profileActions = [
    { label: 'My Documents', icon: FileText, onClick: onOpenDocuments, trailing: data.documents.length > 0 ? `${data.documents.length}` : undefined },
    { label: 'Settings', icon: Settings, onClick: onOpenManageDialog },
    { label: 'Help & Support', icon: CircleHelp, onClick: () => setHelpOpen(true) },
    { label: 'Log Out', icon: LogOut, onClick: onLogout, danger: true },
  ]

  return (
    <Stack spacing={1.35}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.3, px: 0.4, py: 0.4 }}>
        <Avatar sx={{ width: 62, height: 62, flexShrink: 0, bgcolor: 'success.light', color: 'success.dark', border: '2px solid var(--mui-palette-background-paper)', boxShadow: '0 2px 8px rgba(0,0,0,0.18)', fontSize: 18, fontWeight: 800 }}>
          {initials || 'C'}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ color: 'text.primary', fontSize: 16, fontWeight: 800 }}>{authUser?.name ?? 'Customer'}</Typography>
          <Typography noWrap sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11.5 }}>{authUser?.phone ?? 'Phone not provided'}</Typography>
          <Typography noWrap sx={{ mt: 0.1, color: 'text.secondary', fontSize: 11 }}>{authUser?.email ?? 'Email not provided'}</Typography>
          <Typography sx={{ mt: 0.3, color: 'primary.main', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em' }}>
            Profile ID: {linkedCustomer?.profileId ?? 'Assigning ID…'}
          </Typography>
          <Chip icon={<ShieldCheck size={12} />} label="Customer" size="small" sx={{ mt: 0.6, height: 21, bgcolor: 'success.light', color: 'success.dark', fontSize: 9.5, fontWeight: 800, '& .MuiChip-icon': { color: 'inherit', ml: 0.6 } }} />
        </Box>
        <Stack direction="row" spacing={0.3} sx={{ alignSelf: 'flex-start', mt: 0.2 }}>
          <Button size="small" startIcon={<Pencil size={14} />} onClick={openProfileEditor} sx={{ minWidth: 0, px: 0.8, color: 'primary.main', fontSize: 11, fontWeight: 800, textTransform: 'none' }}>Edit</Button>
          <IconButton aria-label="Settings" onClick={onOpenManageDialog} sx={{ color: 'text.secondary' }}><Settings size={21} /></IconButton>
        </Stack>
      </Box>
      {profileNotice && <Alert severity="success" onClose={() => setProfileNotice('')}>{profileNotice}</Alert>}

      <Dialog open={editOpen} onClose={() => !savingProfile && setEditOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Edit profile</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField label="Full name" value={editName} onChange={(event) => setEditName(event.target.value)} required autoFocus />
            <TextField label="Email" value={authUser?.email ?? ''} type="email" disabled helperText="Email cannot be changed here." />
            <TextField label="Mobile number" value={editPhone} onChange={(event) => setEditPhone(event.target.value)} type="tel" />
            <LocationPicker value={editLocation} onChange={setEditLocation} />
            {editError && <Alert severity="error">{editError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditOpen(false)} disabled={savingProfile} sx={{ color: 'text.secondary', textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" startIcon={<Save size={16} />} onClick={() => void saveProfile()} disabled={savingProfile || !editName.trim() || !editLocation.country || !editLocation.region || !editLocation.city}>
            {savingProfile ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogActions>
      </Dialog>

      <Card variant="outlined" sx={{ borderRadius: 2.4, borderColor: 'divider', boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }}>
        <CardContent sx={{ p: 1.45, '&:last-child': { pb: 1.1 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.55 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 800 }}>My Businesses</Typography>
            <Button size="small" endIcon={<ChevronRight size={14} />} onClick={onOpenBusinesses} sx={{ minWidth: 0, px: 0.4, color: 'text.secondary', fontSize: 10.5, fontWeight: 700, textTransform: 'none' }}>View all</Button>
          </Box>
          {data.businesses.length > 0 ? (
            <Stack divider={<Box sx={{ borderBottom: '1px solid var(--mui-palette-divider)', ml: 6.2 }} />}>
              {data.businesses.map((business) => {
                const name = business.businessName ?? business.name ?? `Business ${business.id}`
                const isMember = memberBusinessIds.has(business.id)
                return (
                  <ButtonBase key={business.id} onClick={() => onOpenBusiness(business.id)} sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%', minHeight: 62, gap: 1.15, py: 0.55, textAlign: 'left', borderRadius: 1.3 }}>
                    <Box sx={{ width: 42, height: 42, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', color: '#ffffff', background: isMember ? 'linear-gradient(135deg, #087c63 0%, #065c60 100%)' : 'linear-gradient(135deg, #1883b2 0%, #12688d 100%)' }}>
                      <BusinessTypeIcon businessType={business.businessType} size={20} />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ color: 'text.primary', fontSize: 12, fontWeight: 700 }}>{name}</Typography>
                      <Chip label={isMember ? 'Member' : 'Customer'} size="small" sx={{ mt: 0.25, height: 17, bgcolor: 'success.light', color: 'success.dark', fontSize: 8.5, fontWeight: 800, '& .MuiChip-label': { px: 0.75 } }} />
                    </Box>
                    <ChevronRight size={17} color="var(--mui-palette-text-secondary)" />
                  </ButtonBase>
                )
              })}
            </Stack>
          ) : (
            <Typography sx={{ py: 2, color: 'text.secondary', fontSize: 11 }}>Businesses you work with will appear here.</Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 2.4, borderColor: 'divider', boxShadow: '0 4px 14px rgba(0,0,0,0.14)' }}>
        <CardContent sx={{ p: 1.2, '&:last-child': { pb: 0.8 } }}>
          {profileActions.map(({ label, icon: Icon, onClick, trailing, danger }, index) => (
            <ButtonBase key={label} onClick={onClick} sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%', minHeight: 42, gap: 1.2, px: 0.2, borderBottom: index < profileActions.length - 1 ? '1px solid var(--mui-palette-divider)' : 'none', color: danger ? 'error.main' : 'text.primary', textAlign: 'left' }}>
              <Icon size={18} strokeWidth={2.3} />
              <Typography sx={{ flex: 1, color: danger ? 'error.main' : 'text.primary', fontSize: 11, fontWeight: 700 }}>{label}</Typography>
              {trailing && <Chip label={`${trailing} files`} size="small" color="error" sx={{ height: 19, fontSize: 8.5, fontWeight: 800, '& .MuiChip-label': { px: 0.75 } }} />}
              <ChevronRight size={15} color={danger ? 'var(--mui-palette-error-main)' : 'var(--mui-palette-text-secondary)'} />
            </ButtonBase>
          ))}
        </CardContent>
      </Card>

      <Dialog open={helpOpen} onClose={() => setHelpOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 800 }}>Help &amp; Support</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1.2, color: 'text.secondary', fontSize: 13 }}>Contact a business directly for help with its services or memberships.</Typography>
          {businessContacts.length > 0 ? (
            <Stack spacing={1}>
              {businessContacts.map((business) => (
                <Box key={business.id} sx={{ p: 1.2, border: '1px solid var(--mui-palette-divider)', borderRadius: 1.5 }}>
                  <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: 800 }}>{business.businessName ?? business.name ?? `Business ${business.id}`}</Typography>
                  {business.email && <Typography component="a" href={`mailto:${business.email}`} sx={{ display: 'block', mt: 0.35, color: 'primary.main', fontSize: 11 }}>{business.email}</Typography>}
                  {business.phone && <Typography component="a" href={`tel:${business.phone}`} sx={{ display: 'block', mt: 0.25, color: 'primary.main', fontSize: 11 }}>{business.phone}</Typography>}
                </Box>
              ))}
            </Stack>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Business contact details are not available yet.</Typography>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHelpOpen(false)} sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'none' }}>Close</Button></DialogActions>
      </Dialog>
    </Stack>
  )
}