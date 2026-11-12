import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Avatar, Badge, Box, Button, IconButton, Menu, MenuItem, Popover, Stack, Typography } from '@mui/material'
import { Bell, CalendarCheck2, ChevronLeft, Clock3, FileText, MoreHorizontal, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  fetchMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotificationSummary,
  type AppointmentSummary,
  type NotificationFeed,
} from '../services/api'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { setActiveTab as setBusinessActiveTab } from '../store/businessDashboardSlice'
import { setActiveTab as setCustomerActiveTab } from '../store/customerDashboardSlice'
import { setActiveTab as setAdminActiveTab } from '../store/adminDashboardSlice'
import { getDashboardPath } from '../routes/dashboardPaths'

const emptyFeed: NotificationFeed = { notifications: [], unreadCount: 0 }
const pollingIntervalMs = 30_000
const clockTickMs = 60_000

/* Brand palette (home page gradient) */
const brand = { midnight: '#0F032D', violet: '#4E2BCC', lilac: '#905BF4', mist: '#EFEFEF' }

/* Figma notification screen tokens */
const HEADER_GRADIENT =
  'linear-gradient(180deg, #F1EBFC 0%, #CDBAF1 14%, #AE89F2 30%, #8C59F2 46%, #5B34D4 66%, #331A88 84%, #0F032D 100%)'
const PURPLE = '#5B34D4'
const PURPLE_DARK = '#331A88'
const LIME = '#CDF27E'
const UNREAD_BG = '#F1EBFC'
const TEXT_DARK = '#1B1535'
const TEXT_MUTED = '#6B6880'
const DIVIDER = '#E7E4EF'

/* Warm "time is near" accent for upcoming appointments */
const amber = { main: '#F5A524', deep: '#F97316', soft: 'rgba(245,165,36,0.14)', strong: 'rgba(245,165,36,0.24)' }

/* ------------------------------------------------------------------ */
/* TODO: connect this to your family-invitation API.                   */
/* Replace the body with the real accept / decline request. It should  */
/* resolve on success and throw on failure.                            */
/* ------------------------------------------------------------------ */
async function respondToFamilyInvitation(
  notification: AppNotificationSummary,
  decision: 'accept' | 'decline',
): Promise<void> {
  void notification
  void decision
  throw new Error('Family invitation API is not connected yet')
}

type Urgency = { level: 'imminent' | 'near'; label: string } | null
type NotificationFilter = 'all' | 'unread' | 'appointments' | 'invoices'

const filterOptions: { id: Exclude<NotificationFilter, 'invoices'>; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'unread', label: 'Unread' },
]

const emptyFilterText: Record<Exclude<NotificationFilter, 'all'>, string> = {
  unread: 'No unread notifications',
  appointments: 'No appointment notifications',
  invoices: 'No invoice notifications',
}

function isInvoiceNotification(notification: AppNotificationSummary): boolean {
  return `${notification.type || ''} ${notification.title || ''}`.toLowerCase().includes('invoice')
}

function matchesFilter(notification: AppNotificationSummary, filter: NotificationFilter): boolean {
  if (filter === 'unread') return !notification.readAt
  if (filter === 'appointments') return isAppointmentNotification(notification)
  if (filter === 'invoices') return isInvoiceNotification(notification)
  return true
}

function isAppointmentNotification(notification: AppNotificationSummary): boolean {
  const typeStr = (notification.type || '').toUpperCase()
  const titleStr = (notification.title || '').toLowerCase()
  const msgStr = (notification.message || '').toLowerCase()
  const urlStr = (notification.targetUrl || '').toLowerCase()

  return (
    typeStr.includes('APPOINTMENT') ||
    titleStr.includes('appointment') ||
    titleStr.includes('booking') ||
    msgStr.includes('appointment') ||
    msgStr.includes('booking') ||
    urlStr.includes('appointment') ||
    Boolean(notification.appointmentId)
  )
}

function isFamilyInvitation(notification: AppNotificationSummary): boolean {
  const text = `${notification.type || ''} ${notification.title || ''}`.toLowerCase()
  return text.includes('family') && text.includes('invitation')
}

function notificationIcon(notification: AppNotificationSummary): ReactNode {
  const text = `${notification.type || ''} ${notification.title || ''}`.toLowerCase()
  if (text.includes('invoice')) return <FileText size={20} />
  if (isFamilyInvitation(notification)) return <Users size={20} />
  if (isAppointmentNotification(notification)) return <CalendarCheck2 size={20} />
  return <Bell size={20} />
}

/* Short relative time shown on the right of each row: now, 2m, 8h, 3d, then a date */
function shortTime(iso: string): string {
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return ''
  const minutes = Math.floor((Date.now() - time) / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/* Strict lookup (no guessing) so we never highlight the wrong appointment */
function findAppointmentStrict(
  notification: AppNotificationSummary,
  appointments: AppointmentSummary[],
): AppointmentSummary | undefined {
  let id: number | null = null
  if (typeof notification.appointmentId === 'number' && notification.appointmentId > 0) {
    id = notification.appointmentId
  } else if (notification.targetUrl) {
    const match = notification.targetUrl.match(/(?:appointmentId=|appointments\/)(\d+)/i)
    if (match && match[1]) id = Number(match[1])
  }
  return id ? appointments.find((a) => a.id === id) : undefined
}

function appointmentUrgency(
  notification: AppNotificationSummary,
  appointments: AppointmentSummary[],
  now: number,
): Urgency {
  if (!isAppointmentNotification(notification)) return null
  const appointment = findAppointmentStrict(notification, appointments)
  if (!appointment?.scheduledAt) return null

  const diff = new Date(appointment.scheduledAt).getTime() - now
  if (!(diff > 0) || diff > 24 * 60 * 60 * 1000) return null

  const mins = Math.ceil(diff / 60000)
  const label = mins < 60 ? `In ${mins} min` : `In ${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`
  return { level: mins <= 60 ? 'imminent' : 'near', label }
}

function resolveAppointmentId(
  notification: AppNotificationSummary,
  appointments: AppointmentSummary[],
): number | null {
  // 1. Direct field on notification
  if (typeof notification.appointmentId === 'number' && notification.appointmentId > 0) {
    return notification.appointmentId
  }

  // 2. Extracted from targetUrl (e.g. /dashboard?tab=appointments&appointmentId=11 or /appointments/11)
  if (notification.targetUrl) {
    const urlMatch = notification.targetUrl.match(/(?:appointmentId=|appointments\/)(\d+)/i)
    if (urlMatch && urlMatch[1]) {
      return Number(urlMatch[1])
    }
  }

  // 3. Extracted from message or title (e.g. "Appointment #11" or "Appointment ID 11")
  const textMatch = `${notification.title} ${notification.message}`.match(
    /(?:appointment|booking)\s*(?:#|id:?|no\.?)?\s*(\d+)/i,
  )
  if (textMatch && textMatch[1]) {
    const parsedId = Number(textMatch[1])
    if (appointments.some((a) => a.id === parsedId)) {
      return parsedId
    }
  }

  // 4. Match by service name in notification message or title
  const fullText = `${notification.title} ${notification.message}`.toLowerCase()
  const serviceMatch = appointments.find((a) => a.serviceName && fullText.includes(a.serviceName.toLowerCase()))
  if (serviceMatch) {
    return serviceMatch.id
  }

  // 5. Match by approximate creation timestamp (within 60 seconds)
  if (notification.createdAt) {
    const notifTime = new Date(notification.createdAt).getTime()
    const timeMatch = appointments.find((a) => {
      if (!a.createdAt) return false
      const apptTime = new Date(a.createdAt).getTime()
      return Math.abs(apptTime - notifTime) < 60000
    })
    if (timeMatch) {
      return timeMatch.id
    }
  }

  // 6. Fallback to newest appointment
  if (appointments.length > 0) {
    const sorted = [...appointments].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.scheduledAt || 0).getTime()
      const timeB = new Date(b.createdAt || b.scheduledAt || 0).getTime()
      return timeB - timeA
    })
    return sorted[0].id
  }

  return null
}

/* Pulls the invoice a notification is about: an explicit id when the API sends one,
   otherwise the invoice number mentioned in the text (e.g. "Invoice INV-490ACAD7 has been issued…"). */
function extractInvoiceRef(notification: AppNotificationSummary): { invoiceId: number | null; invoiceNumber: string | null } {
  const withId = notification as AppNotificationSummary & { invoiceId?: number | null }
  let invoiceId = typeof withId.invoiceId === 'number' && withId.invoiceId > 0 ? withId.invoiceId : null
  if (!invoiceId && notification.targetUrl) {
    const urlMatch = notification.targetUrl.match(/(?:invoiceId=|invoices\/)(\d+)/i)
    if (urlMatch?.[1]) invoiceId = Number(urlMatch[1])
  }
  const numberMatch = `${notification.title ?? ''} ${notification.message ?? ''}`.match(/\bINV-[A-Z0-9]+\b/i)
  return { invoiceId, invoiceNumber: numberMatch ? numberMatch[0].toUpperCase() : null }
}

type PanelPlacement = { top: number; left: number; width: number; height: number; borderRadius: string }

/* The app renders inside a phone-sized frame (marked with data-app-frame) that is narrower than the browser window.
   The notifications page fills exactly that frame, like a full screen of the app. */
function computePlacement(anchor: HTMLElement): PanelPlacement {
  const frameEl = anchor.closest<HTMLElement>('[data-app-frame]')
  const frame = frameEl?.getBoundingClientRect()
  return {
    top: frame?.top ?? 0,
    left: frame?.left ?? 0,
    width: frame?.width ?? window.innerWidth,
    height: frame?.height ?? window.innerHeight,
    borderRadius: frameEl ? window.getComputedStyle(frameEl).borderRadius : '0px',
  }
}

export function NotificationBell({ contrast = false, prominent = false }: { contrast?: boolean; prominent?: boolean }) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [placement, setPlacement] = useState<PanelPlacement | null>(null)
  const [feed, setFeed] = useState<NotificationFeed>(emptyFeed)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [invitationResult, setInvitationResult] = useState<Record<string, 'accepted' | 'declined'>>({})
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null)
  const [filter, setFilter] = useState<NotificationFilter>('all')
  const [menu, setMenu] = useState<{ anchor: HTMLElement; notification: AppNotificationSummary } | null>(null)

  const businessAppointments = useAppSelector((state) => state.businessDashboard.data.appointments)
  const customerAppointments = useAppSelector((state) => state.customerDashboard.data.appointments)
  const adminAppointments = useAppSelector((state) => state.adminDashboard.data.appointments)
  const role = useAppSelector((state) => state.auth.authUser?.role ?? 'BUSINESS')
  const profile = useAppSelector((state) => state.auth.authUser) as unknown as {
    profilePictureUrl?: string | null
    profileImageUrl?: string | null
    fullName?: string
    name?: string
  } | null
  const profileImage = profile?.profilePictureUrl ?? profile?.profileImageUrl ?? undefined
  const profileInitial = (profile?.fullName ?? profile?.name ?? '').trim().charAt(0).toUpperCase()
  const allAppointments = [...businessAppointments, ...customerAppointments, ...adminAppointments]

  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (active) setLoading(true)
      try {
        const nextFeed = await fetchMyNotifications()
        if (active) {
          setFeed(nextFeed)
          setLoadError(false)
        }
      } catch {
        if (active) setLoadError(true)
      } finally {
        if (active) setLoading(false)
      }
    }
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }

    void refresh()
    const intervalId = window.setInterval(refreshWhenVisible, pollingIntervalMs)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)

    const handleNotifAdded = () => {
      setReloadToken((current) => current + 1)
    }
    window.addEventListener('bhive:notification-added', handleNotifAdded)

    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
      window.removeEventListener('bhive:notification-added', handleNotifAdded)
    }
  }, [reloadToken])

  /* Keeps "In 25 min" labels fresh */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), clockTickMs)
    return () => window.clearInterval(id)
  }, [])

  const open = Boolean(anchorEl && placement)
  const close = () => {
    setAnchorEl(null)
    setMenu(null)
  }

  /* Keep the page inside the frame if the window is resized or rotated while it is open */
  useEffect(() => {
    if (!anchorEl) return
    const update = () => setPlacement(computePlacement(anchorEl))
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [anchorEl])

  const visibleNotifications = useMemo(
    () => feed.notifications.filter((item) => matchesFilter(item, filter)),
    [feed.notifications, filter],
  )

  const tabCounts = useMemo(
    () => ({
      all: feed.notifications.length,
      appointments: feed.notifications.filter(isAppointmentNotification).length,
      unread: feed.unreadCount,
    }),
    [feed.notifications, feed.unreadCount],
  )

  const markReadInFeed = async (notification: AppNotificationSummary) => {
    const updated = await markNotificationRead(notification.id)
    setFeed((current) => ({
      unreadCount: Math.max(
        0,
        current.unreadCount - (current.notifications.find((item) => item.id === notification.id)?.readAt ? 0 : 1),
      ),
      notifications: current.notifications.map((item) => (item.id === notification.id ? updated : item)),
    }))
  }

  const handleNotificationClick = async (notification: AppNotificationSummary) => {
    try {
      await markReadInFeed(notification)
      setActionError('')
    } catch {
      setActionError('Could not update this notification. Try again.')
    }

    close()

    // Customers: open the invoice this notification is about. The dashboard reads these params,
    // switches to the Invoices tab and opens that invoice's details.
    if (role === 'CUSTOMER' && isInvoiceNotification(notification)) {
      const { invoiceId, invoiceNumber } = extractInvoiceRef(notification)
      if (invoiceId || invoiceNumber) {
        const params = new URLSearchParams()
        if (invoiceId) params.set('invoiceId', String(invoiceId))
        if (invoiceNumber) params.set('invoiceNumber', invoiceNumber)
        dispatch(setCustomerActiveTab('invoices'))
        navigate(`${getDashboardPath(role, 'invoices')}?${params.toString()}`)
        return
      }
    }

    if (isAppointmentNotification(notification)) {
      const appointmentId = resolveAppointmentId(notification, allAppointments)

      // Switch active tab on all slices to appointments
      dispatch(setBusinessActiveTab('appointments'))
      dispatch(setCustomerActiveTab('appointments'))
      dispatch(setAdminActiveTab('appointments'))

      // Broadcast custom event for immediate responsiveness
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('bhive:open-appointment', {
            detail: { appointmentId, notification },
          }),
        )
      }

      const query = appointmentId ? `?appointmentId=${appointmentId}` : ''
      navigate(`${getDashboardPath(role, 'appointments')}${query}`)
      return
    }

    const targetUrl = notification.targetUrl
    if (targetUrl?.startsWith('/') && !targetUrl.startsWith('//')) {
      navigate(targetUrl)
    }
  }

  const handleInvitation = async (notification: AppNotificationSummary, decision: 'accept' | 'decline') => {
    const key = String(notification.id)
    setPendingInvitationId(key)
    try {
      await respondToFamilyInvitation(notification, decision)
      setInvitationResult((current) => ({ ...current, [key]: decision === 'accept' ? 'accepted' : 'declined' }))
      if (!notification.readAt) {
        try {
          await markReadInFeed(notification)
        } catch {
          /* the invitation itself succeeded; read-state will sync on next refresh */
        }
      }
      setActionError('')
    } catch {
      setActionError('Could not update the invitation. Try again.')
    } finally {
      setPendingInvitationId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      const readAt = new Date().toISOString()
      setFeed((current) => ({
        unreadCount: 0,
        notifications: current.notifications.map((item) => ({ ...item, readAt: item.readAt ?? readAt })),
      }))
      setActionError('')
    } catch {
      setActionError('Could not update notifications. Try again.')
    }
  }

  const renderAvatar = (notification: AppNotificationSummary, urgency: Urgency) => {
    const invoice = isInvoiceNotification(notification)
    return (
      <Box
        sx={{
          width: 48,
          height: 48,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: urgency ? '#fff' : invoice ? PURPLE_DARK : '#56607A',
          background: urgency ? `linear-gradient(135deg, ${amber.main}, ${amber.deep})` : undefined,
          bgcolor: urgency ? undefined : invoice ? LIME : '#E4E8F0',
        }}
      >
        {notificationIcon(notification)}
      </Box>
    )
  }

  const renderNotification = (notification: AppNotificationSummary) => {
    const unread = !notification.readAt
    const invitation = isFamilyInvitation(notification)
    const urgency = invitation ? null : appointmentUrgency(notification, allAppointments, now)
    const invitationKey = String(notification.id)
    const invitationState = invitationResult[invitationKey]
    const busy = pendingInvitationId === invitationKey

    const background = urgency
      ? urgency.level === 'imminent'
        ? amber.strong
        : amber.soft
      : unread
        ? UNREAD_BG
        : '#FFFFFF'

    return (
      <Box
        key={notification.id}
        {...(invitation
          ? {}
          : {
              role: 'button',
              tabIndex: 0,
              onClick: () => void handleNotificationClick(notification),
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Enter') void handleNotificationClick(notification)
              },
            })}
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '13px',
          px: '24px',
          pt: '22px',
          pb: '26px',
          cursor: invitation ? 'default' : 'pointer',
          bgcolor: background,
          boxShadow: urgency ? `inset 3px 0 0 ${amber.main}` : 'none',
          borderBottom: `1px solid ${DIVIDER}`,
          textAlign: 'left',
        }}
      >
        {unread && (
          <Box
            aria-label="Unread"
            sx={{ position: 'absolute', left: 9, top: 43, width: 6, height: 6, borderRadius: '50%', bgcolor: PURPLE }}
          />
        )}

        {renderAvatar(notification, urgency)}

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ mt: '2px', color: TEXT_DARK, fontSize: 14, fontWeight: 700, lineHeight: '21px' }}>
            {notification.title}
          </Typography>
          <Typography sx={{ color: '#2B2744', fontSize: 14, lineHeight: '21px' }}>
            {notification.message}
          </Typography>

          {urgency && (
            <Box
              sx={{
                mt: 0.9,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                height: 20,
                px: 1,
                borderRadius: '10px',
                bgcolor: amber.main,
                color: brand.midnight,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <Clock3 size={12} />
              {urgency.label}
            </Box>
          )}

          {invitation &&
            (invitationState ? (
              <Typography sx={{ mt: 1.2, color: PURPLE, fontSize: 13, fontWeight: 600 }}>
                {invitationState === 'accepted' ? 'Invitation accepted' : 'Invitation declined'}
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ mt: 1.4 }}>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  disabled={busy}
                  onClick={() => void handleInvitation(notification, 'accept')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 2,
                    py: 0.5,
                    fontSize: 13.5,
                    fontWeight: 500,
                    bgcolor: PURPLE,
                    color: '#FFFFFF',
                    '&:hover': { bgcolor: PURPLE_DARK },
                  }}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void handleInvitation(notification, 'decline')}
                  sx={{
                    textTransform: 'none',
                    borderRadius: '6px',
                    px: 2,
                    py: 0.5,
                    fontSize: 13.5,
                    fontWeight: 500,
                    bgcolor: '#FFFFFF',
                    color: TEXT_DARK,
                    borderColor: '#D6D2E2',
                    '&:hover': { bgcolor: '#F7F5FC', borderColor: '#BFB8D6' },
                  }}
                >
                  Decline
                </Button>
              </Stack>
            ))}
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0 }}>
          <Typography sx={{ mt: '2px', fontSize: 12, lineHeight: '21px', color: TEXT_MUTED }}>{shortTime(notification.createdAt)}</Typography>
          <IconButton
            size="small"
            aria-label="More options"
            onClick={(event) => {
              event.stopPropagation()
              setMenu({ anchor: event.currentTarget, notification })
            }}
            sx={{ color: '#1B1535', p: 0, height: 21, minWidth: 24, borderRadius: '6px' }}
          >
            <MoreHorizontal size={20} strokeWidth={3} />
          </IconButton>
        </Box>
      </Box>
    )
  }

  return (
    <>
      <IconButton
        aria-label={feed.unreadCount > 0 ? `Notifications, ${feed.unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
          setPlacement(computePlacement(event.currentTarget))
          setFilter('all')
          setActionError('')
          setReloadToken((current) => current + 1)
        }}
        sx={{
          width: prominent ? 44 : 38,
          height: prominent ? 44 : 38,
          color: prominent ? '#0F032D' : contrast ? '#ffffff' : 'primary.main',
          backgroundColor: prominent ? '#ffffff' : contrast ? 'rgba(255,255,255,0.14)' : 'transparent',
          '&:hover': { backgroundColor: prominent ? '#f5efff' : contrast ? 'rgba(255,255,255,0.24)' : 'action.hover' },
        }}
      >
        <Badge color="error" badgeContent={feed.unreadCount} max={99}>
          <Bell size={19} strokeWidth={2.2} />
        </Badge>
      </IconButton>

      {/* Full page that fills the app frame (see computePlacement) */}
      <Popover
        open={open}
        onClose={close}
        anchorReference="anchorPosition"
        anchorPosition={placement ? { top: placement.top, left: placement.left } : undefined}
        marginThreshold={0}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              width: placement?.width ?? '100%',
              height: placement?.height ?? '100%',
              maxWidth: 'none',
              maxHeight: 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              borderRadius: placement?.borderRadius ?? 0,
              bgcolor: '#FFFFFF',
              backgroundImage: 'none',
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            flexShrink: 0,
            background: HEADER_GRADIENT,
            borderRadius: '0 0 35px 35px',
            pt: 'calc(env(safe-area-inset-top) + 44px)',
            pb: '24px',
            px: '18px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <IconButton
            onClick={close}
            aria-label="Back"
            sx={{
              width: 44,
              height: 44,
              color: '#2A1670',
              bgcolor: '#CDBAF1',
              '&:hover': { bgcolor: '#D9CBF6' },
            }}
          >
            <ChevronLeft size={24} strokeWidth={2.4} />
          </IconButton>
          <Typography component="h2" sx={{ flex: 1, color: '#FFFFFF', fontSize: 26, fontWeight: 400, lineHeight: 1.2 }}>
            Notifications
          </Typography>
          <Avatar src={profileImage} sx={{ width: 44, height: 44, bgcolor: 'rgba(255,255,255,0.28)', color: '#FFFFFF' }}>
            {profileInitial}
          </Avatar>
        </Box>

        {/* Tabs */}
        <Box
          role="tablist"
          aria-label="Filter notifications"
          sx={{ flexShrink: 0, display: 'flex', borderBottom: `1px solid ${DIVIDER}` }}
        >
          {filterOptions.map((option) => {
            const active = filter === option.id
            return (
              <Box
                key={option.id}
                role="tab"
                aria-selected={active}
                tabIndex={0}
                onClick={() => setFilter(option.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setFilter(option.id)
                }}
                sx={{ flex: 1, display: 'flex', justifyContent: 'center', cursor: 'pointer', mb: '-1px' }}
              >
                <Box
                  sx={{
                    px: '16px',
                    height: 48,
                    display: 'inline-flex',
                    alignItems: 'center',
                    whiteSpace: 'nowrap',
                    fontSize: 15,
                    fontWeight: active ? 600 : 500,
                    color: active ? '#2B1A7A' : '#4A4760',
                    borderBottom: `3px solid ${active ? PURPLE : 'transparent'}`,
                  }}
                >
                {option.label}
                <Box
                  component="span"
                  sx={{
                    ml: 1,
                    minWidth: 24,
                    height: 22,
                    px: 0.8,
                    borderRadius: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                    color: active ? '#1B1535' : '#3F3D56',
                    bgcolor: active ? LIME : '#E9E7F2',
                  }}
                >
                  {tabCounts[option.id]}
                </Box>
                </Box>
              </Box>
            )
          })}
        </Box>

        {actionError && (
          <Typography role="alert" sx={{ px: 2, py: 1, color: 'error.main', fontSize: 12 }}>
            {actionError}
          </Typography>
        )}
        {loadError && feed.notifications.length > 0 && (
          <Typography role="status" sx={{ px: 2, py: 0.8, color: TEXT_MUTED, fontSize: 11 }}>
            Could not refresh. Showing the latest loaded notifications.
          </Typography>
        )}

        {/* List */}
        {loadError && feed.notifications.length === 0 ? (
          <Stack spacing={0.8} sx={{ alignItems: 'center', px: 2, py: 4 }}>
            <Typography variant="body2" sx={{ color: TEXT_MUTED, textAlign: 'center' }}>
              Notifications could not be loaded.
            </Typography>
            <Button size="small" onClick={() => setReloadToken((current) => current + 1)}>
              Try again
            </Button>
          </Stack>
        ) : loading && feed.notifications.length === 0 ? (
          <Typography role="status" sx={{ px: 2, py: 4, color: TEXT_MUTED, fontSize: 13, textAlign: 'center' }}>
            Loading notifications...
          </Typography>
        ) : feed.notifications.length === 0 ? (
          <Stack spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 5 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#ECEAF2',
                color: PURPLE,
              }}
            >
              <Bell size={22} />
            </Box>
            <Typography sx={{ color: TEXT_DARK, fontSize: 14, fontWeight: 600 }}>You’re all caught up</Typography>
            <Typography variant="caption" sx={{ color: TEXT_MUTED, textAlign: 'center' }}>
              New updates will appear here.
            </Typography>
          </Stack>
        ) : visibleNotifications.length === 0 ? (
          <Stack spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 5 }}>
            <Typography sx={{ color: TEXT_DARK, fontSize: 14, fontWeight: 600 }}>
              {emptyFilterText[filter as Exclude<NotificationFilter, 'all'>]}
            </Typography>
            <Button size="small" onClick={() => setFilter('all')} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Show all
            </Button>
          </Stack>
        ) : (
          <Box sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', pb: 'calc(16px + env(safe-area-inset-bottom))', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
            {visibleNotifications.map(renderNotification)}
          </Box>
        )}
      </Popover>

      {/* "•••" menu on each row */}
      <Menu anchorEl={menu?.anchor ?? null} open={Boolean(menu)} onClose={() => setMenu(null)}>
        {menu && !menu.notification.readAt && (
          <MenuItem
            onClick={() => {
              const target = menu.notification
              setMenu(null)
              void markReadInFeed(target).catch(() => setActionError('Could not update this notification. Try again.'))
            }}
          >
            Mark as read
          </MenuItem>
        )}
        <MenuItem
          disabled={feed.unreadCount === 0}
          onClick={() => {
            setMenu(null)
            void handleMarkAllRead()
          }}
        >
          Mark all as read
        </MenuItem>
      </Menu>
    </>
  )
}