import { alpha } from '@mui/material/styles'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { Box, Card, CardContent, Container, Paper, Stack, Typography } from '@mui/material'
import type { Role } from '../services/auth'

export type RoleMeta = {
  label: string
  description: string
  icon: typeof ShieldCheck
  color: string
}

type RoleSelectorProps = {
  roleConfig: Record<Role, RoleMeta>
  onSelectRole: (role: Role) => void
}

export function RoleSelector({ roleConfig, onSelectRole }: RoleSelectorProps) {
  return (
    <Container maxWidth="sm">
      <Paper elevation={0} sx={(theme) => ({ p: 3, borderRadius: 4, background: alpha(theme.palette.common.white, 0.9), border: `1px solid ${alpha(theme.palette.text.primary, 0.05)}` })}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 1.5 }}>BHive</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.05em' }}>Choose access</Typography>
          </Box>

          <Stack spacing={2}>
            {(Object.keys(roleConfig) as Role[]).map((role) => {
              const meta = roleConfig[role]
              const Icon = meta.icon

              return (
                <Card
                  key={role}
                  variant="outlined"
                  onClick={() => onSelectRole(role)}
                  sx={{
                    cursor: 'pointer',
                    transition: '0.2s ease',
                    borderRadius: 3,
                    '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 },
                  }}
                >
                  <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box sx={(theme) => ({ width: 48, height: 48, borderRadius: 3, bgcolor: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.palette.common.white })}>
                        <Icon size={22} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{meta.label}</Typography>
                        <Typography variant="body2" color="text.secondary">{meta.description}</Typography>
                      </Box>
                    </Box>
                    <ArrowRight size={18} />
                  </CardContent>
                </Card>
              )
            })}
          </Stack>
        </Stack>
      </Paper>
    </Container>
  )
}
