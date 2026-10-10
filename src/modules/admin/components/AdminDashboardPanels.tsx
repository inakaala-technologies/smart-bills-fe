import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { alpha } from '@mui/material/styles'
import { DashboardListRow } from '../../../components/DashboardListRow'
import { EmptyState } from '../../../components/EmptyState'
import type { getCurrentUser } from '../../../services/auth'

export type AdminListItem = {
  id: number
  title: string
  subtitle?: string
  status?: string
  action?: { label: string; onClick: () => void }
}

export function AdminListCard({ title, items, emptyTitle, emptyDescription }: { title: string; items: AdminListItem[]; emptyTitle: string; emptyDescription: string }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3, borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>{title}</Typography>
        {items.length > 0 ? (
          <Stack spacing={1.2}>
            {items.map((item) => (
              <DashboardListRow key={item.id} title={item.title} subtitle={item.subtitle} trailing={item.status ? (
                <Chip label={item.status} size="small" sx={(theme) => ({ bgcolor: alpha(theme.palette.warning.main, 0.14), color: theme.palette.warning.dark, fontWeight: 700 })} />
              ) : item.action ? <Button size="small" variant="text" onClick={item.action.onClick}>View</Button> : null} />
            ))}
          </Stack>
        ) : <EmptyState title={emptyTitle} description={emptyDescription} />}
      </CardContent>
    </Card>
  )
}

export function AdminProfileCard({ authUser }: { authUser: NonNullable<ReturnType<typeof getCurrentUser>> | null }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: '24px', borderColor: 'divider', p: 1 }}>
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mb: 1.5 }}>Profile</Typography>
        <Stack spacing={1.2}>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.6, borderRadius: '16px' }}><Typography variant="caption" color="text.secondary">Full name</Typography><Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{authUser?.name ?? 'Admin'}</Typography></Box>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.6, borderRadius: '16px' }}><Typography variant="caption" color="text.secondary">Email</Typography><Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{authUser?.email ?? 'No email'}</Typography></Box>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.6, borderRadius: '16px' }}><Typography variant="caption" color="text.secondary">Mobile number</Typography><Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{authUser?.phone ?? 'Not provided'}</Typography></Box>
          <Box sx={{ backgroundColor: 'action.hover', p: 1.6, borderRadius: '16px' }}><Typography variant="caption" color="text.secondary">Role</Typography><Typography sx={{ fontWeight: 700, color: 'text.primary' }}>Admin</Typography></Box>
        </Stack>
      </CardContent>
    </Card>
  )
}
