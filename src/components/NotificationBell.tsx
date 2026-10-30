import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Badge, Box, Button, ButtonBase, IconButton, Popover, Stack, Typography } from '@mui/material'
import { Bell, CalendarCheck2, CheckCheck, Clock3, FileText, Users } from 'lucide-react'
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

const emptyFeed: NotificationFeed = { notifications: [], unreadCount: 0 }
const pollingIntervalMs = 30_000
const clockTickMs = 60_000

/* Brand palette (home page gradient) */
const brand = { midnight: '#0F032D', violet: '#4E2BCC', lilac: '#905BF4', mist: '#EFEFEF' }

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

type NotificationGroup = { key: string; label: string; items: AppNotificationSummary[] }
type Urgency = { level: 'imminent' | 'near'; label: string } | null
type NotificationFilter = 'all' | 'unread' | 'appointments' | 'invoices'

const filterOptions: { id: NotificationFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'invoices', label: 'Invoices' },
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

function groupLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'TODAY'
  if (date.toDateString() === yesterday.toDateString()) return 'YESTERDAY'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()
}

function groupByDay(notifications: AppNotificationSummary[]): NotificationGroup[] {
  const groups: NotificationGroup[] = []
  for (const notification of notifications) {
    const date = new Date(notification.createdAt)
    const key = date.toDateString()
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.items.push(notification)
    } else {
      groups.push({ key, label: groupLabel(date), items: [notification] })
    }
  }
  return groups
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

export function NotificationBell({ contrast = false, prominent = false }: { contrast?: boolean; prominent?: boolean }) {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [feed, setFeed] = useState<NotificationFeed>(emptyFeed)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const [invitationResult, setInvitationResult] = useState<Record<string, 'accepted' | 'declined'>>({})
  const [pendingInvitationId, setPendingInvitationId] = useState<string | null>(null)
  const [filter, setFilter] = useState<NotificationFilter>('all')

  const businessAppointments = useAppSelector((state) => state.businessDashboard.data.appointments)
  const customerAppointments = useAppSelector((state) => state.customerDashboard.data.appointments)
  const adminAppointments = useAppSelector((state) => state.adminDashboard.data.appointments)
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

  const open = Boolean(anchorEl)
  const close = () => setAnchorEl(null)

  const visibleNotifications = useMemo(
    () => feed.notifications.filter((item) => matchesFilter(item, filter)),
    [feed.notifications, filter],
  )
  const groups = useMemo(() => groupByDay(visibleNotifications), [visibleNotifications])

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

      const query = new URLSearchParams()
      query.set('tab', 'appointments')
      if (appointmentId) {
        query.set('appointmentId', String(appointmentId))
      }
      navigate(`/dashboard?${query.toString()}`)
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

  const rowShellSx = {
    display: 'flex',
    width: '100%',
    gap: 1.25,
    px: 1.75,
    py: 1.25,
    textAlign: 'left' as const,
    borderBottom: '1px solid',
    borderColor: 'divider',
  }

  const renderIcon = (notification: AppNotificationSummary, unread: boolean, urgency: Urgency) => (
    <Box
      sx={{
        width: 40,
        height: 40,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: unread || urgency ? '#fff' : 'primary.main',
        background: urgency
          ? `linear-gradient(135deg, ${amber.main}, ${amber.deep})`
          : unread
            ? `linear-gradient(135deg, ${brand.lilac}, ${brand.violet})`
            : undefined,
        bgcolor: unread || urgency ? undefined : 'action.hover',
      }}
    >
      {notificationIcon(notification)}
    </Box>
  )

  const renderNotification = (notification: AppNotificationSummary) => {
    const unread = !notification.readAt
    const time = new Date(notification.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

    /* ---- Family invitation: Accept / Decline ---- */
    if (isFamilyInvitation(notification)) {
      const key = String(notification.id)
      const result = invitationResult[key]
      const busy = pendingInvitationId === key
      return (
        <Box
          key={notification.id}
          sx={{ ...rowShellSx, alignItems: 'flex-start', bgcolor: unread ? 'rgba(144,91,244,0.14)' : 'transparent' }}
        >
          {renderIcon(notification, unread, null)}
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: unread ? 600 : 500, lineHeight: 1.3 }}>
              {notification.title}
            </Typography>
            <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 12, lineHeight: 1.4 }}>
              {notification.message}
            </Typography>
            {result ? (
              <Typography sx={{ mt: 1, color: 'primary.main', fontSize: 12, fontWeight: 600 }}>
                {result === 'accepted' ? 'Invitation accepted' : 'Invitation declined'}
              </Typography>
            ) : (
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => void handleInvitation(notification, 'accept')}
                  sx={{
                    height: 32,
                    px: 2.25,
                    borderRadius: '16px',
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: 'none',
                    boxShadow: 'none',
                    background: `linear-gradient(135deg, ${brand.lilac}, ${brand.violet})`,
                    color: '#fff',
                  }}
                >
                  Accept
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={busy}
                  onClick={() => void handleInvitation(notification, 'decline')}
                  sx={{ height: 32, px: 2.25, borderRadius: '16px', fontSize: 12, fontWeight: 600, textTransform: 'none' }}
                >
                  Decline
                </Button>
              </Stack>
            )}
            <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: 11 }}>{time}</Typography>
          </Box>
          <Box
            aria-hidden
            sx={{ mt: 0.75, width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: unread ? 'primary.main' : 'transparent' }}
          />
        </Box>
      )
    }

    /* ---- Regular row (invoice, appointment, etc.) ---- */
    const urgency = appointmentUrgency(notification, allAppointments, now)
    const baseBg = urgency
      ? urgency.level === 'imminent'
        ? amber.strong
        : amber.soft
      : unread
        ? 'rgba(144,91,244,0.14)'
        : 'transparent'

    return (
      <ButtonBase
        key={notification.id}
        onClick={() => void handleNotificationClick(notification)}
        sx={{
          ...rowShellSx,
          alignItems: 'center',
          justifyContent: 'flex-start',
          bgcolor: baseBg,
          boxShadow: urgency ? `inset 3px 0 0 ${amber.main}` : 'none',
          transition: 'background-color 0.2s ease',
          '&:hover': { bgcolor: urgency ? amber.strong : 'rgba(144,91,244,0.2)' },
        }}
      >
        {renderIcon(notification, unread, urgency)}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: unread || urgency ? 600 : 500, lineHeight: 1.3 }}>
            {notification.title}
          </Typography>
          <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 12, lineHeight: 1.4 }}>
            {notification.message}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5, alignItems: 'center' }}>
            <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>{time}</Typography>
            {urgency && (
              <Box
                sx={{
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
          </Stack>
        </Box>
        <Box
          aria-hidden
          sx={{ width: 8, height: 8, flexShrink: 0, borderRadius: '50%', bgcolor: unread ? 'primary.main' : 'transparent' }}
        />
      </ButtonBase>
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
          setFilter('all')
          setActionError('')
          setReloadToken((current) => current + 1)
        }}
        sx={{
          width: prominent ? 58 : 38,
          height: prominent ? 58 : 38,
          color: prominent ? '#0F032D' : contrast ? '#ffffff' : 'primary.main',
          backgroundColor: prominent ? '#ffffff' : contrast ? 'rgba(255,255,255,0.14)' : 'transparent',
          '&:hover': { backgroundColor: prominent ? '#f5efff' : contrast ? 'rgba(255,255,255,0.24)' : 'action.hover' },
        }}
      >
        <Badge color="error" badgeContent={feed.unreadCount} max={99}>
          <Bell size={19} strokeWidth={2.2} />
        </Badge>
      </IconButton>

      {/* Placement is unchanged from the original dropdown */}
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 'min(360px, calc(100vw - 24px))', mt: 1, overflow: 'hidden', borderRadius: '20px' } } }}
      >
        <Stack direction="row" spacing={1} sx={{ px: 2, pt: 1.75, pb: 1.25, alignItems: 'center' }}>
          <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 600 }}>Notifications</Typography>
          {feed.unreadCount > 0 && (
            <Box
              sx={{
                height: 22,
                px: 1.25,
                borderRadius: '11px',
                bgcolor: brand.violet,
                color: brand.mist,
                fontSize: 11,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {feed.unreadCount} new
            </Box>
          )}
          <Box sx={{ flex: 1 }} />
          <Button
            size="small"
            startIcon={<CheckCheck size={14} />}
            onClick={() => void handleMarkAllRead()}
            disabled={feed.unreadCount === 0}
            sx={{ minWidth: 0, px: 0.8, fontSize: 11, fontWeight: 600, textTransform: 'none' }}
          >
            Mark all read
          </Button>
        </Stack>

        {actionError && (
          <Typography role="alert" sx={{ px: 2, py: 1, color: 'error.main', fontSize: 12 }}>
            {actionError}
          </Typography>
        )}
        {loadError && feed.notifications.length > 0 && (
          <Typography role="status" sx={{ px: 2, py: 0.8, color: 'text.secondary', fontSize: 11 }}>
            Could not refresh. Showing the latest loaded notifications.
          </Typography>
        )}

        {feed.notifications.length > 0 && (
          <Stack
            direction="row"
            spacing={1}
            role="group"
            aria-label="Filter notifications"
            sx={{ px: 2, pb: 1.25, overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
          >
            {filterOptions.map((option) => {
              const selected = filter === option.id
              return (
                <ButtonBase
                  key={option.id}
                  aria-pressed={selected}
                  onClick={() => setFilter(option.id)}
                  sx={{
                    flexShrink: 0,
                    height: 30,
                    px: 1.5,
                    borderRadius: '15px',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    fontWeight: 600,
                    color: selected ? brand.mist : 'text.primary',
                    bgcolor: selected ? brand.violet : 'action.hover',
                    border: '1px solid',
                    borderColor: selected ? brand.violet : 'divider',
                    transition: 'background-color 0.2s ease',
                    '&:hover': { bgcolor: selected ? brand.violet : 'action.selected' },
                  }}
                >
                  {option.label}
                  {option.id === 'unread' && feed.unreadCount > 0 ? ` · ${feed.unreadCount}` : ''}
                </ButtonBase>
              )
            })}
          </Stack>
        )}

        {loadError && feed.notifications.length === 0 ? (
          <Stack spacing={0.8} sx={{ alignItems: 'center', px: 2, py: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              Notifications could not be loaded.
            </Typography>
            <Button size="small" onClick={() => setReloadToken((current) => current + 1)}>
              Try again
            </Button>
          </Stack>
        ) : loading && feed.notifications.length === 0 ? (
          <Typography role="status" sx={{ px: 2, py: 3, color: 'text.secondary', fontSize: 12, textAlign: 'center' }}>
            Loading notifications...
          </Typography>
        ) : feed.notifications.length === 0 ? (
          <Stack spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 4 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'action.hover',
                color: 'primary.main',
              }}
            >
              <Bell size={22} />
            </Box>
            <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }}>You’re all caught up</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>
              New updates will appear here.
            </Typography>
          </Stack>
        ) : visibleNotifications.length === 0 ? (
          <Stack spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 4 }}>
            <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600 }}>
              {emptyFilterText[filter as Exclude<NotificationFilter, 'all'>]}
            </Typography>
            <Button size="small" onClick={() => setFilter('all')} sx={{ textTransform: 'none', fontWeight: 600 }}>
              Show all
            </Button>
          </Stack>
        ) : (
          <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {groups.map((group) => (
              <Box key={group.key}>
                <Typography
                  sx={{ px: 2, pt: 1.5, pb: 0.75, color: 'text.secondary', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}
                >
                  {group.label}
                </Typography>
                {group.items.map(renderNotification)}
              </Box>
            ))}
          </Box>
        )}
      </Popover>
    </>
  )
}