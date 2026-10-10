import { Button, Card, CardContent, MenuItem, TextField, Typography, Box, Stack } from '@mui/material'
import { Plus } from 'lucide-react'
import type { Role } from '../../../services/auth'
import { LocationPicker, type LocationValue } from '../../../components/LocationPicker'
import { BUSINESS_TYPES } from '../../../constants/businessTypes'

export type BusinessProfileCardProps = {
  authUser: { id: string; name: string; email: string; phone?: string; role: Role } | null
  businessForm: { name: string; legalName: string; email: string; phone: string; address: string; businessType: string }
  location: LocationValue
  profileId?: string
  isCreatingBusiness: boolean
  businessMessage: string
  onBusinessFieldChange: (field: 'name' | 'legalName' | 'phone' | 'address' | 'businessType', value: string) => void
  onLocationChange: (value: LocationValue) => void
  onSave: () => void
}

export function BusinessProfileCard({ authUser, businessForm, location, profileId, isCreatingBusiness, businessMessage, onBusinessFieldChange, onLocationChange, onSave }: BusinessProfileCardProps) {
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

          <Button variant="contained" disabled={isCreatingBusiness} onClick={onSave} startIcon={<Plus size={15} />} sx={{ borderRadius: 2.8, textTransform: 'none', fontWeight: 800 }}>
            {isCreatingBusiness ? 'Saving...' : 'Save business profile'}
          </Button>

          {businessMessage ? <Typography variant="caption" color={businessMessage.includes('failed') || businessMessage.includes('Could not') ? 'error.main' : 'success.main'}>{businessMessage}</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
