import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Container,
  Paper,
  Typography,
  alpha,
} from '@mui/material'
import type { Theme } from '@mui/material'
import {
  Ambulance,
  ArrowLeft,
  Bike,
  Car,
  HeartPulse,
  Home,
  Lock,
  Plane,
  Truck,
  Umbrella,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CustomerBillsPage } from '../modules/customer/components/CustomerBillsPage'
import type { InsuranceCatalogType } from '../services/api/billingApi'
import { getDashboardPath } from '../routes/dashboardPaths'

type InsuranceCategory = {
  id: InsuranceCatalogType
  label: string
  blurb: string
  tone: 'primary' | 'success' | 'warning' | 'info' | 'error'
  icon: ReactNode
}

const INSURANCE_CATEGORIES: InsuranceCategory[] = [
  { id: 'health', label: 'Health', blurb: 'Health insurance policies', tone: 'success', icon: <HeartPulse size={28} /> },
  { id: 'cyber', label: 'Cyber', blurb: 'Cyber insurance policies', tone: 'info', icon: <Lock size={28} /> },
  { id: 'car', label: 'Car', blurb: 'Four-wheeler policies', tone: 'primary', icon: <Car size={28} /> },
  { id: 'two-wheeler', label: 'Two wheeler', blurb: 'Bike and scooter policies', tone: 'warning', icon: <Bike size={28} /> },
  { id: 'commercial-vehicle', label: 'Commercial vehicle', blurb: 'Commercial vehicle policies', tone: 'error', icon: <Truck size={28} /> },
  { id: 'home', label: 'Home', blurb: 'Home insurance policies', tone: 'success', icon: <Home size={28} /> },
  { id: 'travel', label: 'Travel', blurb: 'Travel insurance policies', tone: 'info', icon: <Plane size={28} /> },
  { id: 'life', label: 'Life', blurb: 'Life insurance policies', tone: 'primary', icon: <Umbrella size={28} /> },
  { id: 'personal-accident', label: 'Personal accident', blurb: 'Personal accident policies', tone: 'warning', icon: <Ambulance size={28} /> },
  { id: 'other', label: 'Other insurance', blurb: 'Additional insurance services in the backend catalog', tone: 'info', icon: <Lock size={28} /> },
]

function PhoneShell({
  title,
  onBack,
  children,
}: {
  title: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        height: '100dvh',
        minHeight: 0,
        bgcolor: 'background.default',
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
            bgcolor: 'background.paper',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1.4, borderBottom: '1px solid var(--mui-palette-divider)' }}>
            <ButtonBase onClick={onBack} aria-label="Go back" sx={{ width: 36, height: 36, borderRadius: '50%', color: 'text.primary' }}>
              <ArrowLeft size={20} />
            </ButtonBase>
            <Typography sx={{ fontWeight: 800, fontSize: 18, color: 'text.primary' }}>{title}</Typography>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehaviorY: 'contain', px: 2, pt: 2, pb: 'calc(24px + env(safe-area-inset-bottom))' }}>
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
        bgcolor: (theme: Theme) => alpha(theme.palette[category.tone].main, 0.12),
      }}
    >
      {category.icon}
    </Box>
  )
}

export function InsuranceHomePage() {
  const navigate = useNavigate()

  return (
    <PhoneShell title="Insurance Catalog" onBack={() => navigate(getDashboardPath('CUSTOMER'))}>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Choose an insurance type to browse available backend providers.
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1 }}>
        {INSURANCE_CATEGORIES.map((category) => (
          <ButtonBase
            key={category.id}
            onClick={() => navigate(`/insurance/${category.id}`)}
            aria-label={`${category.label} insurance`}
            sx={{ flexDirection: 'column', gap: 1, p: 1.2, borderRadius: 3, textAlign: 'center', '&:focus-visible': { outline: '2px solid var(--mui-palette-primary-main)' } }}
          >
            <CategoryIcon category={category} size={64} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{category.label}</Typography>
          </ButtonBase>
        ))}
      </Box>
    </PhoneShell>
  )
}

export function InsuranceCategoryPage() {
  const { category } = useParams<{ category: string }>()
  const navigate = useNavigate()
  const current = INSURANCE_CATEGORIES.find((item) => item.id === category)

  if (!current) {
    return (
      <PhoneShell title="Insurance Catalog" onBack={() => navigate('/insurance')}>
        <Typography sx={{ fontWeight: 600 }}>This insurance type isn’t available.</Typography>
        <Button onClick={() => navigate('/insurance')} sx={{ mt: 1 }}>Back to Insurance</Button>
      </PhoneShell>
    )
  }

  return (
    <PhoneShell title={`${current.label} Insurance`} onBack={() => navigate('/insurance')}>
      <Box sx={{ display: 'flex', gap: 1.6, alignItems: 'center', mb: 2 }}>
        <CategoryIcon category={current} size={52} />
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{current.blurb}</Typography>
      </Box>
      {current.id === 'cyber' && (
        <Alert severity="info" sx={{ mb: 2 }}>
          The backend catalog currently has no Cyber provider mapping. Other catalog services are shown under Other insurance.
        </Alert>
      )}
      <CustomerBillsPage
        categoryCodes={['INSURANCE']}
        insuranceType={current.id}
        title={`${current.label} Insurance Catalog`}
      />
    </PhoneShell>
  )
}
