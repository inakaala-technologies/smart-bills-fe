import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, InputAdornment, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material'
import { BellRing, CalendarClock, CreditCard, Pencil, Plus, Search, Users, X } from 'lucide-react'
import { setBusinessMembershipPlans } from '../../../store/businessDashboardSlice'
import { useAppDispatch } from '../../../store/hooks'
import {
  createManagedMembership,
  fetchMembershipPlans,
  saveMembershipPlan,
  searchMembershipUsers,
  sendMembershipReminder,
  updateManagedMembership,
  type CustomerSummary,
  type MembershipPlanSummary,
  type MembershipSummary,
} from '../../../services/api'

type MembershipWorkspaceProps = {
  businessId: number
  memberships: MembershipSummary[]
  customers: CustomerSummary[]
  onUpdated: () => void
  initialTab?: WorkspaceTab
  focusCustomerId?: number
}

type WorkspaceTab = 'overview' | 'members' | 'plans' | 'renewals'
type PaymentStatus = 'PAID' | 'PENDING' | 'FREE'

const todayIso = () => {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function money(value?: number) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN')}`
}

function dayAfter(value?: string) {
  if (!value) return todayIso()
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10)
}

function memberStatus(membership: MembershipSummary, now: number) {
  if (membership.status === 'CANCELLED' || membership.status === 'SUSPENDED') return membership.status
  if (membership.endDate) {
    const daysLeft = Math.ceil((new Date(`${membership.endDate}T23:59:59`).getTime() - now) / 86400000)
    if (daysLeft < 0 || membership.status === 'EXPIRED') return 'EXPIRED'
    if (daysLeft <= 7 && membership.status === 'ACTIVE') return 'EXPIRING'
  }
  return membership.status ?? 'PENDING'
}

function statusTone(status: string): 'success' | 'warning' | 'error' | 'default' {
  if (status === 'ACTIVE') return 'success'
  if (status === 'EXPIRING' || status === 'PENDING') return 'warning'
  if (status === 'EXPIRED' || status === 'CANCELLED' || status === 'SUSPENDED') return 'error'
  return 'default'
}

export function MembershipWorkspace({ businessId, memberships, customers, onUpdated, initialTab = 'overview', focusCustomerId }: MembershipWorkspaceProps) {
  const dispatch = useAppDispatch()
  const [now] = useState(Date.now)
  const [tab, setTab] = useState<WorkspaceTab>(initialTab)
  const [plans, setPlans] = useState<MembershipPlanSummary[]>([])
  const [query, setQuery] = useState('')
  const [renewalRange, setRenewalRange] = useState(7)
  const [feedback, setFeedback] = useState('')
  const [feedbackSeverity, setFeedbackSeverity] = useState<'success' | 'error'>('success')
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<MembershipPlanSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [memberDialogOpen, setMemberDialogOpen] = useState(false)
  const [existingUserMode, setExistingUserMode] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userResults, setUserResults] = useState<CustomerSummary[]>([])
  const [selectedUser, setSelectedUser] = useState<CustomerSummary | null>(null)
  const [memberName, setMemberName] = useState('')
  const [memberPhone, setMemberPhone] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPlanId, setMemberPlanId] = useState('')
  const [memberStartDate, setMemberStartDate] = useState(todayIso())
  const [memberPaymentStatus, setMemberPaymentStatus] = useState<PaymentStatus>('PENDING')
  const [selectedMembership, setSelectedMembership] = useState<MembershipSummary | null>(null)
  const [editingMembership, setEditingMembership] = useState<MembershipSummary | null>(null)
  const [membershipEditForm, setMembershipEditForm] = useState({ planId: '', startDate: '', paymentStatus: 'PENDING' as PaymentStatus, status: 'ACTIVE' as NonNullable<MembershipSummary['status']> })
  const [membershipEditMessage, setMembershipEditMessage] = useState('')
  const [renewalMembership, setRenewalMembership] = useState<MembershipSummary | null>(null)
  const [reminderBusyId, setReminderBusyId] = useState<number | null>(null)
  const [planForm, setPlanForm] = useState({ name: '', description: '', price: '', billingFrequency: 'MONTHLY', durationMonths: '1', benefits: '', maxMembers: '', active: true })

  const refreshPlans = async () => {
    try {
      const loadedPlans = await fetchMembershipPlans(businessId)
      setPlans(loadedPlans)
      dispatch(setBusinessMembershipPlans({ businessId, plans: loadedPlans }))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not load membership plans.')
      setFeedbackSeverity('error')
    }
  }

  useEffect(() => {
    let isCurrent = true
    const loadPlans = async () => {
      try {
        const loadedPlans = await fetchMembershipPlans(businessId)
        if (!isCurrent) return
        setPlans(loadedPlans)
        dispatch(setBusinessMembershipPlans({ businessId, plans: loadedPlans }))
      } catch (error) {
        if (!isCurrent) return
        setFeedback(error instanceof Error ? error.message : 'Could not load membership plans.')
        setFeedbackSeverity('error')
      }
    }
    void loadPlans()
    return () => { isCurrent = false }
  }, [businessId, dispatch])

  const memberById = useMemo(() => new Map(customers.map((customer) => [customer.id, customer])), [customers])
  const businessMemberships = memberships.filter((membership) => (
    membership.businessId === businessId
    && (focusCustomerId == null || membership.customerId === focusCustomerId)
  ))
  const activeCount = businessMemberships.filter((membership) => memberStatus(membership, now) === 'ACTIVE').length
  const expiringCount = businessMemberships.filter((membership) => memberStatus(membership, now) === 'EXPIRING').length
  const expiredCount = businessMemberships.filter((membership) => memberStatus(membership, now) === 'EXPIRED').length
  const pendingCount = businessMemberships.filter((membership) => membership.paymentStatus === 'PENDING' || membership.status === 'PENDING').length
  const renewals = businessMemberships
    .filter((membership) => membership.endDate && ['ACTIVE', 'EXPIRING', 'EXPIRED'].includes(memberStatus(membership, now)))
    .map((membership) => ({ membership, days: Math.ceil((new Date(`${membership.endDate}T23:59:59`).getTime() - now) / 86400000) }))
    .filter(({ days }) => days >= 0 && days <= renewalRange)
    .sort((first, second) => first.days - second.days)
  const filteredMembers = businessMemberships.filter((membership) => {
    const person = memberById.get(membership.customerId ?? -1)
    const text = `${person?.fullName ?? person?.firstName ?? ''} ${person?.email ?? ''} ${person?.phoneNumber ?? ''} ${membership.planName ?? ''} ${person?.profileId ?? ''}`.toLowerCase()
    return text.includes(query.toLowerCase())
  })

  const openPlanDialog = (plan?: MembershipPlanSummary) => {
    setEditingPlan(plan ?? null)
    setPlanForm(plan ? {
      name: plan.name,
      description: plan.description ?? '',
      price: String(plan.price),
      billingFrequency: plan.billingFrequency,
      durationMonths: String(plan.durationMonths),
      benefits: plan.benefits ?? '',
      maxMembers: plan.maxMembers ? String(plan.maxMembers) : '',
      active: plan.active,
    } : { name: '', description: '', price: '', billingFrequency: 'MONTHLY', durationMonths: '1', benefits: '', maxMembers: '', active: true })
    setPlanDialogOpen(true)
  }

  const submitPlan = async () => {
    if (!planForm.name.trim() || !Number.isFinite(Number(planForm.price)) || Number(planForm.price) < 0 || !Number.isInteger(Number(planForm.durationMonths)) || Number(planForm.durationMonths) < 1) {
      setFeedback('Enter a plan name, a non-negative rate, and a duration of at least one month.')
      setFeedbackSeverity('error')
      return
    }
    setSaving(true)
    const result = await saveMembershipPlan(businessId, {
      name: planForm.name.trim(),
      description: planForm.description.trim() || undefined,
      price: Number(planForm.price),
      billingFrequency: planForm.billingFrequency,
      durationMonths: Number(planForm.durationMonths),
      benefits: planForm.benefits.trim() || undefined,
      maxMembers: planForm.maxMembers ? Number(planForm.maxMembers) : undefined,
      active: planForm.active,
    }, editingPlan?.id)
    setSaving(false)
    if (!result.ok) {
      setFeedback(result.message ?? 'Could not save membership plan.')
      setFeedbackSeverity('error')
      return
    }
    setFeedback('Membership plan saved.')
    setFeedbackSeverity('success')
    setPlanDialogOpen(false)
    await refreshPlans()
  }

  const runMemberSearch = async () => {
    if (userSearch.trim().length < 2) return
    try {
      setUserResults(await searchMembershipUsers(businessId, userSearch.trim()))
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not search BHive users.')
      setFeedbackSeverity('error')
    }
  }

  const openMemberDialog = () => {
    setRenewalMembership(null)
    setSelectedUser(null)
    setUserSearch('')
    setUserResults([])
    setMemberName('')
    setMemberPhone('')
    setMemberEmail('')
    setMemberPlanId(plans.find((plan) => plan.active)?.id.toString() ?? '')
    setMemberStartDate(todayIso())
    setMemberPaymentStatus('PENDING')
    setMemberDialogOpen(true)
  }

  const openRenewalDialog = (membership: MembershipSummary) => {
    const person = memberById.get(membership.customerId ?? -1)
    setRenewalMembership(membership)
    setSelectedUser(null)
    setUserResults([])
    setUserSearch(person?.email ?? person?.profileId ?? '')
    setExistingUserMode(true)
    setMemberName(person?.fullName ?? person?.firstName ?? '')
    setMemberPhone(person?.phoneNumber ?? '')
    setMemberEmail(person?.email ?? '')
    setMemberPlanId(plans.find((plan) => plan.active && plan.id === membership.planId)?.id.toString() ?? plans.find((plan) => plan.active)?.id.toString() ?? '')
    setMemberStartDate(dayAfter(membership.endDate) < todayIso() ? todayIso() : dayAfter(membership.endDate))
    setMemberPaymentStatus('PENDING')
    setSelectedMembership(null)
    setMemberDialogOpen(true)
  }

  const submitMember = async () => {
    if (!memberPlanId || (!selectedUser && (!memberName.trim() || !memberPhone.trim()))) {
      setFeedback('Select a plan and provide the member name and mobile number.')
      setFeedbackSeverity('error')
      return
    }
    setSaving(true)
    const result = await createManagedMembership(businessId, {
      planId: Number(memberPlanId),
      profileId: selectedUser?.profileId,
      memberName: selectedUser ? undefined : memberName.trim(),
      phone: selectedUser ? undefined : memberPhone.trim(),
      email: selectedUser ? undefined : memberEmail.trim() || undefined,
      startDate: memberStartDate,
      paymentStatus: memberPaymentStatus,
    })
    setSaving(false)
    if (!result.ok) {
      setFeedback(result.message ?? 'Could not add this member.')
      setFeedbackSeverity('error')
      return
    }
    setFeedback('Member and subscription added.')
    setFeedbackSeverity('success')
    setMemberDialogOpen(false)
    setRenewalMembership(null)
    onUpdated()
  }

  const issueReminder = async (membership: MembershipSummary) => {
    setReminderBusyId(membership.id)
    const result = await sendMembershipReminder(membership.id)
    setReminderBusyId(null)
    setFeedback(result.message ?? (result.ok ? 'In-app renewal reminder sent.' : 'Could not send reminder.'))
    setFeedbackSeverity(result.ok ? 'success' : 'error')
  }

  const openMembershipEdit = (membership: MembershipSummary) => {
    setSelectedMembership(null)
    setEditingMembership(membership)
    setMembershipEditForm({
      planId: String(membership.planId ?? ''),
      startDate: membership.startDate ?? todayIso(),
      paymentStatus: (membership.paymentStatus ?? 'PENDING') as PaymentStatus,
      status: (membership.status ?? 'PENDING') as NonNullable<MembershipSummary['status']>,
    })
    setMembershipEditMessage('')
  }

  const submitMembershipEdit = async () => {
    if (!editingMembership || !membershipEditForm.planId || !membershipEditForm.startDate) {
      setMembershipEditMessage('Select a plan and start date.')
      return
    }
    setSaving(true)
    const result = await updateManagedMembership(businessId, editingMembership.id, {
      planId: Number(membershipEditForm.planId),
      startDate: membershipEditForm.startDate,
      paymentStatus: membershipEditForm.paymentStatus,
      status: membershipEditForm.status,
    })
    setSaving(false)
    if (!result.ok) {
      setMembershipEditMessage(result.message ?? 'Could not update membership.')
      return
    }
    setEditingMembership(null)
    setFeedback('Membership updated.')
    setFeedbackSeverity('success')
    onUpdated()
  }

  const sectionTabs: Array<{ key: WorkspaceTab; label: string }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'members', label: 'Members' },
    { key: 'plans', label: 'Plans' },
    { key: 'renewals', label: 'Renewals' },
  ]

  return (
    <Stack spacing={1.4}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 19, fontWeight: 900 }}>Memberships</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Plans, members and renewals</Typography>
        </Box>
        {(tab === 'plans' || focusCustomerId == null) && (
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={tab === 'plans' ? () => openPlanDialog() : openMemberDialog} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}>
            {tab === 'plans' ? 'New plan' : 'Add member'}
          </Button>
        )}
      </Box>

      <Tabs value={tab} onChange={(_, value: WorkspaceTab) => setTab(value)} variant="scrollable" allowScrollButtonsMobile sx={{ minHeight: 42, '& .MuiTab-root': { minHeight: 42, minWidth: 74, px: 1.2, textTransform: 'none', fontSize: 12, fontWeight: 800 } }}>
        {sectionTabs.map((section) => <Tab key={section.key} value={section.key} label={section.label} />)}
      </Tabs>

      {feedback && <Alert severity={feedbackSeverity} onClose={() => setFeedback('')} sx={{ borderRadius: 2 }}>{feedback}</Alert>}

      {tab === 'overview' && (
        <Stack spacing={1.2}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
            {[
              { label: 'Active members', value: activeCount, icon: Users, color: 'var(--mui-palette-success-main)' },
              { label: 'Expiring in 7 days', value: expiringCount, icon: CalendarClock, color: 'var(--mui-palette-warning-main)' },
              { label: 'Expired', value: expiredCount, icon: X, color: 'var(--mui-palette-error-main)' },
              { label: 'Pending payment', value: pendingCount, icon: CreditCard, color: 'var(--mui-palette-text-secondary)' },
            ].map((metric) => {
              const Icon = metric.icon
              return <Card key={metric.label} variant="outlined" sx={{ borderColor: 'divider', borderRadius: 2 }}><CardContent sx={{ p: 1.3, '&:last-child': { pb: 1.3 } }}><Icon size={17} color={metric.color} /><Typography sx={{ mt: 0.5, color: 'text.primary', fontSize: 20, fontWeight: 900 }}>{metric.value}</Typography><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{metric.label}</Typography></CardContent></Card>
            })}
          </Box>
          <Card variant="outlined" sx={{ borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.4 }}>
              <Typography sx={{ color: 'text.primary', fontWeight: 800, mb: 0.7 }}>Renewals</Typography>
              {[{ label: 'Due today', days: 0 }, { label: 'Next 7 days', days: 7 }, { label: 'Next 30 days', days: 30 }].map(({ label, days }) => (
                <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 800 }}>{renewals.filter(({ days: due }) => days === 0 ? due === 0 : due >= 0 && due <= days).length}</Typography>
                </Box>
              ))}
              <Button size="small" onClick={() => setTab('renewals')} sx={{ mt: 0.7, px: 0, color: 'primary.main', textTransform: 'none', fontWeight: 800 }}>View renewals</Button>
            </CardContent>
          </Card>
          <Card variant="outlined" sx={{ borderColor: 'divider', borderRadius: 2 }}>
            <CardContent sx={{ p: 1.4 }}>
              <Typography sx={{ color: 'text.primary', fontWeight: 800, mb: 0.7 }}>Popular plans</Typography>
              {plans.filter((plan) => plan.active).map((plan) => (
                <Box key={plan.id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.7, borderBottom: '1px solid var(--mui-palette-divider)' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>{plan.name}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 800 }}>{businessMemberships.filter((membership) => membership.planId === plan.id && memberStatus(membership, now) === 'ACTIVE').length}</Typography>
                </Box>
              ))}
              {!plans.length && <Typography variant="body2" color="text.secondary">Create a plan to start enrolling members.</Typography>}
            </CardContent>
          </Card>
        </Stack>
      )}

      {tab === 'plans' && (
        <Stack spacing={1}>
          {plans.map((plan) => {
            const count = businessMemberships.filter((membership) => membership.planId === plan.id && ['ACTIVE', 'PENDING'].includes(membership.status ?? '')).length
            return <Card key={plan.id} variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider' }}><CardContent sx={{ p: 1.4 }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                <Box sx={{ minWidth: 0 }}><Typography sx={{ color: 'text.primary', fontWeight: 900 }}>{plan.name}</Typography><Typography variant="body2" sx={{ mt: 0.35, color: 'primary.main', fontWeight: 800 }}>{money(plan.price)} · {plan.billingFrequency.toLowerCase().replace('_', ' ')}</Typography></Box>
                <Chip label={plan.active ? 'Active' : 'Inactive'} size="small" color={plan.active ? 'success' : 'default'} />
              </Stack>
              {plan.description && <Typography variant="body2" sx={{ mt: 0.8, color: 'text.secondary' }}>{plan.description}</Typography>}
              {plan.benefits && <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: 'text.secondary', whiteSpace: 'pre-line' }}>{plan.benefits}</Typography>}
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.1 }}><Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>{count} active or pending members · {plan.durationMonths} month{plan.durationMonths === 1 ? '' : 's'}</Typography><Button size="small" onClick={() => openPlanDialog(plan)} sx={{ textTransform: 'none', fontWeight: 700 }}>Edit</Button></Stack>
            </CardContent></Card>
          })}
          {!plans.length && <Alert severity="info" sx={{ borderRadius: 2 }}>Create your first membership plan to start enrolling members.</Alert>}
        </Stack>
      )}

      {tab === 'members' && (
        <Stack spacing={1}>
          <TextField size="small" placeholder="Search name, profile ID, phone or plan" value={query} onChange={(event) => setQuery(event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={16} color="var(--mui-palette-text-secondary)" /></InputAdornment> } }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }} />
          {filteredMembers.map((membership) => {
            const customer = memberById.get(membership.customerId ?? -1)
            const status = memberStatus(membership, now)
            return <Card key={membership.id} variant="outlined" onClick={() => setSelectedMembership(membership)} sx={{ cursor: 'pointer', borderRadius: 2, borderColor: 'divider' }}><CardContent sx={{ p: 1.3, '&:last-child': { pb: 1.3 } }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', gap: 1 }}><Box sx={{ minWidth: 0 }}><Typography sx={{ color: 'text.primary', fontWeight: 800 }}>{customer?.fullName ?? customer?.firstName ?? 'Member'}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{membership.planName} · Expires {membership.endDate ?? 'not set'} · {money(membership.price)}</Typography></Box><Chip size="small" label={status} color={statusTone(status)} /></Stack>
            </CardContent></Card>
          })}
          {!filteredMembers.length && <Alert severity="info" sx={{ borderRadius: 2 }}>No members match this search.</Alert>}
        </Stack>
      )}

      {tab === 'renewals' && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={0.7}>{[{ days: 0, label: 'Today' }, { days: 7, label: '7 days' }, { days: 30, label: '30 days' }].map((option) => <Chip key={option.days} label={option.label} clickable color={renewalRange === option.days ? 'success' : 'default'} onClick={() => setRenewalRange(option.days)} />)}</Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 700 }}>{renewals.filter(({ days }) => renewalRange === 0 ? days === 0 : days >= 0 && days <= renewalRange).length} memberships due for renewal</Typography>
          {renewals.filter(({ days }) => renewalRange === 0 ? days === 0 : days >= 0 && days <= renewalRange).map(({ membership, days }) => {
            const person = memberById.get(membership.customerId ?? -1)
            return <Card key={membership.id} variant="outlined" sx={{ borderRadius: 2, borderColor: 'divider' }}><CardContent sx={{ p: 1.3, '&:last-child': { pb: 1.3 } }}>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}><Box sx={{ minWidth: 0 }}><Typography sx={{ color: 'text.primary', fontWeight: 800 }}>{person?.fullName ?? person?.firstName ?? 'Member'}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{membership.planName} · {days === 0 ? 'Due today' : `${days} day${days === 1 ? '' : 's'} remaining`}</Typography><Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>Ends {membership.endDate} · {money(membership.price)}</Typography></Box><Stack direction="row" spacing={0.3}><Button size="small" onClick={() => openRenewalDialog(membership)} sx={{ textTransform: 'none', fontWeight: 700 }}>Renew</Button><Button size="small" startIcon={<BellRing size={14} />} disabled={reminderBusyId === membership.id} onClick={() => void issueReminder(membership)} sx={{ textTransform: 'none', fontWeight: 700 }}>Remind</Button></Stack></Stack>
            </CardContent></Card>
          })}
          {!renewals.some(({ days }) => renewalRange === 0 ? days === 0 : days >= 0 && days <= renewalRange) && <Alert severity="info" sx={{ borderRadius: 2 }}>No renewals due in this period.</Alert>}
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Reminders are sent in-app when you choose Remind. Repeat sends are limited to once per membership every 24 hours.</Typography>
        </Stack>
      )}

      <Dialog open={planDialogOpen} onClose={() => setPlanDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 900 }}>{editingPlan ? 'Edit plan' : 'Create membership plan'}</DialogTitle>
        <DialogContent><Stack spacing={1.2} sx={{ pt: 1 }}>
          <TextField label="Plan name" required value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} fullWidth />
          <TextField label="Description" value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} multiline minRows={2} fullWidth />
          <TextField label="Price (₹)" type="number" value={planForm.price} onChange={(event) => setPlanForm({ ...planForm, price: event.target.value })} fullWidth />
          <TextField select label="Billing frequency" value={planForm.billingFrequency} onChange={(event) => setPlanForm({ ...planForm, billingFrequency: event.target.value })} fullWidth>{[['ONE_TIME', 'One time'], ['MONTHLY', 'Monthly'], ['QUARTERLY', 'Quarterly'], ['HALF_YEARLY', 'Half yearly'], ['YEARLY', 'Yearly'], ['CUSTOM', 'Custom']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
          <TextField label="Duration (months)" type="number" slotProps={{ htmlInput: { min: 1 } }} value={planForm.durationMonths} onChange={(event) => setPlanForm({ ...planForm, durationMonths: event.target.value })} fullWidth />
          <TextField label="Benefits (one per line)" value={planForm.benefits} onChange={(event) => setPlanForm({ ...planForm, benefits: event.target.value })} multiline minRows={2} fullWidth />
          <TextField label="Maximum members (blank for unlimited)" type="number" value={planForm.maxMembers} onChange={(event) => setPlanForm({ ...planForm, maxMembers: event.target.value })} fullWidth />
          <TextField select label="Plan status" value={planForm.active ? 'ACTIVE' : 'INACTIVE'} onChange={(event) => setPlanForm({ ...planForm, active: event.target.value === 'ACTIVE' })} fullWidth><MenuItem value="ACTIVE">Active</MenuItem><MenuItem value="INACTIVE">Inactive</MenuItem></TextField>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setPlanDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button><Button variant="contained" disabled={saving} onClick={() => void submitPlan()} sx={{ textTransform: 'none', fontWeight: 800 }}>{saving ? 'Saving…' : editingPlan ? 'Save changes' : 'Create plan'}</Button></DialogActions>
      </Dialog>

      <Dialog open={memberDialogOpen} onClose={() => setMemberDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 900 }}>{renewalMembership ? 'Renew membership' : 'Add member'}</DialogTitle>
        <DialogContent><Stack spacing={1.2} sx={{ pt: 1 }}>
          <Stack direction="row" spacing={0.6}><Button variant={existingUserMode ? 'contained' : 'outlined'} onClick={() => setExistingUserMode(true)} sx={{ flex: 1, textTransform: 'none' }}>BHive user</Button><Button variant={!existingUserMode ? 'contained' : 'outlined'} onClick={() => { setExistingUserMode(false); setSelectedUser(null) }} sx={{ flex: 1, textTransform: 'none' }}>New member</Button></Stack>
          {existingUserMode ? <>
            <Stack direction="row" spacing={0.7}><TextField label="User ID, mobile or email" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} fullWidth /><Button aria-label="Search BHive users" variant="outlined" onClick={() => void runMemberSearch()}><Search size={17} /></Button></Stack>
            {userResults.map((user) => <Card key={user.id} variant="outlined" onClick={() => setSelectedUser(user)} sx={{ cursor: 'pointer', borderColor: selectedUser?.id === user.id ? 'primary.main' : 'divider', borderRadius: 1.8 }}><CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}><Typography sx={{ fontWeight: 800 }}>{user.fullName}</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>{user.profileId} · {user.email ?? ''} · {user.phoneNumber ?? ''}</Typography></CardContent></Card>)}
            {selectedUser && <Alert severity="success">Selected {selectedUser.fullName} ({selectedUser.profileId}).</Alert>}
          </> : <>
            <TextField label="Full name" required value={memberName} onChange={(event) => setMemberName(event.target.value)} fullWidth />
            <TextField label="Mobile number" required value={memberPhone} onChange={(event) => setMemberPhone(event.target.value)} fullWidth />
            <TextField label="Email (optional)" type="email" value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} fullWidth />
          </>}
          <TextField select label="Membership plan" value={memberPlanId} onChange={(event) => setMemberPlanId(event.target.value)} fullWidth>{plans.filter((plan) => plan.active).map((plan) => <MenuItem key={plan.id} value={String(plan.id)}>{plan.name} · {money(plan.price)}</MenuItem>)}</TextField>
          <TextField label="Start date" type="date" value={memberStartDate} onChange={(event) => setMemberStartDate(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          <TextField select label="Payment status" value={memberPaymentStatus} onChange={(event) => setMemberPaymentStatus(event.target.value as PaymentStatus)} fullWidth><MenuItem value="PAID">Paid (record only)</MenuItem><MenuItem value="PENDING">Pending</MenuItem><MenuItem value="FREE">Free / complimentary</MenuItem></TextField>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>No payment is collected here. This only records the status provided by the business.</Typography>
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setMemberDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button><Button variant="contained" disabled={saving || !plans.some((plan) => plan.active)} onClick={() => void submitMember()} sx={{ textTransform: 'none', fontWeight: 800 }}>{saving ? 'Adding…' : 'Create membership'}</Button></DialogActions>
      </Dialog>

      <Dialog open={Boolean(selectedMembership)} onClose={() => setSelectedMembership(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 900 }}>Member details</DialogTitle>
        {selectedMembership && (() => {
          const person = memberById.get(selectedMembership.customerId ?? -1)
          const history = businessMemberships.filter((item) => item.customerId === selectedMembership.customerId)
          return <DialogContent dividers><Stack spacing={1.3}>
            <Box><Typography sx={{ fontWeight: 900 }}>{person?.fullName ?? person?.firstName ?? 'Member'}</Typography><Typography variant="caption" color="text.secondary">{person?.profileId ?? person?.email ?? person?.phoneNumber}</Typography></Box>
            <Chip label={memberStatus(selectedMembership, now)} color={statusTone(memberStatus(selectedMembership, now))} sx={{ alignSelf: 'flex-start' }} />
            <Box><Typography variant="caption" color="text.secondary">Current plan</Typography><Typography sx={{ fontWeight: 800 }}>{selectedMembership.planName} · {money(selectedMembership.price)}</Typography><Typography variant="body2">{selectedMembership.startDate} to {selectedMembership.endDate ?? 'No end date'}</Typography><Typography variant="caption" color="text.secondary">Payment: {selectedMembership.paymentStatus ?? 'PENDING'}</Typography></Box>
            <Typography sx={{ fontWeight: 800 }}>Membership history</Typography>
            {history.map((item) => <Typography key={item.id} variant="body2" sx={{ color: 'text.secondary' }}>{item.planName} · {item.startDate} to {item.endDate ?? '—'} · {money(item.price)} · {item.status}</Typography>)}
            <Typography sx={{ fontWeight: 800 }}>Renewal reminders</Typography>
            {selectedMembership.endDate && <Button startIcon={<BellRing size={15} />} onClick={() => void issueReminder(selectedMembership)} disabled={reminderBusyId === selectedMembership.id} sx={{ alignSelf: 'flex-start', textTransform: 'none' }}>Send in-app reminder</Button>}
          </Stack></DialogContent>
        })()}
        <DialogActions>
          <Button onClick={() => setSelectedMembership(null)} sx={{ textTransform: 'none' }}>Close</Button>
          {selectedMembership && <Button startIcon={<Pencil size={15} />} onClick={() => openMembershipEdit(selectedMembership)} sx={{ textTransform: 'none', fontWeight: 700 }}>Edit membership</Button>}
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editingMembership)} onClose={() => setEditingMembership(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ color: 'text.primary', fontWeight: 900 }}>Edit membership</DialogTitle>
        <DialogContent><Stack spacing={1.2} sx={{ pt: 1 }}>
          {membershipEditMessage && <Alert severity="error">{membershipEditMessage}</Alert>}
          <TextField select label="Membership plan" value={membershipEditForm.planId} onChange={(event) => setMembershipEditForm((current) => ({ ...current, planId: event.target.value }))} fullWidth>
            {plans.filter((plan) => plan.active || plan.id === editingMembership?.planId).map((plan) => <MenuItem key={plan.id} value={String(plan.id)}>{plan.name} · {money(plan.price)}</MenuItem>)}
          </TextField>
          <TextField label="Start date" type="date" value={membershipEditForm.startDate} onChange={(event) => setMembershipEditForm((current) => ({ ...current, startDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
          <TextField select label="Payment status" value={membershipEditForm.paymentStatus} onChange={(event) => setMembershipEditForm((current) => ({ ...current, paymentStatus: event.target.value as PaymentStatus }))} fullWidth>
            <MenuItem value="PAID">Paid</MenuItem><MenuItem value="PENDING">Pending</MenuItem><MenuItem value="FREE">Free / complimentary</MenuItem>
          </TextField>
          <TextField select label="Membership status" value={membershipEditForm.status} onChange={(event) => setMembershipEditForm((current) => ({ ...current, status: event.target.value as NonNullable<MembershipSummary['status']> }))} fullWidth>
            {['ACTIVE', 'PENDING', 'EXPIRED', 'CANCELLED', 'RENEWED', 'SUSPENDED'].map((status) => <MenuItem key={status} value={status}>{status}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">The end date and price update from the selected plan.</Typography>
        </Stack></DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingMembership(null)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button variant="contained" onClick={() => void submitMembershipEdit()} disabled={saving || !plans.some((plan) => plan.active)} sx={{ textTransform: 'none', fontWeight: 800 }}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}