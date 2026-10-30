import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Paper, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { CheckCircle2, Mail, PhoneCall, RefreshCw, Undo2 } from 'lucide-react'
import {
  fetchCallbackRequests,
  updateCallbackRequestStatus,
  type CallbackRequest,
  type CallbackRequestStatus,
} from '../../../services/api/callbackApi'

type CallbackRequestsWorkspaceProps = {
  businessId: number
}

type Filter = 'ALL' | CallbackRequestStatus

function formatRequestedAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function CallbackRequestsWorkspace({ businessId }: CallbackRequestsWorkspaceProps) {
  const [requests, setRequests] = useState<CallbackRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchCallbackRequests(businessId)
      .then(setRequests)
      .catch(() => setError('Could not load callback requests.'))
      .finally(() => setLoading(false))
  }, [businessId])

  useEffect(() => {
    let active = true
    fetchCallbackRequests(businessId)
      .then((result) => { if (active) setRequests(result) })
      .catch(() => { if (active) setError('Could not load callback requests.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [businessId])

  const changeStatus = async (request: CallbackRequest, status: CallbackRequestStatus) => {
    setUpdatingId(request.id)
    setError('')
    try {
      const updated = await updateCallbackRequestStatus(businessId, request.id, status)
      setRequests((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update this request.')
    } finally {
      setUpdatingId(null)
    }
  }

  const pendingCount = requests.filter((request) => request.status === 'PENDING').length
  const visible = filter === 'ALL' ? requests : requests.filter((request) => request.status === filter)

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ color: 'text.primary', fontSize: 18, fontWeight: 850 }}>Callback requests</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
            {pendingCount > 0 ? `${pendingCount} waiting for a call` : 'No pending requests'}
          </Typography>
        </Box>
        <Button size="small" startIcon={<RefreshCw size={14} />} disabled={loading} onClick={load} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Refresh
        </Button>
      </Stack>

      <ToggleButtonGroup
        exclusive
        size="small"
        value={filter}
        onChange={(_, value: Filter | null) => { if (value) setFilter(value) }}
        aria-label="Filter callback requests"
      >
        <ToggleButton value="ALL" sx={{ textTransform: 'none', px: 1.6 }}>All</ToggleButton>
        <ToggleButton value="PENDING" sx={{ textTransform: 'none', px: 1.6 }}>Pending</ToggleButton>
        <ToggleButton value="CONTACTED" sx={{ textTransform: 'none', px: 1.6 }}>Contacted</ToggleButton>
      </ToggleButtonGroup>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Loading requests…</Typography>}
      {!loading && !error && visible.length === 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderRadius: 2.5 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
            {requests.length === 0 ? 'Customers can request a callback from your business page. Requests will appear here.' : 'No requests match this filter.'}
          </Typography>
        </Paper>
      )}

      {visible.map((request) => {
        const pending = request.status === 'PENDING'
        return (
          <Paper key={request.id} variant="outlined" sx={{ p: 1.6, borderRadius: 2.5 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography noWrap sx={{ color: 'text.primary', fontSize: 15, fontWeight: 800 }}>{request.requesterName}</Typography>
                <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>{formatRequestedAt(request.createdAt)}</Typography>
              </Box>
              <Chip
                size="small"
                label={pending ? 'Pending' : 'Contacted'}
                sx={(theme) => ({
                  fontWeight: 800,
                  color: pending ? theme.palette.warning.dark : theme.palette.success.main,
                  bgcolor: alpha(pending ? theme.palette.warning.main : theme.palette.success.main, 0.14),
                })}
              />
            </Stack>

            <Typography sx={{ mt: 1, color: request.reason ? 'text.primary' : 'text.disabled', fontSize: 13, overflowWrap: 'anywhere' }}>
              {request.reason || 'No reason provided'}
            </Typography>

            <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1.4, flexWrap: 'wrap', alignItems: 'center' }}>
              {request.requesterPhone && (
                <Button size="small" variant="contained" disableElevation component="a" href={`tel:${request.requesterPhone}`} startIcon={<PhoneCall size={14} />} sx={{ textTransform: 'none', fontWeight: 800 }}>
                  {request.requesterPhone}
                </Button>
              )}
              {request.requesterEmail && (
                <Button size="small" variant="outlined" component="a" href={`mailto:${request.requesterEmail}`} startIcon={<Mail size={14} />} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Email
                </Button>
              )}
              <Button
                size="small"
                disabled={updatingId === request.id}
                onClick={() => void changeStatus(request, pending ? 'CONTACTED' : 'PENDING')}
                startIcon={pending ? <CheckCircle2 size={14} /> : <Undo2 size={14} />}
                sx={{ textTransform: 'none', fontWeight: 700, ml: 'auto' }}
              >
                {pending ? 'Mark contacted' : 'Reopen'}
              </Button>
            </Stack>
          </Paper>
        )
      })}
    </Stack>
  )
}
