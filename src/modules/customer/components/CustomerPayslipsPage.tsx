import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, IconButton, Paper, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Download, FileText, RefreshCw } from 'lucide-react'
import { downloadPayslip, fetchMyPayslips, type Payslip } from '../../../services/api/payslipApi'

function formatReceived(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CustomerPayslipsPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setPayslips(await fetchMyPayslips())
    } catch {
      setError('Could not load your payslips.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleDownload = async (payslip: Payslip) => {
    setDownloadingId(payslip.id)
    setError('')
    try {
      await downloadPayslip(payslip)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Could not download this payslip.')
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 850 }}>My payslips</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Payslips shared by your employers</Typography>
        </Box>
        <Button size="small" startIcon={<RefreshCw size={14} />} disabled={loading} onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700 }}>
          Refresh
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Loading…</Typography>}
      {!loading && !error && payslips.length === 0 && (
        <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderRadius: 2.5 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>No payslips yet. You will be notified when an employer sends one.</Typography>
        </Paper>
      )}
      {payslips.map((payslip) => (
        <Paper key={payslip.id} variant="outlined" sx={{ p: 1.5, borderRadius: 2.5 }}>
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box sx={(theme) => ({ width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.12) })}>
              <FileText size={20} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>{payslip.periodLabel}</Typography>
              <Typography noWrap sx={{ color: 'text.secondary', fontSize: 12 }}>{payslip.businessName ?? 'Business'} · Received {formatReceived(payslip.createdAt)}</Typography>
              {payslip.note && <Typography sx={{ color: 'text.secondary', fontSize: 12, overflowWrap: 'anywhere' }}>{payslip.note}</Typography>}
            </Box>
            <IconButton aria-label={`Download ${payslip.periodLabel} payslip`} disabled={downloadingId === payslip.id} onClick={() => void handleDownload(payslip)}>
              <Download size={18} />
            </IconButton>
          </Stack>
        </Paper>
      ))}
    </Stack>
  )
}
