import { Box } from '@mui/material'
import { createElement } from 'react'
import { getBusinessTypeIcon } from '../constants/businessTypes'

type BusinessTypeIconProps = {
  businessType?: string
  size?: number
}

export function BusinessTypeIcon({ businessType, size = 17 }: BusinessTypeIconProps) {
  const icon = createElement(getBusinessTypeIcon(businessType), { size, strokeWidth: 2 })

  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        width: 34,
        height: 34,
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 1,
        color: 'primary.main',
        backgroundColor: 'primary.light',
      }}
    >
      {icon}
    </Box>
  )
}