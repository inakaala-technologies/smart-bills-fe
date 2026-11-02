import { Plus, Package, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Alert, Button, Card, CardContent, FormControlLabel, MenuItem, Switch, TextField, Typography, Box, Stack } from '@mui/material'
import type { Role } from '../../../services/auth'
import { LocationPicker, type LocationValue } from '../../../components/LocationPicker'
import { BUSINESS_TYPES } from '../../../constants/businessTypes'

export type BusinessFeature = 'appointments' | 'memberships' | 'homeServices'

export type BusinessProfileCardProps = {
  authUser: { id: string; name: string; email: string; phone?: string; role: Role } | null
  businessForm: { name: string; legalName: string; email: string; phone: string; address: string; businessType: string }
  location: LocationValue
  profileId?: string
  isCreatingBusiness: boolean
  businessMessage: string
  appointmentsEnabled: boolean
  membershipsEnabled: boolean
  onBusinessFieldChange: (field: 'name' | 'legalName' | 'phone' | 'address' | 'businessType', value: string) => void
  onLocationChange: (value: LocationValue) => void
  onFeatureToggle: (feature: BusinessFeature, enabled: boolean) => Promise<{ ok: boolean; message?: string }>
  onSave: () => void
  onManageProducts: () => void
  activeProductCount?: number
}

export function BusinessProfileCard({ authUser, businessForm, location, profileId, isCreatingBusiness, businessMessage, appointmentsEnabled, membershipsEnabled, onBusinessFieldChange, onLocationChange, onFeatureToggle, onSave ,onManageProducts, activeProductCount = 0 }: BusinessProfileCardProps) {
  const [savingFeature, setSavingFeature] = useState<BusinessFeature | null>(null)
  const [featureMessage, setFeatureMessage] = useState('')

  const handleFeatureToggle = async (feature: BusinessFeature, enabled: boolean) => {
    setSavingFeature(feature)
    setFeatureMessage('')
    const result = await onFeatureToggle(feature, enabled)
    setSavingFeature(null)
    if (!result.ok) {
      setFeatureMessage(result.message ?? 'Could not update this feature.')
    }
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3.2, border: '1px solid var(--mui-palette-divider)', backgroundColor: 'background.paper', boxShadow: '0 12px 22px rgba(0,0,0,0.14)' }}>
      <CardContent sx={{ p: 1.7 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.6 }}>Business profile</Typography>
        <Stack spacing={1.2}>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.2, borderRadius: 2, border: '1px solid var(--mui-palette-divider)' }}>
            <Typography variant="caption" color="text.secondary">Business Profile ID</Typography>
            <Typography sx={{ color: 'primary.main', fontWeight: 900, letterSpacing: '0.06em' }}>{profileId ?? 'Assigning ID…'}</Typography>
          </Box>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.4, borderRadius: 2.6, border: '1px solid var(--mui-palette-divider)' }}>
            <Typography variant="caption" color="text.secondary">Business owner</Typography>
            <Typography sx={{ fontWeight: 800 }}>{authUser?.name ?? 'Business user'}</Typography>
          </Box>

          <TextField size="small" label="Business name" value={businessForm.name} onChange={(event) => onBusinessFieldChange('name', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField size="small" label="Legal name" value={businessForm.legalName} onChange={(event) => onBusinessFieldChange('legalName', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField
            select
            required
            size="small"
            label="Business type"
            value={businessForm.businessType}
            onChange={(event) => onBusinessFieldChange('businessType', event.target.value)}
            sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }}
          >
            <MenuItem value="" disabled>Select a business type</MenuItem>
            {businessForm.businessType && !BUSINESS_TYPES.some((type) => type.value === businessForm.businessType) && (
              <MenuItem value={businessForm.businessType}>{businessForm.businessType}</MenuItem>
            )}
            {BUSINESS_TYPES.map((type) => <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>)}
          </TextField>

          {/* Products management row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              p: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2.5,
              backgroundColor: 'action.hover',
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <Package size={22} />
              <Box>
                <Typography sx={{ fontWeight: 800 }}>
                  Products
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeProductCount} saved products
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="outlined"
              size="small"
              endIcon={<ChevronRight size={16} />}
              onClick={onManageProducts}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              Manage
            </Button>
          </Box>
          <TextField
            size="small"
            label="Email"
            value={businessForm.email}
            slotProps={{ input: { readOnly: true } }}
            sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'action.hover' } }}
          />
          <Box sx={{ backgroundColor: 'action.hover', p: 1.3, borderRadius: 2.4, border: '1px solid var(--mui-palette-divider)' }}>
            <Typography variant="caption" color="text.secondary">Mobile number</Typography>
            <Typography sx={{ fontWeight: 700 }}>{authUser?.phone ?? 'Not provided'}</Typography>
          </Box>
          <TextField size="small" label="Phone" value={businessForm.phone} onChange={(event) => onBusinessFieldChange('phone', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <LocationPicker value={location} onChange={onLocationChange} />

          <Box sx={{ p: 1.3, borderRadius: 2.4, border: '1px solid var(--mui-palette-divider)' }}>
            <Typography sx={{ fontWeight: 850 }}>Business features</Typography>
            <Typography variant="caption" color="text.secondary">Choose which features appear in your workspace.</Typography>
            <Stack spacing={0.5} sx={{ mt: 0.8 }}>
              <FormControlLabel
                label={<Box><Typography variant="body2" sx={{ fontWeight: 750 }}>Appointments</Typography><Typography variant="caption" color="text.secondary">Show booking tools and appointment options.</Typography></Box>}
                control={<Switch checked={appointmentsEnabled} disabled={savingFeature !== null} onChange={(event) => void handleFeatureToggle('appointments', event.target.checked)} slotProps={{ input: { 'aria-label': 'Enable appointments feature' } }} />}
                labelPlacement="start"
                sx={{ m: 0, justifyContent: 'space-between', '& .MuiFormControlLabel-label': { flex: 1 } }}
              />
              <FormControlLabel
                label={<Box><Typography variant="body2" sx={{ fontWeight: 750 }}>Membership</Typography><Typography variant="caption" color="text.secondary">Show membership tools and options.</Typography></Box>}
                control={<Switch checked={membershipsEnabled} disabled={savingFeature !== null} onChange={(event) => void handleFeatureToggle('memberships', event.target.checked)} slotProps={{ input: { 'aria-label': 'Enable membership feature' } }} />}
                labelPlacement="start"
                sx={{ m: 0, justifyContent: 'space-between', '& .MuiFormControlLabel-label': { flex: 1 } }}
              />
            </Stack>
            {featureMessage && <Alert severity="error" sx={{ mt: 1 }}>{featureMessage}</Alert>}
          </Box>

          <Button variant="contained" disabled={isCreatingBusiness} onClick={onSave} startIcon={<Plus size={15} />} sx={{ borderRadius: 2.8, textTransform: 'none', fontWeight: 800 }}>
            {isCreatingBusiness ? 'Saving...' : 'Save business profile'}
          </Button>

          {businessMessage ? <Typography variant="caption" color={businessMessage.includes('failed') || businessMessage.includes('Could not') ? 'error.main' : 'success.main'}>{businessMessage}</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
