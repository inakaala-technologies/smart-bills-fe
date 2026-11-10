import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import type { Theme } from '@mui/material'
import { Ambulance, ArrowLeft, Bike, Car, ChevronRight, HeartPulse, Home, Lock, Plane, Truck, Umbrella } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getDashboardPath } from '../routes/dashboardPaths'
import {
  deleteSavedPolicy,
  fetchPolicy,
  getEndpointById,
  getEndpointsFor,
  getSavedPolicies,
  type InsurerEndpoint,
  type PolicyResult,
  type SavedPolicy,
} from '../services/insuranceApi'

/* ---------- Types ---------- */

type Tone = 'primary' | 'success' | 'warning' | 'info' | 'error'

interface InsuranceCategory {
  id: string
  label: string
  blurb: string
  tone: Tone
  icon: ReactNode
}

// What one policy card shows. undefined means it is still loading.
type LookupState = { status: 'done'; result: PolicyResult } | { status: 'error'; message: string }

/* ---------- Categories: add or remove insurance types here ---------- */

export const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  { id: 'health', label: 'Health', blurb: 'Hospital bills and cashless treatment', tone: 'success', icon: <HeartPulse size={28} /> },
  { id: 'cyber', label: 'Cyber', blurb: 'Online fraud, UPI theft and identity theft', tone: 'info', icon: <Lock size={28} /> },
  { id: 'car', label: 'Car', blurb: 'Four-wheeler policies', tone: 'primary', icon: <Car size={28} /> },
  { id: 'two-wheeler', label: 'Two wheeler', blurb: 'Bike and scooter policies', tone: 'warning', icon: <Bike size={28} /> },
  { id: 'commercial-vehicle', label: 'Commercial vehicle', blurb: 'Trucks, tempos, taxis and autos', tone: 'error', icon: <Truck size={28} /> },
  { id: 'home', label: 'Home', blurb: 'Fire, theft and natural disasters', tone: 'success', icon: <Home size={28} /> },
  { id: 'travel', label: 'Travel', blurb: 'Trips in India and abroad', tone: 'info', icon: <Plane size={28} /> },
  { id: 'life', label: 'Life', blurb: 'Money for your family if something happens to you', tone: 'primary', icon: <Umbrella size={28} /> },
  { id: 'personal-accident', label: 'Personal accident', blurb: 'Cover for injury, disability and accidental death', tone: 'warning', icon: <Ambulance size={28} /> },
]

/* ---------- Insurer endpoints used for each category ---------- */
// A category can have more than one insurance company (Health has two). The list of
// companies and their endpoints is set in insuranceApi.ts.

function endpointsForCategory(categoryId: string): InsurerEndpoint[] {
  return getEndpointsFor(categoryId)
}

/* ---------- Phone-sized screen, same shell as CustomerDashboard ---------- */

function PhoneShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        minHeight: 0,
        backgroundColor: 'background.default',
        py: { xs: 0, sm: 4 },
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <Container maxWidth="xs" disableGutters sx={{ px: 0 }}>
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            maxWidth: 412,
            mx: 'auto',
            height: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            maxHeight: { xs: '100dvh', sm: 'calc(100dvh - 64px)' },
            borderRadius: { xs: 0, sm: '24px' },
            backgroundColor: 'background.paper',
            border: '1px solid var(--mui-palette-divider)',
            boxShadow: '0 18px 46px rgba(0, 0, 0, 0.18)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1.4,
              borderBottom: '1px solid var(--mui-palette-divider)',
            }}
          >
            <ButtonBase
              onClick={onBack}
              aria-label="Go back"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                color: 'text.primary',
                '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)' },
              }}
            >
              <ArrowLeft size={20} />
            </ButtonBase>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: 'text.primary' }}>{title}</Typography>
          </Box>

          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overscrollBehaviorY: 'contain',
              px: 2,
              pt: 2,
              pb: 'calc(24px + env(safe-area-inset-bottom))',
            }}
          >
            {children}
          </Box>
        </Paper>
      </Container>
    </Box>
  )
}

function CategoryIcon({ category, size }: { category: InsuranceCategory; size: number }) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
        color: `${category.tone}.main`,
        bgcolor: (t: Theme) => alpha(t.palette[category.tone].main, 0.12),
      }}
    >
      {category.icon}
    </Box>
  )
}

/* ---------- One card per policy (data from API Setu) ---------- */

const COLLAPSED_ROWS = 8

function InsurerResultCard({
  insurer,
  subtitle,
  state,
  onRefresh,
  onRemove,
}: {
  insurer: string
  subtitle?: string
  state: LookupState | undefined
  onRefresh: () => void
  onRemove?: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  let body: ReactNode
  if (!state) {
    body = (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <CircularProgress size={18} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Asking {insurer}…
        </Typography>
      </Box>
    )
  } else if (state.status === 'error') {
    body = <Alert severity="error">{state.message}</Alert>
  } else if (state.result.empty) {
    body = <Alert severity="info">{insurer} answered, but sent no policy data.</Alert>
  } else if (state.result.fields.length === 0) {
    body = (
      <Box component="pre" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0 }}>
        {state.result.raw}
      </Box>
    )
  } else {
    const rows = state.result.fields
    const shown = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)
    body = (
      <Stack spacing={0.8}>
        {shown.map((row, index) => (
          <Box key={`${row.label}-${index}`}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
              {row.label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
              {row.value}
            </Typography>
          </Box>
        ))}
        {rows.length > COLLAPSED_ROWS && (
          <Button size="small" onClick={() => setExpanded((prev) => !prev)} sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}>
            {expanded ? 'Show less' : `Show all ${rows.length} details`}
          </Button>
        )}
      </Stack>
    )
  }

  const showActions = state !== undefined && (state.status === 'error' || !state.result.empty)

  return (
    <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700 }}>{insurer}</Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', wordBreak: 'break-word' }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Chip label="Test data" size="small" sx={{ fontWeight: 700 }} />
      </Box>
      {showActions && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {state?.status === 'done'
              ? `${state.result.fromCache ? 'Saved copy from ' : 'Fetched on '}${new Date(state.result.fetchedAt).toLocaleString()}`
              : ''}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button size="small" onClick={onRefresh} sx={{ textTransform: 'none', fontWeight: 700 }}>
              Refresh
            </Button>
            {onRemove && (
              <Button size="small" color="error" onClick={onRemove} sx={{ textTransform: 'none', fontWeight: 700 }}>
                Remove
              </Button>
            )}
          </Box>
        </Box>
      )}
      {body}
    </Paper>
  )
}

/* ---------- A policy that was fetched before and saved (no new call is made to show it) ---------- */

function SavedPolicyCard({ policy, onChanged }: { policy: SavedPolicy; onChanged: () => void }) {
  const endpoint = getEndpointById(policy.endpointId)
  const [state, setState] = useState<LookupState | undefined>({ status: 'done', result: policy.result })

  const subtitle = (endpoint?.fields ?? [])
    .filter((field) => field.fixedValue === undefined)
    .map((field) => `${field.label}: ${policy.values[field.name] ?? ''}`)
    .join(' · ')

  // Fetch again on purpose, ignoring the saved copy
  const refresh = async () => {
    if (!endpoint) return
    setState(undefined)
    try {
      const result = await fetchPolicy(endpoint, policy.values, { forceRefresh: true })
      setState({ status: 'done', result })
    } catch (err) {
      setState({ status: 'error', message: err instanceof Error ? err.message : 'Something went wrong.' })
    }
  }

  return (
    <InsurerResultCard
      insurer={endpoint?.insurer ?? 'Insurer'}
      subtitle={subtitle}
      state={state}
      onRefresh={refresh}
      onRemove={() => {
        deleteSavedPolicy(policy.endpointId, policy.values)
        onChanged()
      }}
    />
  )
}

/* ---------- Enter a policy number, fetch it once, keep it saved ---------- */

function PolicyLookup({ categoryId }: { categoryId: string }) {
  const endpoints = endpointsForCategory(categoryId)
  // With only one company it is chosen automatically. With several, the customer picks first.
  const [selectedId, setSelectedId] = useState(endpoints.length === 1 ? endpoints[0].id : '')
  const [saved, setSaved] = useState<SavedPolicy[]>(() => getSavedPolicies(categoryId))
  const [values, setValues] = useState<Record<string, string>>({})
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  if (endpoints.length === 0) return null

  const endpoint = endpoints.find((item) => item.id === selectedId)
  const reload = () => setSaved(getSavedPolicies(categoryId))

  const chooseCompany = (id: string) => {
    setSelectedId(id)
    setValues({})
    setError('')
    setNotice('')
  }

  const savedList = (list: SavedPolicy[], heading: string) =>
    list.length > 0 && (
      <>
        <Typography sx={{ fontWeight: 800, mb: 1 }}>{heading}</Typography>
        <Stack spacing={1.4}>
          {list.map((policy) => (
            <SavedPolicyCard
              key={`${policy.endpointId}:${JSON.stringify(policy.values)}`}
              policy={policy}
              onChanged={reload}
            />
          ))}
        </Stack>
      </>
    )

  /* Step 1: more than one company, none chosen yet -> pick the company */
  if (!endpoint) {
    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Choose your insurance company</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.2 }}>
          Pick the company that issued your policy. Then enter that company’s policy number.
        </Typography>

        <Stack spacing={1.2} sx={{ mb: 2 }}>
          {endpoints.map((item) => (
            <ButtonBase
              key={item.id}
              onClick={() => chooseCompany(item.id)}
              aria-label={`Choose ${item.insurer}`}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                borderRadius: '22px',
                p: '14px 16px',
                border: '1px solid var(--mui-palette-divider)',
                backgroundColor: 'background.paper',
                '&:focus-visible': { outline: '3px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 800, color: 'text.primary', fontSize: 16 }}>{item.insurer}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Tap to enter your {item.insurer} policy number
                </Typography>
              </Box>
              <ChevronRight size={20} color="var(--mui-palette-text-disabled)" />
            </ButtonBase>
          ))}
        </Stack>

        {savedList(saved, 'Saved policies')}
      </Box>
    )
  }

  /* Step 2: a company is chosen -> enter that company's policy details */
  const askedFields = endpoint.fields.filter((field) => field.fixedValue === undefined)

  const handleCheck = async () => {
    setNotice('')
    for (const field of askedFields) {
      const value = (values[field.name] ?? '').trim()
      if (!value) {
        setError(`Enter your ${endpoint.insurer} ${field.label.toLowerCase()}`)
        return
      }
      if (!/^[A-Za-z0-9/_.\- ]{3,40}$/.test(value)) {
        setError(`Enter the ${field.label.toLowerCase()} as printed on your ${endpoint.insurer} policy`)
        return
      }
    }

    setError('')
    setLoading(true)
    try {
      // If this policy was fetched before, the saved details come back and no call is made.
      const result = await fetchPolicy(endpoint, values)
      reload()
      setValues({})
      setNotice(
        result.fromCache
          ? 'This policy was already saved, so it was not fetched again.'
          : `${endpoint.insurer} policy details fetched and saved on this device.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ mb: 2.5 }}>
      {/* Company name stays on top so the customer knows which company is being asked */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block' }}>
            Insurance company
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: 22, color: 'text.primary' }}>{endpoint.insurer}</Typography>
        </Box>
        {endpoints.length > 1 && (
          <Button size="small" onClick={() => chooseCompany('')} disabled={loading} sx={{ textTransform: 'none', fontWeight: 700 }}>
            Change company
          </Button>
        )}
      </Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.2 }}>
        Enter your {endpoint.insurer} policy details. We fetch them from {endpoint.insurer} once and save them, so you do not need to fetch them again.
      </Typography>

      <Paper variant="outlined" sx={{ p: 1.8, borderRadius: 3, mb: 1.6 }}>
        <Stack spacing={1.4}>
          {askedFields.map((field) => (
            <Box key={field.name}>
              <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 0.8 }}>
                {endpoint.insurer} {field.label.toLowerCase()}
              </Typography>
              <TextField
                size="small"
                fullWidth
                placeholder={field.placeholder}
                value={values[field.name] ?? ''}
                onChange={(e) => {
                  setError('')
                  setValues((prev) => ({ ...prev, [field.name]: e.target.value.toUpperCase().slice(0, 40) }))
                }}
                error={Boolean(error)}
                disabled={loading}
              />
            </Box>
          ))}

          {error && (
            <Typography variant="caption" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          )}
          {notice && <Alert severity="success">{notice}</Alert>}

          <Button
            variant="contained"
            onClick={handleCheck}
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 700, py: 1.1 }}
          >
            {loading ? `Asking ${endpoint.insurer}…` : `Check ${endpoint.insurer} policy`}
          </Button>
          <Button
            size="small"
            disabled={loading}
            onClick={() => {
              setError('')
              const sample: Record<string, string> = {}
              askedFields.forEach((field) => {
                sample[field.name] = field.sample
              })
              setValues(sample)
            }}
            sx={{ textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
          >
            Use the API Setu test details for {endpoint.insurer}
          </Button>
        </Stack>
      </Paper>

      {savedList(
        saved.filter((policy) => policy.endpointId === endpoint.id),
        `Saved ${endpoint.insurer} policies`,
      )}
    </Box>
  )
}

/* ---------- Page 1: /insurance ---------- */

export function InsuranceHomePage() {
  const navigate = useNavigate()

  return (
    <PhoneShell title="Insurance" onBack={() => navigate(getDashboardPath('CUSTOMER'))}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Choose what you want to cover.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {INSURANCE_CATEGORIES.map((category) => (
          <ButtonBase
            key={category.id}
            onClick={() => navigate(`/insurance/${category.id}`)}
            aria-label={`${category.label} insurance`}
            sx={{
              flexDirection: 'column',
              gap: 1,
              p: 1.2,
              borderRadius: 3,
              textAlign: 'center',
              '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)' },
            }}
          >
            <CategoryIcon category={category} size={64} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {category.label}
            </Typography>
          </ButtonBase>
        ))}
      </Box>
    </PhoneShell>
  )
}

/* ---------- Page 2: /insurance/:category ---------- */

function CategoryFlow({ current }: { current: InsuranceCategory }) {
  const navigate = useNavigate()

  return (
    <PhoneShell title={`${current.label} insurance`} onBack={() => navigate('/insurance')}>
      <Stack direction="row" spacing={1.6} sx={{ mb: 2, alignItems: 'center' }}>
        <CategoryIcon category={current} size={52} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{current.blurb}</Typography>
        </Box>
      </Stack>

      {/* The customer enters the policy number. It is fetched once and then saved. */}
      <PolicyLookup categoryId={current.id} />
    </PhoneShell>
  )
}

export function InsuranceCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()

  const current = INSURANCE_CATEGORIES.find((item) => item.id === category)

  if (!current) {
    return (
      <PhoneShell title="Insurance" onBack={() => navigate('/insurance')}>
        <Typography sx={{ fontWeight: 600 }}>This insurance type isn’t available.</Typography>
        <Button onClick={() => navigate('/insurance')} sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}>
          Back to Insurance
        </Button>
      </PhoneShell>
    )
  }

  // key={current.id} makes the screen start fresh when the customer opens a different type
  return <CategoryFlow key={current.id} current={current} />
}