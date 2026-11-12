import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  approvePartnerApplication,
  fetchAdminPartnerApplications,
  rejectPartnerApplication,
  type AdminPartnerApplication,
} from '../../../services/api/posPartnerApi'
import { getErrorMessage } from '../../../services/api/httpClient'

function formatSubmittedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

export function AdminPosPartnerApplications() {
  const [applications, setApplications] = useState<AdminPartnerApplication[]>([])
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [workingApplicationId, setWorkingApplicationId] = useState<string | null>(null)

  const loadApplications = useCallback(async () => {
    setErrorMessage('')
    try {
      setApplications(await fetchAdminPartnerApplications())
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not load partner applications.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchAdminPartnerApplications()
      .then((items) => {
        if (active) setApplications(items)
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(getErrorMessage(error, 'Could not load partner applications.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const approve = async (applicationId: string) => {
    setWorkingApplicationId(applicationId)
    setErrorMessage('')
    try {
      const updated = await approvePartnerApplication(applicationId)
      setApplications((current) => current.map((item) => item.applicationId === applicationId ? updated : item))
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not approve this application.'))
    } finally {
      setWorkingApplicationId(null)
    }
  }

  const reject = async (applicationId: string) => {
    const reason = rejectionReasons[applicationId]?.trim()
    if (!reason) {
      setErrorMessage('Add a reason before rejecting an application.')
      return
    }
    setWorkingApplicationId(applicationId)
    setErrorMessage('')
    try {
      const updated = await rejectPartnerApplication(applicationId, reason)
      setApplications((current) => current.map((item) => item.applicationId === applicationId ? updated : item))
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not reject this application.'))
    } finally {
      setWorkingApplicationId(null)
    }
  }

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>POS partner applications</Typography>
          <Typography variant="body2" color="text.secondary">Review submissions before activating partner signing keys.</Typography>
        </Box>
        <Button onClick={() => void loadApplications()} disabled={loading}>Refresh</Button>
      </Box>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      {loading && <Typography color="text.secondary">Loading applications…</Typography>}
      {!loading && applications.length === 0 && (
        <Alert severity="info">No partner applications have been submitted.</Alert>
      )}
      {applications.map((application) => (
        <Card key={application.applicationId} variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{application.partnerName}</Typography>
                <Chip size="small" label={application.status} color={application.status === 'APPROVED' ? 'success' : application.status === 'REJECTED' ? 'error' : 'warning'} />
              </Box>
              <Typography variant="body2">Submitted {formatSubmittedAt(application.submittedAt)} · Application {application.applicationId}</Typography>
              <Typography variant="body2"><strong>Contact:</strong> {application.contactName} · {application.contactEmail} · {application.contactPhone}</Typography>
              <Typography variant="body2"><strong>Retailer:</strong> {application.retailerName} ({application.retailerReference})</Typography>
              <Typography variant="body2"><strong>Outlet:</strong> {application.outletName} ({application.outletReference})</Typography>
              {application.partnerId && <Alert severity="success">Active partner ID: {application.partnerId}</Alert>}
              {application.decisionReason && <Typography variant="body2"><strong>Decision note:</strong> {application.decisionReason}</Typography>}
              {application.status === 'PENDING' && (
                <>
                  <TextField
                    label="Rejection reason (required to reject)"
                    size="small"
                    multiline
                    minRows={2}
                    value={rejectionReasons[application.applicationId] ?? ''}
                    onChange={(event) => setRejectionReasons((current) => ({
                      ...current,
                      [application.applicationId]: event.target.value,
                    }))}
                    slotProps={{ htmlInput: { maxLength: 1000 } }}
                  />
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => void approve(application.applicationId)}
                      disabled={workingApplicationId !== null}
                    >
                      {workingApplicationId === application.applicationId ? 'Saving…' : 'Approve and activate key'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => void reject(application.applicationId)}
                      disabled={workingApplicationId !== null}
                    >
                      Reject
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  )
}
