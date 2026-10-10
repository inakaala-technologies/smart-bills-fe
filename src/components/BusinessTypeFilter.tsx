import { FormControl, InputLabel, ListItemIcon, ListItemText, MenuItem, Select } from '@mui/material'
import { Store } from 'lucide-react'
import { BUSINESS_TYPES } from '../constants/businessTypes'

type BusinessTypeFilterProps = {
  id: string
  value: string
  onChange: (value: string) => void
}

export function BusinessTypeFilter({ id, value, onChange }: BusinessTypeFilterProps) {
  return (
    <FormControl size="small" sx={{ minWidth: 190, maxWidth: '100%' }}>
      <InputLabel id={`${id}-label`}>Business type</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        value={value}
        label="Business type"
        onChange={(event) => onChange(event.target.value)}
        sx={{ backgroundColor: '#fff' }}
      >
        <MenuItem value="ALL">
          <ListItemIcon sx={{ minWidth: 34 }}><Store size={17} /></ListItemIcon>
          <ListItemText primary="All business types" />
        </MenuItem>
        {BUSINESS_TYPES.map(({ value, label, icon: Icon }) => (
          <MenuItem key={value} value={value}>
            <ListItemIcon sx={{ minWidth: 34 }}><Icon size={17} /></ListItemIcon>
            <ListItemText primary={label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}