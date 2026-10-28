import { useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
} from '@mui/material'
import {
    acceptFamilyInvitation,
    createFamily,
    fetchFamilyInvitations,
    fetchMyFamily,
    inviteFamilyMember,
    rejectFamilyInvitation,
    type Family,
    type FamilyMember,
} from '../../../services/api'
import { getErrorMessage } from '../../../services/api/httpClient'

type FamilyManagementDialogProps = {
    open: boolean
    onClose: () => void
    currentUserId: number
}

export function FamilyManagementDialog({
    open,
    onClose,
    currentUserId,
}: FamilyManagementDialogProps) {
    const [family, setFamily] = useState<Family | null>(null)
    const [invitations, setInvitations] = useState<FamilyMember[]>([])
    const [contact, setContact] = useState('')
    const [loading, setLoading] = useState(false)
    const [busy, setBusy] = useState('')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [refreshKey, setRefreshKey] = useState(0)

    useEffect(() => {
        if (!open) return

        let active = true
        setLoading(true)
        setError('')

        Promise.all([fetchMyFamily(), fetchFamilyInvitations()])
            .then(([familyResult, invitationResults]) => {
                if (!active) return
                setFamily(familyResult)
                setInvitations(invitationResults)
            })
            .catch((requestError: unknown) => {
                if (active) setError(getErrorMessage(requestError, 'Could not load family details.'))
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [open, refreshKey])

    const runAction = async (
        action: string,
        operation: () => Promise<unknown>,
        successMessage: string,
    ) => {
        setBusy(action)
        setError('')
        setNotice('')

        try {
            await operation()
            setNotice(successMessage)
            setRefreshKey((value) => value + 1)
        } catch (actionError) {
            setError(getErrorMessage(actionError, 'The request could not be completed.'))
        } finally {
            setBusy('')
        }
    }

    const isFamilyHead = family?.createdBy === currentUserId
    const canCreateFamily = !family && invitations.length === 0

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>Family</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {error && <Alert severity="error">{error}</Alert>}
                    {notice && <Alert severity="success">{notice}</Alert>}
                    {loading && <Typography color="text.secondary">Loading family details…</Typography>}

                    {!loading && canCreateFamily && (
                        <Box>
                            <Typography sx={{ mb: 1, fontWeight: 700 }}>
                                You are not in a family yet.
                            </Typography>
                            <Button
                                variant="contained"
                                disabled={Boolean(busy)}
                                onClick={() => void runAction('create', createFamily, 'Family created.')}
                            >
                                {busy === 'create' ? 'Creating…' : 'Create family'}
                            </Button>
                        </Box>
                    )}

                    {!loading && !family && invitations.length > 0 && (
                        <Typography color="text.secondary">
                            Accept or reject your pending invitation before creating a family.
                        </Typography>
                    )}

                    {!loading && family && (
                        <>
                            <Box>
                                <Typography sx={{ fontWeight: 800 }}>Family #{family.familyId}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {isFamilyHead
                                        ? 'You are the family head and can invite members.'
                                        : 'Only the family head can invite members.'}
                                </Typography>
                            </Box>

                            <Stack spacing={0.8}>
                                <Typography sx={{ fontWeight: 700 }}>Accepted members</Typography>
                                {family.members.map((member) => (
                                    <Box
                                        key={member.id}
                                        sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, alignItems: 'center' }}
                                    >
                                        <Typography>Member #{member.userId}</Typography>
                                        <Chip size="small" label={member.status} color="success" />
                                    </Box>
                                ))}
                            </Stack>

                            {isFamilyHead && (
                                <Stack spacing={1}>
                                    <Typography sx={{ fontWeight: 700 }}>Invite a family member</Typography>
                                    <TextField
                                        label="Email or phone number"
                                        value={contact}
                                        onChange={(event) => setContact(event.target.value)}
                                        slotProps={{ htmlInput: { maxLength: 254 } }}
                                        disabled={Boolean(busy)}
                                    />
                                    <Button
                                        variant="contained"
                                        disabled={Boolean(busy) || !contact.trim()}
                                        onClick={() => void runAction(
                                            'invite',
                                            () => inviteFamilyMember(contact.trim()),
                                            'Invitation sent.',
                                        )}
                                    >
                                        {busy === 'invite' ? 'Sending…' : 'Send invitation'}
                                    </Button>
                                </Stack>
                            )}
                        </>
                    )}

                    {!loading && invitations.length > 0 && (
                        <Stack spacing={1}>
                            <Typography sx={{ fontWeight: 700 }}>Invitations</Typography>
                            {invitations.map((invitation) => (
                                <Box
                                    key={invitation.id}
                                    sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1.2 }}
                                >
                                    <Typography sx={{ mb: 1 }}>
                                        Invitation to family #{invitation.familyId}
                                    </Typography>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={Boolean(busy)}
                                            onClick={() => void runAction(
                                                `accept-${invitation.id}`,
                                                () => acceptFamilyInvitation(invitation.id),
                                                'Invitation accepted.',
                                            )}
                                        >
                                            {busy === `accept-${invitation.id}` ? 'Accepting…' : 'Accept'}
                                        </Button>
                                        <Button
                                            size="small"
                                            color="inherit"
                                            disabled={Boolean(busy)}
                                            onClick={() => void runAction(
                                                `reject-${invitation.id}`,
                                                () => rejectFamilyInvitation(invitation.id),
                                                'Invitation rejected.',
                                            )}
                                        >
                                            {busy === `reject-${invitation.id}` ? 'Rejecting…' : 'Reject'}
                                        </Button>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={Boolean(busy)}>Close</Button>
            </DialogActions>
        </Dialog>
    )
}