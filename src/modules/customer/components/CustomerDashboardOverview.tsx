import { Box, ButtonBase, Typography } from '@mui/material'
import { CalendarCheck2, ShieldCheck, Tag, ReceiptText } from 'lucide-react'
import type { DashboardData } from '../../../services/api'
import type { DashboardTab } from '../../types'

export function HeroBanner() {
  return (
    <Box
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '28px',
        background: 'linear-gradient(135deg, #0F032D 0%, #4E2BCC 62%, #905BF4 100%)',
        p: { xs: 2.5, sm: 2.8 },
        minHeight: 168,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.14)',
      }}
    >
      <Box sx={{ position: 'absolute', top: -30, right: 30, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'absolute', bottom: -20, left: 40, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)', pointerEvents: 'none' }} />

      <Box sx={{ zIndex: 1, pr: 1, maxWidth: '62%' }}>
        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.15, color: '#ffffff', fontSize: { xs: '1.25rem', sm: '1.4rem' } }}>
          Your digital life,<br />organized
        </Typography>
        <Typography variant="body2" sx={{ mt: 1.2, color: 'rgba(255,255,255,0.82)', fontWeight: 500, fontSize: '0.8rem', lineHeight: 1.35 }}>
          Bills, receipts, memberships and more — all in one place.
        </Typography>
      </Box>

      <Box sx={{ zIndex: 1, position: 'relative', width: 110, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Box sx={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.6)', filter: 'blur(12px)' }} />
        <Box sx={{ position: 'absolute', bottom: 12, left: 2, width: 12, height: 12, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.8)', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }} />

        <Box sx={{ width: 78, height: 126, borderRadius: '16px', background: '#ffffff', border: '3.5px solid #0F032D', boxShadow: '0 12px 24px rgba(15, 3, 45, 0.22)', transform: 'rotate(12deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ width: 22, height: 3, borderRadius: 2, background: '#0F032D', mt: 0.6, mb: 0.8 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#4E2BCC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ width: 4, height: 4, borderRadius: '50%', background: '#fff' }} />
            </Box>
            <Typography sx={{ fontSize: '9px', fontWeight: 900, color: '#0F032D', letterSpacing: '-0.02em' }}>BHive</Typography>
          </Box>
          <Box sx={{ position: 'absolute', bottom: 4, width: 58, height: 70, background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(15, 23, 42, 0.12)', p: 0.6, display: 'flex', flexDirection: 'column', gap: 0.4, transform: 'translateY(6px)' }}>
            <Box sx={{ width: '70%', height: 3, borderRadius: 1, background: '#cbd5e1', mx: 'auto', mb: 0.4 }} />
            <Box sx={{ width: '100%', borderBottom: '1px dashed #cbd5e1', my: 0.2 }} />
            <Box sx={{ width: '85%', height: 2.5, borderRadius: 1, background: '#e2e8f0' }} />
            <Box sx={{ width: '60%', height: 2.5, borderRadius: 1, background: '#e2e8f0' }} />
            <Box sx={{ width: '75%', height: 2.5, borderRadius: 1, background: '#e2e8f0' }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.4 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#dcfce7' }} />
              <Box sx={{ width: 22, height: 3, borderRadius: 1, background: '#4E2BCC' }} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

type SummaryCardsProps = {
  data: DashboardData
  loading: boolean
  offersCount: number
  onSelectTab: (tab: DashboardTab) => void
}

export function SummaryCards({ data, loading, offersCount, onSelectTab }: SummaryCardsProps) {
  const summaryCards = [
    { label: 'Offers', count: offersCount, tab: 'businesses' as const, icon: Tag },
    { label: 'Memberships', count: data.memberships.length, tab: 'memberships' as const, icon: ShieldCheck },
    { label: 'Appointments', count: data.appointments.length, tab: 'appointments' as const, icon: CalendarCheck2 },
  {
    label: 'Bills',
    count: 0,
    tab: 'bills' as const,
    icon: ReceiptText,
  },
  ]

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: { xs: 1.1, sm: 1.4 }, my: 2.2 }}>
      {summaryCards.map(({ label, count, tab, icon: Icon }) => (
        <ButtonBase
          key={label}
          onClick={() => onSelectTab(tab)}
          aria-label={`Open ${label.toLowerCase()} page, ${count} total`}
          sx={{
            width: '100%',
            backgroundColor: 'background.paper',
            borderRadius: '20px',
            py: 1.4,
            px: 0.8,
            minHeight: 98,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)',
            border: '1px solid var(--mui-palette-divider)',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
            '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.18)' },
            '&:focus-visible': { outline: '3px solid var(--mui-palette-primary-main)', outlineOffset: 2 },
          }}
        >
          <Box sx={{ position: 'relative', mb: 1.1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: '12px', backgroundColor: 'primary.light', color: 'primary.dark', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={20} strokeWidth={2.2} />
            </Box>
            <Box sx={{ position: 'absolute', top: -5, right: -6, minWidth: 18, height: 18, borderRadius: '999px', background: '#f97316', color: '#ffffff', border: '2px solid #ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', px: 0.4, boxShadow: '0 2px 4px rgba(249, 115, 22, 0.3)' }}>
              <Typography sx={{ fontSize: '10px', fontWeight: 800, lineHeight: 1 }}>{loading ? '…' : count}</Typography>
            </Box>
          </Box>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', fontSize: '11px', textAlign: 'center', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
            {label}
          </Typography>
        </ButtonBase>
      ))}
    </Box>
  )
}