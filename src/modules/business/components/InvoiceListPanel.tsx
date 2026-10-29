import { useState } from 'react'
import { Alert, Avatar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, Stack, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material'
import { ArrowLeft, Check, MoreHorizontal, Plus, Search, Send, X } from 'lucide-react'

export type InvoiceListRow = {
  id: number
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  invoiceNumber: string
  status: string
  issueDate?: string
  dueDate?: string
  subtotal?: number
  gstAmount?: number
  totalAmount?: number
  invoiceDiscountAmount?: number
  invoiceDiscountType?: 'PERCENTAGE' | 'AMOUNT'
  invoiceDiscountValue?: number
  amount: string
  loyaltyDetails?: string
  date: string
  badge: string
}

export type InvoiceListPanelProps = {
  invoiceRows: InvoiceListRow[]
  onBack: () => void
  onCreateInvoice: () => void
  onUpdateStatus: (invoiceId: number, status: 'SENT' | 'PAID') => Promise<{ ok: boolean; message?: string }>
  businessDetails?: { name: string; address?: string; email?: string; phone?: string; gstin?: string }
  previewInvoiceId?: number | null
  onPreviewClosed?: () => void
}

const invoiceFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending', value: 'SENT' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
] as const

const invoiceColumns = 'minmax(0, 1.5fr) minmax(52px, 0.7fr) auto minmax(32px, 0.45fr) 24px'

const invoiceStatusStyles: Record<string, { label: string; color: string; background: string }> = {
  DRAFT: { label: 'Draft', color: 'var(--mui-palette-text-secondary)', background: 'var(--mui-palette-action-hover)' },
  SENT: { label: 'Pending', color: 'var(--mui-palette-info-main)', background: 'color-mix(in srgb, var(--mui-palette-info-main) 18%, var(--mui-palette-background-paper))' },
  PARTIAL: { label: 'Partially paid', color: 'var(--mui-palette-warning-main)', background: 'color-mix(in srgb, var(--mui-palette-warning-main) 18%, var(--mui-palette-background-paper))' },
  PAID: { label: 'Paid', color: 'var(--mui-palette-success-main)', background: 'color-mix(in srgb, var(--mui-palette-success-main) 18%, var(--mui-palette-background-paper))' },
  OVERDUE: { label: 'Overdue', color: 'var(--mui-palette-error-main)', background: 'color-mix(in srgb, var(--mui-palette-error-main) 18%, var(--mui-palette-background-paper))' },
}

function getDisplayStatus(row: InvoiceListRow) {
  const status = row.status.trim().replace(/\s+/g, '_').toUpperCase()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isUnpaid = status === 'SENT' || status === 'PARTIAL' || status === 'OVERDUE' || status === 'PAST_DUE'
  return status === 'PAST_DUE' || (isUnpaid && Boolean(row.dueDate) && row.dueDate! < today) ? 'OVERDUE' : status
}

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatMoney(value?: number) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function InvoiceListPanel({ invoiceRows, onBack, onCreateInvoice, onUpdateStatus, businessDetails, previewInvoiceId, onPreviewClosed }: InvoiceListPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [savingInvoiceId, setSavingInvoiceId] = useState<number | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceListRow | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const displayedPreview = previewInvoice ?? invoiceRows.find((row) => row.id === previewInvoiceId) ?? null

  const closePreview = () => {
    setPreviewInvoice(null)
    onPreviewClosed?.()
  }

  const filteredRows = invoiceRows.filter((row) => {
    const displayStatus = getDisplayStatus(row)
    const matchesStatus = statusFilter === 'ALL'
      || (statusFilter === 'SENT'
        ? displayStatus === 'SENT' || displayStatus === 'PARTIAL'
        : displayStatus === statusFilter)
    const normalizedQuery = query.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || `${row.customerName} ${row.invoiceNumber}`.toLowerCase().includes(normalizedQuery)
    return matchesStatus && matchesQuery
  })

  const handleUpdateStatus = async (row: InvoiceListRow, status: 'SENT' | 'PAID') => {
    setSavingInvoiceId(row.id)
    setActionMessage('')
    try {
      const result = await onUpdateStatus(row.id, status)
      setActionError(!result.ok)
      setActionMessage(result.message ?? (status === 'PAID' ? 'Invoice marked as paid.' : 'Draft sent to customer.'))
    } catch (error) {
      setActionError(true)
      setActionMessage(error instanceof Error ? error.message : 'Could not update invoice status.')
    } finally {
      setSavingInvoiceId(null)
    }
  }

  const handleShareInvoice = async (row: InvoiceListRow) => {
    const text = `Invoice ${row.invoiceNumber} for ${row.customerName}: ${row.amount}`
    if (navigator.share) {
      await navigator.share({ title: row.invoiceNumber, text }).catch(() => undefined)
      return
    }

    if (row.customerEmail) {
      window.location.href = `mailto:${row.customerEmail}?subject=${encodeURIComponent(`Invoice ${row.invoiceNumber}`)}&body=${encodeURIComponent(text)}`
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconButton aria-label="Back to dashboard" onClick={onBack} sx={{ width: 32, height: 36, ml: -0.5, color: 'text.primary' }}>
          <ArrowLeft size={21} />
        </IconButton>
        <Typography sx={{ color: 'text.primary', fontWeight: 800, fontSize: 17 }}>Invoices &amp; Receipts</Typography>
      </Box>

      <TextField
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search customer, invoice number..."
        size="small"
        fullWidth
        slotProps={{
          htmlInput: { 'aria-label': 'Search customer or invoice number' },
          input: { startAdornment: <InputAdornment position="start"><Search size={17} color="var(--mui-palette-text-secondary)" /></InputAdornment> },
        }}
        sx={{ '& .MuiOutlinedInput-root': { minHeight: 40, borderRadius: 2.5, backgroundColor: 'background.paper', fontSize: 12, '& fieldset': { borderColor: 'var(--mui-palette-divider)' } } }}
      />

      <ToggleButtonGroup
        exclusive
        value={statusFilter}
        onChange={(_, value: string | null) => value && setStatusFilter(value)}
        aria-label="Filter invoices by status"
        sx={{ width: '100%', gap: 0.8, '& .MuiToggleButtonGroup-grouped': { flex: 1, minWidth: 0, px: 0.5, py: 0.65, border: '1px solid var(--mui-palette-divider) !important', borderRadius: '999px !important', color: 'text.secondary', backgroundColor: 'background.paper', fontSize: 11, fontWeight: 700, lineHeight: 1.2, textTransform: 'none', '&.Mui-selected': { color: 'primary.contrastText', backgroundColor: 'primary.main', '&:hover': { backgroundColor: 'primary.dark' } } } }}
      >
        {invoiceFilters.map((filter) => (
          <ToggleButton key={filter.value} value={filter.value} aria-label={filter.label}>{filter.label}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      <Button
        variant="contained"
        startIcon={<Plus size={17} />}
        onClick={onCreateInvoice}
        sx={{ minHeight: 43, borderRadius: 2, fontWeight: 800, fontSize: 13, textTransform: 'none', boxShadow: 'none' }}
      >
        Create Invoice
      </Button>

      {actionMessage && <Alert severity={actionError ? 'error' : 'success'} onClose={() => setActionMessage('')}>{actionMessage}</Alert>}

      <Box sx={{ display: 'grid', gridTemplateColumns: invoiceColumns, alignItems: 'center', gap: 0.7, px: 0.3, pt: 0.35, pb: 0.1, borderBottom: '1px solid var(--mui-palette-divider)' }}>
        {['Customer', 'Amount', 'Status', 'Date', ''].map((label, index) => (
          <Typography key={`${label}-${index}`} noWrap sx={{ color: 'text.secondary', fontSize: 9.5, fontWeight: 700 }}>{label}</Typography>
        ))}
      </Box>

      {filteredRows.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85 }}>
          {filteredRows.map((row) => {
            const status = getDisplayStatus(row)
            const statusStyle = invoiceStatusStyles[status] ?? { label: row.status, color: 'var(--mui-palette-text-secondary)', background: 'var(--mui-palette-action-hover)' }
            const isDraft = status === 'DRAFT'
            const canMarkPaid = status === 'SENT' || status === 'PARTIAL' || status === 'OVERDUE'
            const isSaving = savingInvoiceId === row.id

            return (
              <Box
                key={row.id}
                role="button"
                tabIndex={0}
                aria-label={`Preview invoice ${row.invoiceNumber}`}
                onClick={() => setPreviewInvoice(row)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault()
                    setPreviewInvoice(row)
                  }
                }}
                sx={{
                  p: 1,
                  border: '1px solid var(--mui-palette-divider)',
                  borderRadius: 1.7,
                  backgroundColor: 'background.paper',
                  boxShadow: '0 3px 10px rgba(0,0,0,0.14)',
                  cursor: 'pointer',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  '&:hover': { borderColor: 'primary.main', boxShadow: '0 5px 14px rgba(0,0,0,0.17)' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: invoiceColumns, alignItems: 'center', gap: 0.7 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.7, minWidth: 0 }}>
                    <Avatar sx={{ width: 27, height: 27, flexShrink: 0, bgcolor: 'success.light', color: 'success.dark', fontSize: 9, fontWeight: 800 }}>{row.badge}</Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography noWrap sx={{ color: 'text.primary', fontSize: 10, fontWeight: 800, lineHeight: 1.25 }}>{row.customerName}</Typography>
                      <Typography noWrap sx={{ color: 'text.secondary', fontSize: 8.5, lineHeight: 1.2 }}>#{row.invoiceNumber}</Typography>
                    </Box>
                  </Box>
                  <Typography noWrap sx={{ color: 'text.primary', fontSize: 9.5, fontWeight: 800 }}>{row.amount}</Typography>
                  <Box sx={{ justifySelf: 'start', px: 0.8, py: 0.4, borderRadius: '999px', color: statusStyle.color, background: statusStyle.background, fontSize: 8.5, fontWeight: 800, lineHeight: 1 }}>
                    {statusStyle.label}
                  </Box>
                  <Typography noWrap sx={{ color: 'text.secondary', fontSize: 8.5, textAlign: 'right' }}>{row.date}</Typography>
                  <Tooltip title="Copy invoice number">
                    <IconButton aria-label={`Copy invoice number ${row.invoiceNumber}`} size="small" onClick={(event) => { event.stopPropagation(); void navigator.clipboard?.writeText(row.invoiceNumber) }} sx={{ width: 22, height: 22, color: 'primary.main' }}>
                      <MoreHorizontal size={15} />
                    </IconButton>
                  </Tooltip>
                </Box>
                {(row.invoiceDiscountAmount ?? 0) > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'success.main', fontWeight: 700 }}>
                    Invoice discount{row.invoiceDiscountType === 'PERCENTAGE' ? ` (${row.invoiceDiscountValue}%)` : ''}: −{formatMoney(row.invoiceDiscountAmount)}
                  </Typography>
                )}
                {row.loyaltyDetails && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'success.main', fontWeight: 700 }}>
                    {row.loyaltyDetails}
                  </Typography>
                )}
                <Stack direction="row" spacing={0.7} onClick={(event) => event.stopPropagation()} sx={{ mt: 0.6, flexWrap: 'wrap' }}>
                  {isDraft ? (
                    <Button size="small" startIcon={<Send size={12} />} onClick={() => void handleUpdateStatus(row, 'SENT')} disabled={isSaving} sx={{ minHeight: 26, px: 0.8, py: 0.2, border: '1px solid var(--mui-palette-divider)', borderRadius: '999px', color: 'primary.main', fontSize: 9, fontWeight: 700, lineHeight: 1, textTransform: 'none' }}>
                      Send draft
                    </Button>
                  ) : (
                    <Button size="small" startIcon={<Send size={11} />} onClick={() => void handleShareInvoice(row)} disabled={!navigator.share && !row.customerEmail} sx={{ minHeight: 26, px: 0.8, py: 0.2, border: '1px solid var(--mui-palette-divider)', borderRadius: '999px', color: 'primary.main', fontSize: 9, fontWeight: 700, lineHeight: 1, textTransform: 'none', '&.Mui-disabled': { color: 'text.disabled', borderColor: 'divider' } }}>
                      Send to customer app
                    </Button>
                  )}
                  {canMarkPaid && <Button size="small" startIcon={<Check size={12} />} onClick={() => void handleUpdateStatus(row, 'PAID')} disabled={isSaving} sx={{ minHeight: 26, px: 0.8, py: 0.2, border: '1px solid var(--mui-palette-divider)', borderRadius: '999px', color: 'success.main', fontSize: 9, fontWeight: 700, lineHeight: 1, textTransform: 'none' }}>{isSaving ? 'Saving…' : 'Mark paid'}</Button>}
                </Stack>
              </Box>
            )
          })}
        </Box>
      ) : (
        <Box sx={{ px: 0.5, py: 2.5, textAlign: 'center' }}>
          <Typography sx={{ color: 'text.primary', fontSize: 13, fontWeight: 700 }}>{invoiceRows.length ? 'No matching invoices' : 'No invoices yet'}</Typography>
          <Typography sx={{ mt: 0.4, color: 'text.secondary', fontSize: 11 }}>{invoiceRows.length ? 'Try another search or status.' : 'Create an invoice to see it here.'}</Typography>
        </Box>
      )}

      <Dialog
        open={displayedPreview != null}
        onClose={closePreview}
        fullWidth
        maxWidth="sm"
        sx={{ '& .MuiDialog-paper': { borderRadius: 2.5, overflow: 'hidden' } }}
      >
        {displayedPreview && (
          <>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 2, py: 1.2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>Invoice preview</Typography>
              <IconButton aria-label="Close invoice preview" onClick={closePreview} size="small"><X size={18} /></IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ p: { xs: 1, sm: 2.5 }, bgcolor: '#f1f5f4' }}>
              <Box sx={{ maxWidth: 680, mx: 'auto', p: { xs: 1.5, sm: 3 }, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', borderRadius: 1.5, boxShadow: '0 5px 20px rgba(24, 51, 47, 0.08)' }}>
                <Stack spacing={2.5}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ justifyContent: 'space-between', gap: 2, pb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6" color="primary.main" sx={{ fontWeight: 900, letterSpacing: '0.02em' }}>{businessDetails?.name || 'Business'}</Typography>
                      {businessDetails?.address && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, whiteSpace: 'pre-line' }}>{businessDetails.address}</Typography>}
                      {businessDetails?.phone && <Typography variant="body2" color="text.secondary">{businessDetails.phone}</Typography>}
                      {businessDetails?.email && <Typography variant="body2" color="text.secondary">{businessDetails.email}</Typography>}
                      {businessDetails?.gstin && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}><strong>GSTIN:</strong> {businessDetails.gstin}</Typography>}
                    </Box>
                    <Box sx={{ textAlign: { xs: 'left', sm: 'right' }, flexShrink: 0 }}>
                      <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: '0.08em' }}>{businessDetails?.gstin ? 'TAX INVOICE' : 'INVOICE'}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4 }}>#{displayedPreview.invoiceNumber}</Typography>
                      <Chip
                        size="small"
                        label={invoiceStatusStyles[getDisplayStatus(displayedPreview)]?.label ?? getDisplayStatus(displayedPreview).replaceAll('_', ' ')}
                        sx={{ mt: 0.8, fontWeight: 750 }}
                      />
                    </Box>
                  </Stack>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>Bill to</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 800 }}>{displayedPreview.customerName}</Typography>
                      {displayedPreview.customerAddress && <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>{displayedPreview.customerAddress}</Typography>}
                      {displayedPreview.customerEmail && <Typography variant="body2" color="text.secondary">{displayedPreview.customerEmail}</Typography>}
                      {displayedPreview.customerPhone && <Typography variant="body2" color="text.secondary">{displayedPreview.customerPhone}</Typography>}
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(100px, 1fr))', gap: 1.5, alignContent: 'start' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Invoice number</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750, overflowWrap: 'anywhere' }}>{displayedPreview.invoiceNumber}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">Invoice date</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750 }}>{formatDate(displayedPreview.issueDate)}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">{displayedPreview.status.toUpperCase() === 'PAID' ? 'Payment status' : 'Due date'}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 750 }}>
                          {displayedPreview.status.toUpperCase() === 'PAID' ? 'Paid in full' : formatDate(displayedPreview.dueDate)}
                        </Typography>
                      </Box>
                    </Box>
                  </Stack>

                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    <Stack direction="row" sx={{ px: 1.5, py: 1, bgcolor: 'action.hover', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Amount</Typography>
                    </Stack>
                    <Stack direction="row" sx={{ px: 1.5, py: 1.5, justifyContent: 'space-between', gap: 1 }}>
                      <Typography variant="body2">Invoice charges</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(displayedPreview.subtotal ?? (displayedPreview.totalAmount != null ? displayedPreview.totalAmount - (displayedPreview.gstAmount ?? 0) : undefined))}</Typography>
                    </Stack>
                  </Box>

                  <Box sx={{ ml: { sm: 'auto' }, width: { xs: '100%', sm: 'min(100%, 300px)' } }}>
                    <Stack spacing={0.8}>
                      <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary">Subtotal</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(displayedPreview.subtotal ?? (displayedPreview.totalAmount != null ? displayedPreview.totalAmount - (displayedPreview.gstAmount ?? 0) : undefined))}</Typography>
                      </Stack>
                      {displayedPreview.gstAmount != null && (
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">GST</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatMoney(displayedPreview.gstAmount)}</Typography>
                        </Stack>
                      )}
                      {(displayedPreview.invoiceDiscountAmount ?? 0) > 0 && (
                        <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="body2" color="success.main">
                            Discount{displayedPreview.invoiceDiscountType === 'PERCENTAGE' ? ` (${displayedPreview.invoiceDiscountValue}%)` : ''}
                          </Typography>
                          <Typography variant="body2" color="success.main" sx={{ fontWeight: 700 }}>−{formatMoney(displayedPreview.invoiceDiscountAmount)}</Typography>
                        </Stack>
                      )}
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline', gap: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 850 }}>Total</Typography>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 900 }}>{formatMoney(displayedPreview.totalAmount)}</Typography>
                      </Stack>
                    </Stack>
                  </Box>

                  {displayedPreview.loyaltyDetails && (
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 700 }}>{displayedPreview.loyaltyDetails}</Typography>
                  )}
                  <Typography variant="caption" color="text.secondary" sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
                    Thank you for your business.
                  </Typography>
                </Stack>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 2, py: 1.3 }}>
              <Button onClick={() => setPreviewInvoice(null)} sx={{ textTransform: 'none', fontWeight: 750 }}>Close preview</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}
