import { useEffect, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, FormControlLabel, LinearProgress, Stack, Switch, TextField, Typography } from '@mui/material'
import { CalendarDays, Plus, Save } from 'lucide-react'
import { fetchAppointmentServices, saveAppointmentServices, setBusinessAppointmentsEnabled, type AppointmentServiceRequest, type AppointmentServiceSummary } from '../../../services/api'

type AppointmentServiceManagerProps = {
  businessId: number
  appointmentsEnabled: boolean
  homeServicesEnabled?: boolean
  homeVisitCharge?: number
  onToggleHomeServices?: (enabled: boolean) => Promise<{ ok: boolean; message?: string }>
  onSaveHomeVisitCharge?: (charge: number) => Promise<{ ok: boolean; message?: string }>
  onConfigurationChanged: () => void
}

function HomeVisitChargeField({ charge, onSave }: { charge: number; onSave: (charge: number) => Promise<{ ok: boolean; message?: string }> }) {
  const [value, setValue] = useState(String(charge))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const parsed = Number(value)
  const invalid = value.trim() === '' || !Number.isFinite(parsed) || parsed < 0
  const handleSave = async () => {
    setSaving(true)
    setError('')
    const result = await onSave(parsed)
    setSaving(false)
    if (!result.ok) setError(result.message ?? 'Could not save the visiting charge.')
  }
  return (
    <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
      <Typography variant="body2" sx={{ fontWeight: 750 }}>Home visit charge</Typography>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', mt: 1 }}>
        <TextField size="small" type="number" label="Visiting charge (₹)" value={value} onChange={(event) => setValue(event.target.value)} error={invalid} helperText="Added to the booking when a customer chooses a home visit." slotProps={{ htmlInput: { min: 0, step: '0.01' } }} sx={{ flex: 1 }} />
        <Button variant="outlined" size="small" disabled={invalid || saving || parsed === charge} onClick={() => void handleSave()} sx={{ mt: 0.3, textTransform: 'none' }}>{saving ? 'Saving…' : 'Save'}</Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
    </Box>
  )
}

function newService(): AppointmentServiceRequest {
  return { name: '', description: '', price: 0, durationMinutes: 30, enabled: true }
}

export function AppointmentServiceManager({ businessId, appointmentsEnabled, homeServicesEnabled = false, homeVisitCharge = 0, onSaveHomeVisitCharge, onToggleHomeServices, onConfigurationChanged }: AppointmentServiceManagerProps) {
  const [enabled, setEnabled] = useState(appointmentsEnabled)
  const [services, setServices] = useState<AppointmentServiceRequest[]>([])
  const [message, setMessage] = useState('')
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error'>('success')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isActive = true
    fetchAppointmentServices(businessId).then((records) => {
      if (!isActive) return
      setServices(records.map(({ id, name, description, price, durationMinutes, enabled: serviceEnabled }) => ({
        id,
        name,
        description: description ?? '',
        price,
        durationMinutes,
        enabled: serviceEnabled,
      })))
      setIsLoading(false)
    }).catch(() => {
      if (isActive) setIsLoading(false)
    })
    return () => {
      isActive = false
    }
  }, [businessId])

  const [isTogglingHome, setIsTogglingHome] = useState(false)

  const handleHomeServicesToggle = async (next: boolean) => {
    if (!onToggleHomeServices) return
    setIsTogglingHome(true)
    setMessage('')
    const result = await onToggleHomeServices(next)
    setIsTogglingHome(false)
    if (!result.ok) {
      setMessage(result.message ?? 'Could not update home services.')
      setMessageSeverity('error')
    }
  }

  const handleToggle = async (nextEnabled: boolean) => {
    if (nextEnabled && !services.some((service) => service.enabled)) {
      setMessage('Add and save at least one active service before enabling appointments.')
      setMessageSeverity('error')
      return
    }

    setMessage('')
    const result = await setBusinessAppointmentsEnabled(businessId, nextEnabled)
    if (!result.ok) {
      setMessage(result.message ?? 'Could not update appointment availability.')
      setMessageSeverity('error')
      return
    }
    setEnabled(nextEnabled)
    setMessage(nextEnabled ? 'Appointments are available to customers.' : 'Appointments are turned off.')
    setMessageSeverity('success')
    onConfigurationChanged()
  }

  const updateService = (index: number, changes: Partial<AppointmentServiceRequest>) => {
    setServices((current) => current.map((service, itemIndex) => itemIndex === index ? { ...service, ...changes } : service))
  }

  const handleSave = async () => {
    const hasInvalidService = services.some((service) => (
      !service.name.trim()
      || !Number.isFinite(service.price)
      || service.price < 0
      || !Number.isInteger(service.durationMinutes)
      || service.durationMinutes < 5
      || service.durationMinutes > 480
    ))
    if (hasInvalidService) {
      setMessage('Each service needs a name, a non-negative price, and a duration between 5 and 480 minutes.')
      setMessageSeverity('error')
      return
    }

    setIsSaving(true)
    setMessage('')
    const result = await saveAppointmentServices(businessId, services)
    setIsSaving(false)
    if (!result.ok || !result.services) {
      setMessage(result.message ?? 'Could not save services.')
      setMessageSeverity('error')
      return
    }

    setServices(result.services.map((service: AppointmentServiceSummary) => ({
      id: service.id,
      name: service.name,
      description: service.description ?? '',
      price: service.price,
      durationMinutes: service.durationMinutes,
      enabled: service.enabled,
    })))
    setMessage('Service list saved.')
    setMessageSeverity('success')
    onConfigurationChanged()
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider' }}>
      <CardContent>
        <Stack spacing={1.6}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
              <Box sx={{ width: 36, height: 36, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 1.3, bgcolor: 'primary.light', color: 'primary.dark' }}><CalendarDays size={18} /></Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Appointment services</Typography>
                <Typography variant="body2" color="text.secondary">Manage customer booking options and prices.</Typography>
              </Box>
            </Stack>
            <Chip size="small" label={`${services.filter((service) => service.enabled).length} active`} color={enabled ? 'success' : 'default'} variant="outlined" sx={{ alignSelf: { xs: 'flex-start', sm: 'center' }, fontWeight: 700 }} />
          </Stack>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 750 }}>Online booking</Typography>
              <Typography variant="caption" color="text.secondary">{enabled ? 'Customers can request available times.' : 'Bookings are hidden from customers.'}</Typography>
            </Box>
            <FormControlLabel
              sx={{ mr: 0, ml: 0.5, flexShrink: 0 }}
              control={<Switch checked={enabled} onChange={(event) => handleToggle(event.target.checked)} slotProps={{ input: { 'aria-label': 'Enable online appointments' } }} />}
              label=""
            />
          </Box>
          {message && <Alert severity={messageSeverity}>{message}</Alert>}

          {onToggleHomeServices && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1, borderRadius: 1.5, bgcolor: 'action.hover' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 750 }}>Home services</Typography>
                <Typography variant="caption" color="text.secondary">{enabled ? 'Let customers know you visit them at home.' : 'Turn on online booking to offer home services.'}</Typography>
              </Box>
              <Switch
                checked={enabled && homeServicesEnabled}
                disabled={!enabled || isTogglingHome}
                onChange={(event) => void handleHomeServicesToggle(event.target.checked)}
                slotProps={{ input: { 'aria-label': 'Enable home services' } }}
              />
            </Box>
          )}
          {homeServicesEnabled && onSaveHomeVisitCharge && (
            <HomeVisitChargeField key={homeVisitCharge} charge={homeVisitCharge} onSave={onSaveHomeVisitCharge} />
          )}

          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>Bookable services</Typography>
              <Typography variant="caption" color="text.secondary">Set duration, price, and availability per service.</Typography>
            </Box>
            <Button
              size="small"
              startIcon={<Plus size={15} />}
              onClick={() => setServices((current) => [...current, newService()])}
              sx={{ flexShrink: 0, textTransform: 'none' }}
            >
              Add service
            </Button>
          </Stack>

          {isLoading ? (
            <LinearProgress />
          ) : services.length === 0 ? (
            <Alert severity="info">No services yet. Add at least one service before customers can book.</Alert>
          ) : (
            <Stack spacing={1.3}>
              {services.map((service, index) => (
                <Box key={service.id ?? `new-${index}`} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.3 }}>
                  <Stack spacing={1}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}>
                      <TextField
                        label="Service name"
                        size="small"
                        value={service.name}
                        onChange={(event) => updateService(index, { name: event.target.value })}
                        fullWidth
                      />
                      <FormControlLabel
                        sx={{ mr: 0, whiteSpace: 'nowrap' }}
                        control={<Switch size="small" checked={service.enabled} onChange={(event) => updateService(index, { enabled: event.target.checked })} />}
                        label="Active"
                      />
                    </Stack>
                    <TextField
                      label="Description"
                      size="small"
                      value={service.description ?? ''}
                      onChange={(event) => updateService(index, { description: event.target.value })}
                      slotProps={{ htmlInput: { maxLength: 500 } }}
                      fullWidth
                    />
                    <Stack direction="row" spacing={1}>
                      <TextField
                        label="Price (₹)"
                        type="number"
                        size="small"
                        value={service.price}
                        onChange={(event) => updateService(index, { price: Number(event.target.value) })}
                        slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                        fullWidth
                      />
                      <TextField
                        label="Duration (min)"
                        type="number"
                        size="small"
                        value={service.durationMinutes}
                        onChange={(event) => updateService(index, { durationMinutes: Number(event.target.value) })}
                        slotProps={{ htmlInput: { min: 5, max: 480, step: 5 } }}
                        fullWidth
                      />
                    </Stack>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}

          <Button
            variant="contained"
            startIcon={<Save size={16} />}
            onClick={handleSave}
            disabled={isLoading || isSaving}
            sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}
          >
            {isSaving ? 'Saving…' : 'Save services'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}