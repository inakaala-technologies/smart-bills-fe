import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert, Avatar, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem,
  Paper, Stack, Tab, Tabs, TextField, Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { Download, FileText, Paperclip, RefreshCw, Send, Trash2, UserPlus } from 'lucide-react'
import {
  PAYSLIP_MAX_BYTES,
  addPayslipEmployee,
  downloadPayslip,
  fetchBusinessPayslips,
  fetchPayslipEmployees,
  removePayslipEmployee,
  sendPayslip,
  type Payslip,
  type PayslipEmployee,
} from '../../../services/api/payslipApi'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatSent(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function PayslipsWorkspace({ businessId }: { businessId: number }) {
  const [tab, setTab] = useState<'employees' | 'sent'>('employees')
  const [employees, setEmployees] = useState<PayslipEmployee[]>([])
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [sendTarget, setSendTarget] = useState<PayslipEmployee | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [employeeList, payslipList] = await Promise.all([fetchPayslipEmployees(businessId), fetchBusinessPayslips(businessId)])
      setEmployees(employeeList)
      setPayslips(payslipList)
    } catch {
      setError('Could not load payslips. Make sure the feature is enabled in your business profile.')
    } finally {
      setLoading(false)
    }
  }, [businessId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const handleRemove = async (employee: PayslipEmployee) => {
    if (!window.confirm(`Remove ${employee.name ?? 'this employee'} from payslips?`)) return
    try {
      await removePayslipEmployee(businessId, employee.id)
      setEmployees((current) => current.filter((item) => item.id !== employee.id))
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Could not remove this employee.')
    }
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 850 }}>Payslips</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{employees.length} employees · {payslips.length} sent</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <IconButton aria-label="Refresh" size="small" disabled={loading} onClick={() => void load()}><RefreshCw size={16} /></IconButton>
          <Button size="small" variant="contained" disableElevation startIcon={<UserPlus size={14} />} onClick={() => setAddOpen(true)} sx={{ textTransform: 'none', fontWeight: 800 }}>
            Add employee
          </Button>
        </Stack>
      </Stack>

      <Tabs value={tab} onChange={(_, value: 'employees' | 'sent') => setTab(value)} variant="fullWidth" sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontWeight: 800 } }}>
        <Tab value="employees" label="Employees" />
        <Tab value="sent" label="Sent payslips" />
      </Tabs>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>Loading…</Typography>}

      {!loading && tab === 'employees' && (
        <>
          {employees.length === 0 && !error && (
            <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderRadius: 2.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                Add employees who use the app as customers. Use their registered email, phone or profile ID.
              </Typography>
            </Paper>
          )}
          {employees.map((employee) => (
            <Paper key={employee.id} variant="outlined" sx={{ p: 1.4, borderRadius: 2.5 }}>
              <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                <Avatar sx={(theme) => ({ bgcolor: alpha(theme.palette.primary.main, 0.14), color: 'primary.main', fontWeight: 800 })}>
                  {(employee.name ?? '?').charAt(0).toUpperCase()}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>{employee.name ?? 'Employee'}</Typography>
                  <Typography noWrap sx={{ color: 'text.secondary', fontSize: 11 }}>
                    {[employee.designation, employee.employeeCode, employee.email ?? employee.phone].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" startIcon={<Send size={13} />} onClick={() => setSendTarget(employee)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                  Send
                </Button>
                <IconButton size="small" aria-label={`Remove ${employee.name ?? 'employee'}`} onClick={() => void handleRemove(employee)}>
                  <Trash2 size={16} />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </>
      )}

      {!loading && tab === 'sent' && (
        <>
          {payslips.length === 0 && !error && (
            <Paper variant="outlined" sx={{ p: 2.5, textAlign: 'center', borderRadius: 2.5 }}>
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>No payslips sent yet.</Typography>
            </Paper>
          )}
          {payslips.map((payslip) => (
            <Paper key={payslip.id} variant="outlined" sx={{ p: 1.4, borderRadius: 2.5 }}>
              <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                <FileText size={20} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 800, fontSize: 14 }}>{payslip.employeeName ?? 'Employee'} · {payslip.periodLabel}</Typography>
                  <Typography noWrap sx={{ color: 'text.secondary', fontSize: 11 }}>Sent {formatSent(payslip.createdAt)}</Typography>
                </Box>
                <IconButton size="small" aria-label="Download payslip" onClick={() => void downloadPayslip(payslip).catch((e: Error) => setError(e.message))}>
                  <Download size={16} />
                </IconButton>
              </Stack>
            </Paper>
          ))}
        </>
      )}

      <AddEmployeeDialog
        open={addOpen}
        businessId={businessId}
        onClose={() => setAddOpen(false)}
        onAdded={(employee) => { setEmployees((current) => [employee, ...current]); setAddOpen(false) }}
      />
      <SendPayslipDialog
        employee={sendTarget}
        businessId={businessId}
        onClose={() => setSendTarget(null)}
        onSent={(payslip) => {
          setPayslips((current) => [{ ...payslip, employeeName: sendTarget?.name }, ...current])
          setSendTarget(null)
          setTab('sent')
        }}
      />
    </Stack>
  )
}

function AddEmployeeDialog({ open, businessId, onClose, onAdded }: { open: boolean; businessId: number; onClose: () => void; onAdded: (employee: PayslipEmployee) => void }) {
  const [identifier, setIdentifier] = useState('')
  const [designation, setDesignation] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    setSaving(true)
    setError('')
    try {
      const employee = await addPayslipEmployee(businessId, { identifier, designation, employeeCode })
      setIdentifier(''); setDesignation(''); setEmployeeCode('')
      onAdded(employee)
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Could not add this employee.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 850 }}>Add employee</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <TextField size="small" label="Email, phone or profile ID" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus helperText="The employee must already have an app account." />
          <TextField size="small" label="Designation (optional)" value={designation} onChange={(e) => setDesignation(e.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
          <TextField size="small" label="Employee code (optional)" value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} slotProps={{ htmlInput: { maxLength: 40 } }} />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={saving || !identifier.trim()} onClick={() => void submit()} sx={{ textTransform: 'none', fontWeight: 800 }}>
          {saving ? 'Adding…' : 'Add'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function SendPayslipDialog({ employee, businessId, onClose, onSent }: { employee: PayslipEmployee | null; businessId: number; onClose: () => void; onSent: (payslip: Payslip) => void }) {
  const now = useMemo(() => new Date(), [])
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const pickFile = (selected: File | undefined) => {
    setError('')
    if (!selected) return
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(selected.type)) {
      setError('Only PDF, JPEG or PNG files are allowed.')
      return
    }
    if (selected.size > PAYSLIP_MAX_BYTES) {
      setError('The file must be 5 MB or smaller.')
      return
    }
    setFile(selected)
  }

  const submit = async () => {
    if (!employee || !file) return
    setSending(true)
    setError('')
    try {
      const payslip = await sendPayslip(businessId, employee.id, { month, year, note, file })
      setNote(''); setFile(null)
      onSent(payslip)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the payslip.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={Boolean(employee)} onClose={sending ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 850 }}>Send payslip to {employee?.name ?? 'employee'}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 0.5 }}>
          <Stack direction="row" spacing={1}>
            <TextField select size="small" label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))} sx={{ flex: 1 }}>
              {MONTHS.map((label, index) => <MenuItem key={label} value={index + 1}>{label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ width: 110 }}>
              {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2, now.getFullYear() - 3].map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField size="small" label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 300 } }} />
          <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" hidden onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = '' }} />
          <Button variant="outlined" startIcon={<Paperclip size={15} />} onClick={() => inputRef.current?.click()} sx={{ textTransform: 'none', fontWeight: 700, justifyContent: 'flex-start' }}>
            {file ? file.name : 'Attach payslip (PDF, JPG, PNG · max 5 MB)'}
          </Button>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending} sx={{ textTransform: 'none' }}>Cancel</Button>
        <Button variant="contained" disableElevation disabled={!file} loading={sending} startIcon={<Send size={14} />} onClick={() => void submit()} sx={{ textTransform: 'none', fontWeight: 800 }}>
          Send
        </Button>
      </DialogActions>
    </Dialog>
  )
}
