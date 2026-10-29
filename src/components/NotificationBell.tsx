import { useEffect, useState } from 'react'
import { Badge, Box, Button, ButtonBase, Divider, IconButton, Popover, Stack, Typography } from '@mui/material'
import { Bell, CalendarCheck2, CheckCheck } from 'lucide-react'
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

  const open = Boolean(anchorEl)
  const close = () => setAnchorEl(null)

  const handleNotificationClick = async (notification: AppNotificationSummary) => {
    try {
      const updated = await markNotificationRead(notification.id)
      setFeed((current) => ({
        unreadCount: Math.max(
          0,
          current.unreadCount - (current.notifications.find((item) => item.id === notification.id)?.readAt ? 0 : 1),
        ),
        notifications: current.notifications.map((item) => (item.id === notification.id ? updated : item)),
      }))
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

  return (
    <>
      <IconButton
        aria-label={feed.unreadCount > 0 ? `Notifications, ${feed.unreadCount} unread` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => {
          setAnchorEl(event.currentTarget)
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
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 'min(360px, calc(100vw - 24px))', mt: 1, overflow: 'hidden' } } }}
      >
        <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1.25, alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ color: 'text.primary', fontSize: 14, fontWeight: 800 }}>Notifications</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{feed.unreadCount} unread</Typography>
          </Box>
          <Button
            size="small"
            startIcon={<CheckCheck size={14} />}
            onClick={() => void handleMarkAllRead()}
            disabled={feed.unreadCount === 0}
            sx={{ minWidth: 0, px: 0.8, fontSize: 11 }}
          >
            Mark all read
          </Button>
        </Stack>
        <Divider />
        {actionError && <Typography role="alert" sx={{ px: 1.5, py: 1, color: 'error.main', fontSize: 12 }}>{actionError}</Typography>}
        {loadError && feed.notifications.length > 0 && <Typography role="status" sx={{ px: 1.5, py: 0.8, color: '#8a5a12', fontSize: 11 }}>Could not refresh. Showing the latest loaded notifications.</Typography>}
        {loadError && feed.notifications.length === 0 ? (
          <Stack spacing={0.8} sx={{ alignItems: 'center', px: 2, py: 2.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>Notifications could not be loaded.</Typography>
            <Button size="small" onClick={() => setReloadToken((current) => current + 1)}>Try again</Button>
          </Stack>
        ) : loading && feed.notifications.length === 0 ? (
          <Typography role="status" sx={{ px: 2, py: 3, color: 'text.secondary', fontSize: 12, textAlign: 'center' }}>Loading notifications...</Typography>
        ) : feed.notifications.length === 0 ? (
          <Stack spacing={0.5} sx={{ alignItems: 'center', px: 2, py: 3 }}>
            <Bell size={20} color="#80918e" />
            <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>You’re all caught up</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center' }}>New updates will appear here.</Typography>
          </Stack>
        ) : (
          <Stack sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {feed.notifications.map((notification) => {
              const isAppt = isAppointmentNotification(notification)
              return (
                <ButtonBase
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification)}
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-start',
                    gap: 1.2,
                    px: 1.5,
                    py: 1.2,
                    textAlign: 'left',
                    borderBottom: '1px solid var(--mui-palette-divider)',
                    bgcolor: notification.readAt ? 'background.paper' : 'action.hover',
                    transition: 'background-color 0.2s ease',
                    '&:hover': {
                      bgcolor: 'action.selected',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      mt: 0.8,
                      flexShrink: 0,
                      borderRadius: '50%',
                      bgcolor: notification.readAt ? 'transparent' : 'primary.main',
                    }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center' }}>
                      {isAppt && <CalendarCheck2 size={13} color="#4E2BCC" style={{ flexShrink: 0 }} />}
                      <Typography
                        sx={{
                          color: 'text.primary',
                          fontSize: 12,
                          fontWeight: notification.readAt ? 600 : 800,
                          lineHeight: 1.3,
                        }}
                      >
                        {notification.title}
                      </Typography>
                    </Stack>
                    <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11, lineHeight: 1.4 }}>
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.disabled', fontSize: 10 }}>
                      {new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                    </Typography>
                  </Box>
                </ButtonBase>
              )
            })}
          </Stack>
        )}
      </Popover>
    </>
  )
}