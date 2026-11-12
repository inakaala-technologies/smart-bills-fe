import { useCallback, useState } from 'react'
import { Alert, Avatar, Box, Button, Dialog, IconButton, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material'
import { ArrowLeft, Check, Download, FileText, Mail, MoreHorizontal, Mic, Plus, Search, Send, Share2 } from 'lucide-react'

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

/* Figma tokens */
const PURPLE = '#4E2BCC'
const LIME = '#CDF27E'
const PURPLE_DARK = '#331A88'
const HEADER_GRADIENT = 'linear-gradient(180deg, #F1EBFC 0%, #CDBAF1 14%, #AE89F2 30%, #8C59F2 46%, #5B34D4 66%, #331A88 84%, #0F032D 100%)'
const PAGE_BG = 'var(--mui-palette-background-default)'
const LINE = 'var(--mui-palette-divider)'
const INK = 'var(--mui-palette-text-primary)'
const MUTED = 'var(--mui-palette-text-secondary)'
const CARD_BG = 'var(--mui-palette-background-paper)'
const SOFT_BG = 'var(--mui-palette-action-hover)'

/* Pill colours on the Invoice Detail screen */
const pillOf = (token: string) => ({
  color: `var(--mui-palette-${token}-main)`,
  bg: `color-mix(in srgb, var(--mui-palette-${token}-main) 16%, var(--mui-palette-background-paper))`,
  border: `color-mix(in srgb, var(--mui-palette-${token}-main) 38%, var(--mui-palette-background-paper))`,
})
const detailPill: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PAID: { label: 'Paid', ...pillOf('success') },
  SENT: { label: 'Pending', ...pillOf('info') },
  PARTIAL: { label: 'Partial', ...pillOf('warning') },
  OVERDUE: { label: 'Overdue', ...pillOf('error') },
  DRAFT: { label: 'Draft', color: MUTED, bg: SOFT_BG, border: LINE },
}

const invoiceFilters = [
  { label: 'All', value: 'ALL' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Pending', value: 'SENT' },
  { label: 'Partial', value: 'PARTIAL' },
  { label: 'Paid', value: 'PAID' },
  { label: 'Overdue', value: 'OVERDUE' },
] as const

const invoiceStatusStyles: Record<string, { label: string; color: string; background: string }> = {
  DRAFT: { label: 'Draft', color: 'var(--mui-palette-text-secondary)', background: 'var(--mui-palette-action-hover)' },
  SENT: { label: 'Pending', color: 'var(--mui-palette-info-main)', background: 'color-mix(in srgb, var(--mui-palette-info-main) 18%, var(--mui-palette-background-paper))' },
  PARTIAL: { label: 'Partial', color: 'var(--mui-palette-warning-main)', background: 'color-mix(in srgb, var(--mui-palette-warning-main) 18%, var(--mui-palette-background-paper))' },
  PAID: { label: 'Paid', color: 'var(--mui-palette-success-main)', background: 'color-mix(in srgb, var(--mui-palette-success-main) 18%, var(--mui-palette-background-paper))' },
  OVERDUE: { label: 'Overdue', color: 'var(--mui-palette-error-main)', background: 'color-mix(in srgb, var(--mui-palette-error-main) 18%, var(--mui-palette-background-paper))' },
}

const pillButtonSx = {
  minHeight: 26,
  px: 1.1,
  py: 0.2,
  borderRadius: '999px',
  fontSize: 11,
  fontWeight: 600,
  lineHeight: 1,
  textTransform: 'none',
} as const

function getDisplayStatus(row: InvoiceListRow) {
  const status = row.status.trim().replace(/\s+/g, '_').toUpperCase()
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const isUnpaid = status === 'SENT' || status === 'PARTIAL' || status === 'OVERDUE' || status === 'PAST_DUE'
  return status === 'PAST_DUE' || (isUnpaid && Boolean(row.dueDate) && row.dueDate! < today) ? 'OVERDUE' : status
}

function formatDetailDate(value?: string) {
  if (!value) return '—'
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value)
  if (Number.isNaN(date.getTime())) return value
  const day = String(date.getDate()).padStart(2, '0')
  const month = date.toLocaleDateString('en-IN', { month: 'short' })
  return `${day} ${month}, ${date.getFullYear()}`
}

function formatMoney(value?: number) {
  return `₹${Number(value ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function InvoiceListPanel({ invoiceRows, onBack, onCreateInvoice, onUpdateStatus, previewInvoiceId, onPreviewClosed }: InvoiceListPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [savingInvoiceId, setSavingInvoiceId] = useState<number | null>(null)
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceListRow | null>(null)
  const [actionMessage, setActionMessage] = useState('')
  const [actionError, setActionError] = useState(false)
  const displayedPreview = previewInvoice ?? invoiceRows.find((row) => row.id === previewInvoiceId) ?? null
  /* Always open the detail screen scrolled to the top so "Billed to" is visible */
  const detailScrollRef = useCallback((element: HTMLDivElement | null) => { if (element) element.scrollTop = 0 }, [])
  const detailStatus = displayedPreview ? getDisplayStatus(displayedPreview) : ''
  const detailPillStyle = detailPill[detailStatus] ?? { label: displayedPreview?.status ?? '', color: MUTED, bg: SOFT_BG, border: LINE }
  const detailSubtotal = displayedPreview
    ? displayedPreview.subtotal ?? (displayedPreview.totalAmount != null ? displayedPreview.totalAmount - (displayedPreview.gstAmount ?? 0) : undefined)
    : undefined

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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <IconButton aria-label="Back to dashboard" onClick={onBack} sx={{ width: 32, height: 32, ml: -0.75, mt: -0.2, color: 'text.primary' }}>
          <ArrowLeft size={20} />
        </IconButton>
        <Box>
          <Typography component="h2" sx={{ color: 'text.primary', fontWeight: 500, fontSize: 22, lineHeight: 1.2 }}>Invoices</Typography>
          <Typography sx={{ mt: 0.4, color: 'text.secondary', fontSize: 12.5, lineHeight: 1.35 }}>
            Create, track and manage your invoices with ease
          </Typography>
        </Box>
      </Box>

      {/* Search + lime action button */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
        <TextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          size="small"
          fullWidth
          slotProps={{
            htmlInput: { 'aria-label': 'Search customer or invoice number' },
            input: {
              startAdornment: <InputAdornment position="start"><Search size={18} color="var(--mui-palette-text-secondary)" /></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Mic size={18} color="var(--mui-palette-text-secondary)" /></InputAdornment>,
            },
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              height: 48,
              borderRadius: '999px',
              backgroundColor: 'action.hover',
              fontSize: 14,
              '& fieldset': { border: 'none' },
            },
          }}
        />
        <IconButton
          aria-label="Create invoice"
          onClick={onCreateInvoice}
          sx={{ width: 48, height: 48, flexShrink: 0, bgcolor: LIME, color: PURPLE_DARK, '&:hover': { bgcolor: '#BFE667' } }}
        >
          <Plus size={22} strokeWidth={2.4} />
        </IconButton>
      </Box>

      {/* Filter chips */}
      <Box
        role="group"
        aria-label="Filter invoices by status"
        sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 0.25, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}
      >
        {invoiceFilters.map((filter) => {
          const active = statusFilter === filter.value
          return (
            <Box
              key={filter.value}
              component="button"
              type="button"
              aria-pressed={active}
              aria-label={filter.label}
              onClick={() => setStatusFilter(filter.value)}
              sx={{
                flexShrink: 0,
                minWidth: 50,
                height: 44,
                px: 2,
                borderRadius: '48px',
                border: `1px solid ${active ? PURPLE : 'var(--mui-palette-divider)'}`,
                bgcolor: active ? PURPLE : 'background.paper',
                color: active ? '#FFFFFF' : 'text.secondary',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </Box>
          )
        })}
      </Box>

      {actionMessage && <Alert severity={actionError ? 'error' : 'success'} onClose={() => setActionMessage('')}>{actionMessage}</Alert>}

      {filteredRows.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
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
                  py: 1.75,
                  px: 0.5,
                  borderBottom: '1px solid var(--mui-palette-divider)',
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' },
                  '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: -2 },
                }}
              >
                {/* Row 1: avatar + name/number, amount */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 44, height: 44, flexShrink: 0, bgcolor: 'action.hover', color: 'text.secondary', fontSize: 15, fontWeight: 600 }}>{row.badge}</Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ color: 'text.primary', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{row.customerName}</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'text.secondary' }}>
                      <FileText size={12} />
                      <Typography noWrap sx={{ color: 'text.secondary', fontSize: 12, lineHeight: 1.35 }}>{row.invoiceNumber}</Typography>
                    </Box>
                  </Box>
                  <Typography noWrap sx={{ color: 'text.primary', fontSize: 15, fontWeight: 700 }}>{row.amount}</Typography>
                  <Tooltip title="Copy invoice number">
                    <IconButton
                      aria-label={`Copy invoice number ${row.invoiceNumber}`}
                      size="small"
                      onClick={(event) => { event.stopPropagation(); void navigator.clipboard?.writeText(row.invoiceNumber) }}
                      sx={{ width: 24, height: 24, mr: -0.5, color: 'text.secondary' }}
                    >
                      <MoreHorizontal size={16} />
                    </IconButton>
                  </Tooltip>
                </Box>

                {(row.invoiceDiscountAmount ?? 0) > 0 && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.6, ml: 7.25, color: 'success.main', fontWeight: 700 }}>
                    Invoice discount{row.invoiceDiscountType === 'PERCENTAGE' ? ` (${row.invoiceDiscountValue}%)` : ''}: −{formatMoney(row.invoiceDiscountAmount)}
                  </Typography>
                )}
                {row.loyaltyDetails && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.4, ml: 7.25, color: 'success.main', fontWeight: 700 }}>
                    {row.loyaltyDetails}
                  </Typography>
                )}

                {/* Row 2: date left, actions + status right */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: 1.25, flexWrap: 'wrap' }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>{row.date}</Typography>
                  <Stack direction="row" spacing={0.8} onClick={(event) => event.stopPropagation()} sx={{ alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', rowGap: 0.6 }}>
                    {isDraft ? (
                      <Button size="small" startIcon={<Send size={12} />} onClick={() => void handleUpdateStatus(row, 'SENT')} disabled={isSaving} sx={{ ...pillButtonSx, border: '1px solid var(--mui-palette-divider)', color: 'primary.main' }}>
                        Send draft
                      </Button>
                    ) : (
                      <Button size="small" startIcon={<Send size={12} />} onClick={() => void handleShareInvoice(row)} disabled={!navigator.share && !row.customerEmail} sx={{ ...pillButtonSx, border: '1px solid var(--mui-palette-divider)', color: 'primary.main', '&.Mui-disabled': { color: 'text.disabled', borderColor: 'divider' } }}>
                        Send to customer app
                      </Button>
                    )}
                    {canMarkPaid && (
                      <Button size="small" startIcon={<Check size={12} />} onClick={() => void handleUpdateStatus(row, 'PAID')} disabled={isSaving} sx={{ ...pillButtonSx, bgcolor: invoiceStatusStyles.PAID.background, color: 'success.main' }}>
                        {isSaving ? 'Saving…' : 'Mark as paid'}
                      </Button>
                    )}
                    <Box sx={{ px: 1.1, py: 0.6, borderRadius: '999px', color: statusStyle.color, background: statusStyle.background, fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
                      {statusStyle.label}
                    </Box>
                  </Stack>
                </Box>
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
        fullScreen
        container={() => document.querySelector<HTMLElement>('[data-app-frame]') ?? document.body}
        sx={{ position: 'absolute', '& .MuiBackdrop-root': { position: 'absolute' } }}
        slotProps={{ paper: { sx: { bgcolor: PAGE_BG, backgroundImage: 'none', borderRadius: 0, display: 'flex', flexDirection: 'column' } } }}
      >
        {displayedPreview && (
          <>
            {/* Header */}
            <Box sx={{ flexShrink: 0, background: HEADER_GRADIENT, borderRadius: '0 0 35px 35px', pt: 'calc(env(safe-area-inset-top, 0px) + 44px)', pb: '24px', px: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <IconButton aria-label="Back to invoices" onClick={closePreview} sx={{ width: 44, height: 44, bgcolor: '#FFFFFF', color: '#1B1535', '&:hover': { bgcolor: '#F1EBFC' } }}>
                <ArrowLeft size={22} strokeWidth={2.2} />
              </IconButton>
              <Typography component="h2" sx={{ flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 20, fontWeight: 500, lineHeight: 1.2 }}>Invoice Detail</Typography>
<Box aria-hidden="true" sx={{ width: 44, height: 44, flexShrink: 0 }} />
            </Box>

            {/* Content */}
            <Box ref={detailScrollRef} sx={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', p: '16px', display: 'flex', flexDirection: 'column', gap: '12px', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
              {/* Billed to card */}
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${LINE}`, borderRadius: '12px', p: '16px' }}>
                <Typography sx={{ color: INK, fontSize: 15, fontWeight: 600, mb: '12px', lineHeight: 1.3 }}>Billed to</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '12px', pb: '14px', borderBottom: `1px solid ${LINE}` }}>
                  <Avatar sx={{ width: 36, height: 36, flexShrink: 0, bgcolor: SOFT_BG, color: MUTED, fontSize: 13, fontWeight: 600 }}>{displayedPreview.badge}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ color: INK, fontSize: 13, fontWeight: 700, lineHeight: 1.35 }}>{displayedPreview.customerName}</Typography>
                    {(displayedPreview.customerEmail || displayedPreview.customerPhone) && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', color: MUTED }}>
                        <Mail size={12} />
                        <Typography noWrap sx={{ color: MUTED, fontSize: 11, lineHeight: 1.35 }}>{displayedPreview.customerEmail ?? displayedPreview.customerPhone}</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: '6px', color: MUTED, mt: '14px' }}>
                  <FileText size={14} />
                  <Typography sx={{ color: MUTED, fontSize: 12.5 }}>{displayedPreview.invoiceNumber}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: '10px', mt: '4px', flexWrap: 'wrap' }}>
                  <Typography sx={{ color: INK, fontSize: 28, fontWeight: 500, lineHeight: 1.25 }}>{formatMoney(displayedPreview.totalAmount)}</Typography>
                  <Box sx={{ px: '10px', py: '3px', borderRadius: '999px', border: `1px solid ${detailPillStyle.border}`, bgcolor: detailPillStyle.bg, color: detailPillStyle.color, fontSize: 11, fontWeight: 600, lineHeight: 1.4 }}>
                    {detailPillStyle.label}
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '12px', mt: '20px', alignItems: 'start' }}>
                  <Box>
                    <Typography sx={{ color: MUTED, fontSize: 11 }}>Issued Date</Typography>
                    <Typography sx={{ color: INK, fontSize: 12.5, fontWeight: 700 }}>{formatDetailDate(displayedPreview.issueDate)}</Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ color: MUTED, fontSize: 11 }}>Due Date</Typography>
                    <Typography sx={{ color: INK, fontSize: 12.5, fontWeight: 700 }}>{displayedPreview.dueDate ? formatDetailDate(displayedPreview.dueDate) : detailStatus === 'PAID' ? 'Paid in full' : 'Not set'}</Typography>
                  </Box>
                </Box>
              </Box>

              {/* Item details card */}
              <Box sx={{ bgcolor: CARD_BG, border: `1px solid ${LINE}`, borderRadius: '12px', p: '16px' }}>
                <Typography sx={{ color: INK, fontSize: 15, fontWeight: 600, mb: '12px' }}>Item Details</Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 40px 90px', gap: '8px', pb: '10px', borderBottom: `1px solid ${LINE}` }}>
                  <Typography sx={{ color: MUTED, fontSize: 11.5 }}>Description</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 11.5, textAlign: 'center' }}>QTY</Typography>
                  <Typography sx={{ color: MUTED, fontSize: 11.5, textAlign: 'right' }}>Price</Typography>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 40px 90px', gap: '8px', py: '12px', borderBottom: `1px solid ${LINE}` }}>
                  <Typography sx={{ color: INK, fontSize: 12.5 }}>Invoice charges</Typography>
                  <Typography sx={{ color: INK, fontSize: 12.5, textAlign: 'center' }}>1</Typography>
                  <Typography sx={{ color: INK, fontSize: 12.5, textAlign: 'right' }}>{formatMoney(detailSubtotal)}</Typography>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: '10px', columnGap: '8px', pt: '12px' }}>
                  <Typography sx={{ color: INK, fontSize: 12.5 }}>Subtotal</Typography>
                  <Typography sx={{ color: INK, fontSize: 12.5, textAlign: 'right' }}>{formatMoney(detailSubtotal)}</Typography>
                  {displayedPreview.gstAmount != null && (
                    <>
                      <Typography sx={{ color: INK, fontSize: 12.5 }}>Tax</Typography>
                      <Typography sx={{ color: INK, fontSize: 12.5, textAlign: 'right' }}>{formatMoney(displayedPreview.gstAmount)}</Typography>
                    </>
                  )}
                  {(displayedPreview.invoiceDiscountAmount ?? 0) > 0 && (
                    <>
                      <Typography sx={{ color: 'var(--mui-palette-success-main)', fontSize: 12.5 }}>
                        Discount{displayedPreview.invoiceDiscountType === 'PERCENTAGE' ? ` (${displayedPreview.invoiceDiscountValue}%)` : ''}
                      </Typography>
                      <Typography sx={{ color: 'var(--mui-palette-success-main)', fontSize: 12.5, textAlign: 'right' }}>−{formatMoney(displayedPreview.invoiceDiscountAmount)}</Typography>
                    </>
                  )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: '12px', pt: '12px', borderTop: `1px solid ${LINE}` }}>
                  <Typography sx={{ color: INK, fontSize: 14, fontWeight: 700 }}>Total</Typography>
                  <Typography sx={{ color: INK, fontSize: 14, fontWeight: 700 }}>{formatMoney(displayedPreview.totalAmount)}</Typography>
                </Box>
                {displayedPreview.loyaltyDetails && (
                  <Typography sx={{ mt: '10px', color: 'var(--mui-palette-success-main)', fontSize: 11.5, fontWeight: 600 }}>{displayedPreview.loyaltyDetails}</Typography>
                )}
              </Box>
            </Box>

            {/* Actions */}
            <Box sx={{ flexShrink: 0, display: 'flex', gap: '12px', px: '16px', pt: '8px', pb: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
              <Button
                onClick={() => window.print()}
                startIcon={<Download size={16} />}
                sx={{ flex: 1, height: 48, borderRadius: '999px', bgcolor: SOFT_BG, color: INK, fontSize: 13, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: 'var(--mui-palette-action-selected)' } }}
              >
                Download PDF
              </Button>
              <Button
                onClick={() => void handleShareInvoice(displayedPreview)}
                disabled={!navigator.share && !displayedPreview.customerEmail}
                startIcon={<Share2 size={16} />}
                sx={{ flex: 1, height: 48, borderRadius: '999px', bgcolor: PURPLE, color: '#FFFFFF', fontSize: 13, fontWeight: 500, textTransform: 'none', '&:hover': { bgcolor: PURPLE_DARK }, '&.Mui-disabled': { bgcolor: '#C9C2E6', color: '#FFFFFF' } }}
              >
                Share
              </Button>
            </Box>

          </>
        )}
      </Dialog>
    </Box>
  )
}