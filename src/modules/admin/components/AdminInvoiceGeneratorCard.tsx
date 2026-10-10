import { alpha } from '@mui/material/styles'
import { Button, Card, CardContent, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import { ArrowRight } from 'lucide-react'
import { useAppSelector } from '../../../store/hooks'

export type AdminInvoiceForm = { customerId: number | string; productName: string; quantity: string; unitPrice: string; gstRate: string; dueDate: string }

type Props = {
  invoiceForm: AdminInvoiceForm
  invoiceMessage: string
  onInvoiceFieldChange: (field: keyof AdminInvoiceForm, value: string) => void
  onCreateInvoice: () => void
}

export function AdminInvoiceGeneratorCard({ invoiceForm, invoiceMessage, onInvoiceFieldChange, onCreateInvoice }: Props) {
  const customers = useAppSelector((state) => state.adminDashboard.data.customers)

  return (
    <Card variant="outlined" sx={(theme) => ({ borderRadius: 3.2, border: `1px solid ${alpha(theme.palette.text.primary, 0.06)}`, background: `linear-gradient(180deg, ${alpha(theme.palette.primary.main, 0.03)} 0%, ${theme.palette.common.white} 100%)`, boxShadow: `0 12px 22px ${alpha(theme.palette.common.black, 0.03)}` })}>
      <CardContent sx={{ p: 1.7 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 900, mb: 1.5 }}>Generate invoice</Typography>
        <Stack spacing={1.2}>
          <FormControl fullWidth size="small">
            <InputLabel id="invoice-customer-select-label">Customer</InputLabel>
            <Select labelId="invoice-customer-select-label" value={invoiceForm.customerId} label="Customer" onChange={(event) => onInvoiceFieldChange('customerId', String(event.target.value))} sx={{ borderRadius: 2.4, backgroundColor: 'background.paper' }}>
              {customers.map((customer) => <MenuItem key={customer.id} value={customer.id}>{customer.fullName ?? 'Customer'}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField size="small" label="Product name" value={invoiceForm.productName} onChange={(event) => onInvoiceFieldChange('productName', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField size="small" label="Quantity" type="number" value={invoiceForm.quantity} onChange={(event) => onInvoiceFieldChange('quantity', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField size="small" label="Unit price" type="number" value={invoiceForm.unitPrice} onChange={(event) => onInvoiceFieldChange('unitPrice', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField size="small" label="GST %" type="number" value={invoiceForm.gstRate} onChange={(event) => onInvoiceFieldChange('gstRate', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <TextField size="small" label="Due date" type="date" value={invoiceForm.dueDate} onChange={(event) => onInvoiceFieldChange('dueDate', event.target.value)} sx={{ '& .MuiInputBase-root': { borderRadius: 2.4, backgroundColor: 'background.paper' } }} />
          <Button variant="contained" onClick={onCreateInvoice} endIcon={<ArrowRight size={15} />} sx={(theme) => ({ borderRadius: 2.8, background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.success.main} 100%)`, textTransform: 'none', fontWeight: 800, boxShadow: `0 12px 22px ${alpha(theme.palette.primary.main, 0.18)}` })}>Generate &amp; send</Button>
          {invoiceMessage ? <Typography variant="caption" color={invoiceMessage.includes('failed') || invoiceMessage.includes('Select') ? 'error.main' : 'success.main'}>{invoiceMessage}</Typography> : null}
        </Stack>
      </CardContent>
    </Card>
  )
}
