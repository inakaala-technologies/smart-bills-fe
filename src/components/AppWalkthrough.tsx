import { useCallback, useEffect, useState } from 'react'
import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Award,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  ChartColumnIncreasing,
  Check,
  FileText,
  Megaphone,
  PartyPopper,
  PhoneCall,
  ReceiptText,
  Sparkles,
  UsersRound,
  X,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '../services/auth'
import { clearWalkthroughPending, isWalkthroughPending, START_WALKTHROUGH_EVENT } from './appWalkthroughState'

type WalkthroughStep = {
  icon: LucideIcon
  title: string
  description: string
  points: string[]
}

const customerSteps: WalkthroughStep[] = [
  {
    icon: PartyPopper,
    title: 'Welcome to BHive',
    description: 'One place for every business you buy from — bills, bookings, memberships and rewards.',
    points: ['Take a 1-minute tour of what you can do', 'You can replay it anytime from your profile menu'],
  },
  {
    icon: Building2,
    title: 'Find and follow businesses',
    description: 'Discover businesses and offers near you, then open any business to see your full history with them.',
    points: ['Browse nearby businesses and live offers', 'Open a business to see payments, receipts and appointments', 'Tap the reward badge to see your points there'],
  },
  {
    icon: BadgeCheck,
    title: 'Memberships and check-in',
    description: 'Keep every membership handy and show a QR at the counter instead of carrying cards.',
    points: ['See your plan and validity date', 'Use Check-in / View QR when you visit'],
  },
  {
    icon: FileText,
    title: 'Bills, receipts and payments',
    description: 'Your Documents tab keeps every bill in one place so nothing gets lost.',
    points: ['Unpaid bills are clearly marked', 'Tap any bill to see its full details', 'Review receipts and payment history anytime'],
  },
  {
    icon: CalendarCheck2,
    title: 'Book appointments',
    description: 'Book services from the Bookings tab and track their status.',
    points: ['Pick a service and a time slot', 'Choose a home visit where a business offers it', 'Get notified when a booking is confirmed or changed'],
  },
  {
    icon: Award,
    title: 'Earn and use reward points',
    description: 'Businesses reward your purchases with points that you can redeem on later bills.',
    points: ['See your points balance per business', 'Spending insights show how much you saved with rewards'],
  },
  {
    icon: PhoneCall,
    title: 'Stay in touch',
    description: 'Need to talk to a business? Ask them to call you back, and watch your bell for updates.',
    points: ['Request a callback with an optional reason', 'The notification bell shows bookings, bills and offers', 'Invite family members from your profile'],
  },
]

const businessSteps: WalkthroughStep[] = [
  {
    icon: PartyPopper,
    title: 'Welcome to BHive',
    description: 'Run billing, customers, bookings and loyalty for your business from one simple app.',
    points: ['Take a 1-minute tour of your workspace', 'You can replay it anytime from your profile menu'],
  },
  {
    icon: Building2,
    title: 'Set up your business',
    description: 'A complete profile builds trust with customers who find you on BHive.',
    points: ['Add your business details and location', 'Upload your profile photo and a banner image from My Profile', 'Choose which features appear in your workspace'],
  },
  {
    icon: UsersRound,
    title: 'Customers and search',
    description: 'Add customers, keep their details together and find anything quickly.',
    points: ['Add customers by phone or email', 'Open a customer to see their history', 'Use Search to jump to people, invoices and more'],
  },
  {
    icon: ReceiptText,
    title: 'Billing that rewards loyalty',
    description: 'Create invoices in seconds, apply discounts and let customers earn points automatically.',
    points: ['Generate and share invoices', 'Offer discounts on any bill', 'Set how many points a purchase earns'],
  },
  {
    icon: BadgeCheck,
    title: 'Memberships',
    description: 'Create plans, enroll customers and keep recurring relationships organised.',
    points: ['Set up membership plans', 'Notify members about renewals and updates', 'Customers check in with a QR'],
  },
  {
    icon: CalendarCheck2,
    title: 'Appointments and home services',
    description: 'Let customers book you online and manage every slot in one calendar.',
    points: ['Turn on Appointments for your business', 'Add services and optionally enable home visits with a visiting charge', 'Confirm or reschedule from the Appointments tab'],
  },
  {
    icon: Megaphone,
    title: 'Offers and loyalty points',
    description: 'Bring customers back with promotions and a points program you control.',
    points: ['Publish offers with an image or PDF', 'Set loyalty rules and redemption limits', 'See every customer’s points balance'],
  },
  {
    icon: ChartColumnIncreasing,
    title: 'Retention and insights',
    description: 'Understand how your business is doing and re-engage customers who drift away.',
    points: ['Track revenue, repeat customers and trends', 'Find customers to win back', 'See available reward points across customers'],
  },
  {
    icon: PhoneCall,
    title: 'Never miss a lead',
    description: 'Customers can ask for a callback from your business page and you get notified instantly.',
    points: ['Review all callback requests in one list', 'Call or email straight from the request', 'Mark requests as contacted when done'],
  },
]

function stepsForRole(role: Role): WalkthroughStep[] {
  return role === 'BUSINESS' ? businessSteps : customerSteps
}

type AppWalkthroughProps = {
  userId: string
  role: Role
}

export function AppWalkthrough({ userId, role }: AppWalkthroughProps) {
  const steps = stepsForRole(role)
  const [open, setOpen] = useState(() => role !== 'ADMIN' && isWalkthroughPending(userId))
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (role === 'ADMIN') return undefined
    const handleStart = () => {
      setStepIndex(0)
      setOpen(true)
    }
    window.addEventListener(START_WALKTHROUGH_EVENT, handleStart)
    return () => window.removeEventListener(START_WALKTHROUGH_EVENT, handleStart)
  }, [role])

  const close = useCallback(() => {
    clearWalkthroughPending(userId)
    setOpen(false)
  }, [userId])

  const isLast = stepIndex === steps.length - 1
  const isFirst = stepIndex === 0
  const step = steps[stepIndex]
  const Icon = step.icon

  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === 'backdropClick') return
        close()
      }}
      fullWidth
      maxWidth="xs"
      aria-labelledby="walkthrough-title"
      slotProps={{ paper: { sx: { m: 2, borderRadius: 4, overflow: 'hidden', maxHeight: 'calc(100dvh - 32px)' } } }}
    >
      <Box
        sx={(theme) => ({
          position: 'relative',
          px: 3,
          pt: 4,
          pb: 3,
          color: 'primary.contrastText',
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          '&::after': {
            content: '""',
            position: 'absolute',
            width: 150,
            height: 150,
            right: -48,
            top: -62,
            borderRadius: '50%',
            border: `1px solid ${alpha(theme.palette.common.white, 0.25)}`,
          },
        })}
      >
        <IconButton
          aria-label="Skip tour"
          onClick={close}
          size="small"
          sx={{ position: 'absolute', top: 10, right: 10, zIndex: 1, color: 'primary.contrastText', '&:hover': { bgcolor: 'rgba(255,255,255,0.18)' } }}
        >
          <X size={18} />
        </IconButton>
        <Box
          key={stepIndex}
          sx={{
            display: 'grid',
            justifyItems: 'center',
            gap: 1.4,
            textAlign: 'center',
            animation: 'walkthrough-in 260ms ease both',
            '@keyframes walkthrough-in': { from: { opacity: 0, transform: 'translateX(14px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Box sx={{ width: 68, height: 68, display: 'grid', placeItems: 'center', borderRadius: 3, bgcolor: 'rgba(255,255,255,0.2)', boxShadow: '0 8px 20px rgba(15,3,45,0.2)' }}>
            <Icon size={32} strokeWidth={1.9} aria-hidden="true" />
          </Box>
          <Typography id="walkthrough-title" component="h2" sx={{ fontSize: 21, fontWeight: 850, lineHeight: 1.2 }}>{step.title}</Typography>
        </Box>
      </Box>

      <Box sx={{ px: 3, pt: 2.5, pb: 1, minHeight: 190, overflowY: 'auto' }}>
        <Box key={stepIndex} sx={{ animation: 'walkthrough-in 260ms ease both', '@media (prefers-reduced-motion: reduce)': { animation: 'none' } }}>
          <Typography sx={{ color: 'text.primary', fontSize: 14, lineHeight: 1.5 }}>{step.description}</Typography>
          <Stack spacing={1} component="ul" sx={{ mt: 1.8, mb: 0, p: 0, listStyle: 'none' }}>
            {step.points.map((point) => (
              <Stack component="li" key={point} direction="row" spacing={1.1} sx={{ alignItems: 'flex-start' }}>
                <Box sx={(theme) => ({ mt: '2px', width: 18, height: 18, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: '50%', color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.12) })}>
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </Box>
                <Typography sx={{ color: 'text.secondary', fontSize: 13, lineHeight: 1.45 }}>{point}</Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      </Box>

      <Box sx={{ px: 3, pb: 2.5, pt: 1 }}>
        <Stack direction="row" spacing={0.7} role="group" aria-label={`Step ${stepIndex + 1} of ${steps.length}`} sx={{ justifyContent: 'center', mb: 2 }}>
          {steps.map((item, index) => (
            <Box
              key={item.title}
              component="button"
              type="button"
              aria-label={`Go to step ${index + 1}: ${item.title}`}
              aria-current={index === stepIndex ? 'step' : undefined}
              onClick={() => setStepIndex(index)}
              sx={{
                width: index === stepIndex ? 22 : 8,
                height: 8,
                p: 0,
                border: 0,
                cursor: 'pointer',
                borderRadius: 999,
                bgcolor: index === stepIndex ? 'primary.main' : 'divider',
                transition: 'width 200ms ease, background-color 200ms ease',
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {isFirst ? (
            <Button onClick={close} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Skip tour</Button>
          ) : (
            <Button onClick={() => setStepIndex((current) => current - 1)} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Back</Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            variant="contained"
            disableElevation
            endIcon={isLast ? <Sparkles size={16} /> : undefined}
            onClick={() => (isLast ? close() : setStepIndex((current) => current + 1))}
            sx={{ minWidth: 128, minHeight: 44, borderRadius: 2, fontWeight: 800, textTransform: 'none' }}
          >
            {isLast ? 'Get started' : isFirst ? 'Start tour' : 'Next'}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  )
}
