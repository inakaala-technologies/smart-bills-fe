import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography } from '@mui/material'
import { Award, Pencil, Plus } from 'lucide-react'
import {
  fetchAppointmentServices,
  fetchLoyaltyRules,
  fetchLoyaltySettings,
  fetchMembershipPlans,
  saveLoyaltyRule,
  saveLoyaltySettings,
  type AppointmentServiceSummary,
  type LoyaltyRule,
  type LoyaltyProgramSettings,
  type LoyaltyTargetType,
  type MembershipPlanSummary,
  type ProductSummary,
} from '../../../services/api'

type LoyaltyWorkspaceProps = {
  businessId: number
  products: ProductSummary[]
}

type TargetOption = {
  id: number
  label: string
}

const typeLabels: Record<LoyaltyTargetType, string> = {
  PRODUCT: 'Product',
  SERVICE: 'Service',
  MEMBERSHIP: 'Membership plan',
}

export function LoyaltyWorkspace({ businessId, products }: LoyaltyWorkspaceProps) {
  const [rules, setRules] = useState<LoyaltyRule[]>([])
  const [services, setServices] = useState<AppointmentServiceSummary[]>([])
  const [plans, setPlans] = useState<MembershipPlanSummary[]>([])
  const [settings, setSettings] = useState<LoyaltyProgramSettings | null>(null)
  const [settingsForm, setSettingsForm] = useState({ pointsPerCurrencyUnit: '', maxRedemptionPercent: '' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<LoyaltyRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackSeverity, setFeedbackSeverity] = useState<'success' | 'error'>('success')
  const [form, setForm] = useState<{ targetType: LoyaltyTargetType; targetId: string; points: string; active: boolean }>({
    targetType: 'PRODUCT',
    targetId: '',
    points: '',
    active: true,
  })

  const productOptions = useMemo<TargetOption[]>(() => products
    .filter((product) => product.businessId == null || product.businessId === businessId)
    .map((product) => ({ id: product.id, label: product.name ?? product.productName ?? `Product #${product.id}` })), [businessId, products])
  const serviceOptions = useMemo<TargetOption[]>(() => services.map((service) => ({ id: service.id, label: service.name })), [services])
  const planOptions = useMemo<TargetOption[]>(() => plans.map((plan) => ({ id: plan.id, label: plan.name })), [plans])
  const targetOptions = form.targetType === 'PRODUCT' ? productOptions : form.targetType === 'SERVICE' ? serviceOptions : planOptions

  const targetName = (rule: LoyaltyRule) => {
    const options = rule.targetType === 'PRODUCT' ? productOptions : rule.targetType === 'SERVICE' ? serviceOptions : planOptions
    return options.find((option) => option.id === rule.targetId)?.label ?? `${typeLabels[rule.targetType]} #${rule.targetId}`
  }

  const load = async () => {
    setLoading(true)
    try {
      const [loadedRules, loadedServices, loadedPlans, loadedSettings] = await Promise.all([
        fetchLoyaltyRules(businessId),
        fetchAppointmentServices(businessId),
        fetchMembershipPlans(businessId),
        fetchLoyaltySettings(businessId),
      ])
      setRules(loadedRules)
      setServices(loadedServices)
      setPlans(loadedPlans)
      setSettings(loadedSettings)
      setSettingsForm({
        pointsPerCurrencyUnit: loadedSettings.pointsPerCurrencyUnit == null ? '' : String(loadedSettings.pointsPerCurrencyUnit),
        maxRedemptionPercent: loadedSettings.maxRedemptionPercent == null ? '' : String(loadedSettings.maxRedemptionPercent),
      })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not load loyalty settings.')
      setFeedbackSeverity('error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [businessId])

  const openRuleDialog = (rule?: LoyaltyRule) => {
    setEditingRule(rule ?? null)
    setForm(rule ? {
      targetType: rule.targetType,
      targetId: String(rule.targetId),
      points: String(rule.points),
      active: rule.active,
    } : { targetType: 'PRODUCT', targetId: '', points: '', active: true })
    setDialogOpen(true)
  }

  const saveRule = async () => {
    const targetId = Number(form.targetId)
    const points = Number(form.points)
    if (!Number.isInteger(targetId) || targetId <= 0 || !Number.isInteger(points) || points <= 0) {
      setFeedback('Select an item and enter a positive whole number of points.')
      setFeedbackSeverity('error')
      return
    }
    setSaving(true)
    const result = await saveLoyaltyRule(businessId, {
      targetType: form.targetType,
      targetId,
      points,
      active: form.active,
    }, editingRule?.id)
    setSaving(false)
    if (!result.ok) {
      setFeedback(result.message ?? 'Could not save loyalty rule.')
      setFeedbackSeverity('error')
      return
    }
    setDialogOpen(false)
    setFeedback(editingRule ? 'Loyalty rule updated.' : 'Loyalty rule created.')
    setFeedbackSeverity('success')
    await load()
  }

  const saveSettings = async () => {
    const pointsPerCurrencyUnit = Number(settingsForm.pointsPerCurrencyUnit)
    const maxRedemptionPercent = Number(settingsForm.maxRedemptionPercent)
    if (!Number.isInteger(pointsPerCurrencyUnit) || pointsPerCurrencyUnit <= 0
      || !Number.isFinite(maxRedemptionPercent) || maxRedemptionPercent <= 0 || maxRedemptionPercent > 100) {
      setFeedback('Enter a positive whole-number points rate and a redemption cap greater than 0% and at most 100%.')
      setFeedbackSeverity('error')
      return
    }
    setSavingSettings(true)
    const result = await saveLoyaltySettings(businessId, { pointsPerCurrencyUnit, maxRedemptionPercent })
    setSavingSettings(false)
    if (!result.ok || !result.settings) {
      setFeedback(result.message ?? 'Could not save loyalty redemption settings.')
      setFeedbackSeverity('error')
      return
    }
    setSettings(result.settings)
    setFeedback('Loyalty redemption settings saved.')
    setFeedbackSeverity('success')
  }

  return (
    <Stack spacing={1.6}>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.3}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Redemption settings</Typography>
              <Typography variant="body2" color="text.secondary">Set the value of points and the maximum discount customers can apply per purchase.</Typography>
            </Box>
            {!settings?.configured && <Alert severity="info">Save these settings before customers or staff can redeem points.</Alert>}
            <TextField
              label="Points required for ₹1 discount"
              type="number"
              value={settingsForm.pointsPerCurrencyUnit}
              onChange={(event) => setSettingsForm((current) => ({ ...current, pointsPerCurrencyUnit: event.target.value }))}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              fullWidth
            />
            <TextField
              label="Maximum discount per purchase (%)"
              type="number"
              value={settingsForm.maxRedemptionPercent}
              onChange={(event) => setSettingsForm((current) => ({ ...current, maxRedemptionPercent: event.target.value }))}
              slotProps={{ htmlInput: { min: 0.01, max: 100, step: 0.01 } }}
              fullWidth
            />
            <Button variant="contained" onClick={() => void saveSettings()} disabled={savingSettings}>
              {savingSettings ? 'Saving…' : settings?.configured ? 'Save redemption settings' : 'Enable redemptions'}
            </Button>
          </Stack>
        </CardContent>
      </Card>
      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={1.4}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 38, height: 38, display: 'grid', placeItems: 'center', borderRadius: 1.5, bgcolor: 'primary.light', color: 'primary.dark' }}><Award size={20} /></Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>Loyalty points</Typography>
                <Typography variant="body2" color="text.secondary">Reward customers for selected products, services, and plans.</Typography>
              </Box>
              <Button size="small" startIcon={<Plus size={16} />} onClick={() => openRuleDialog()} sx={{ textTransform: 'none' }}>Add rule</Button>
            </Stack>
            {feedback && <Alert severity={feedbackSeverity}>{feedback}</Alert>}
            {loading ? (
              <Typography color="text.secondary">Loading loyalty rules…</Typography>
            ) : rules.length === 0 ? (
              <Alert severity="info">No loyalty rules yet. Add a rule to start awarding points.</Alert>
            ) : (
              <Stack spacing={1}>
                {rules.map((rule) => (
                  <Box key={rule.id} sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 1.1 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 750 }} noWrap>{targetName(rule)}</Typography>
                        <Typography variant="caption" color="text.secondary">{typeLabels[rule.targetType]} · {rule.points} points per use</Typography>
                      </Box>
                      <Chip size="small" label={rule.active ? 'Active' : 'Inactive'} color={rule.active ? 'success' : 'default'} variant="outlined" />
                      <Button size="small" aria-label={`Edit ${targetName(rule)} loyalty rule`} onClick={() => openRuleDialog(rule)}><Pencil size={15} /></Button>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingRule ? 'Edit loyalty rule' : 'Add loyalty rule'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.6} sx={{ pt: 1 }}>
            <TextField
              select
              label="Reward applies to"
              value={form.targetType}
              onChange={(event) => setForm((current) => ({ ...current, targetType: event.target.value as LoyaltyTargetType, targetId: '' }))}
              fullWidth
            >
              {(Object.keys(typeLabels) as LoyaltyTargetType[]).map((type) => <MenuItem key={type} value={type}>{typeLabels[type]}</MenuItem>)}
            </TextField>
            <TextField
              select
              label={typeLabels[form.targetType]}
              value={form.targetId}
              onChange={(event) => setForm((current) => ({ ...current, targetId: event.target.value }))}
              fullWidth
              helperText={targetOptions.length ? undefined : `No ${typeLabels[form.targetType].toLowerCase()}s are available yet.`}
            >
              {targetOptions.map((option) => <MenuItem key={option.id} value={String(option.id)}>{option.label}</MenuItem>)}
            </TextField>
            <TextField label="Points per use" value={form.points} onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))} type="number" slotProps={{ htmlInput: { min: 1, step: 1 } }} fullWidth />
            <FormControlLabel control={<Switch checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />} label="Rule is active" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={saving} onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button disabled={saving || targetOptions.length === 0} variant="contained" onClick={() => void saveRule()}>{saving ? 'Saving…' : 'Save rule'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
