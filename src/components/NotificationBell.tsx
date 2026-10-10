import { useEffect, useState } from 'react'
import { Badge, Box, Button, ButtonBase, Divider, IconButton, Popover, Stack, Typography } from '@mui/material'
import { Bell, CheckCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { fetchMyNotifications, markAllNotificationsRead, markNotificationRead, type NotificationFeed } from '../services/api'

const emptyFeed: NotificationFeed = { notifications: [], unreadCount: 0 }
const pollingIntervalMs = 30_000

export function NotificationBell() {
  const navigate = useNavigate()
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)
  const [feed, setFeed] = useState<NotificationFeed>(emptyFeed)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

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
    return () => {
      active = false
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [reloadToken])

  const open = Boolean(anchorEl)
  const close = () => setAnchorEl(null)

  const handleMarkRead = async (notificationId: number, targetUrl?: string) => {
    try {
      const updated = await markNotificationRead(notificationId)
      setFeed((current) => ({
        unreadCount: Math.max(0, current.unreadCount - (current.notifications.find((item) => item.id === notificationId)?.readAt ? 0 : 1)),
        notifications: current.notifications.map((item) => item.id === notificationId ? updated : item),
      }))
      setActionError('')
      close()
      if (targetUrl?.startsWith('/') && !targetUrl.startsWith('//')) navigate(targetUrl)
    } catch {
      setActionError('Could not update this notification. Try again.')
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
        sx={{ width: 38, height: 38, color: 'text.secondary' }}
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
            {feed.notifications.map((notification) => (
              <ButtonBase
                key={notification.id}
                onClick={() => void handleMarkRead(notification.id, notification.targetUrl)}
                sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start', gap: 1, px: 1.5, py: 1.2, textAlign: 'left', borderBottom: '1px solid var(--mui-palette-divider)', bgcolor: notification.readAt ? 'background.paper' : 'action.hover' }}
              >
                <Box sx={{ width: 7, height: 7, mt: 0.7, flexShrink: 0, borderRadius: '50%', bgcolor: notification.readAt ? 'transparent' : 'primary.main' }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ color: 'text.primary', fontSize: 12, fontWeight: notification.readAt ? 600 : 800 }}>{notification.title}</Typography>
                  <Typography sx={{ mt: 0.25, color: 'text.secondary', fontSize: 11, lineHeight: 1.4 }}>{notification.message}</Typography>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.disabled', fontSize: 10 }}>
                    {new Date(notification.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                </Box>
              </ButtonBase>
            ))}
          </Stack>
        )}
      </Popover>
    </>
  )
}