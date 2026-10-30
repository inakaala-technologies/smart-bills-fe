import { useEffect, useState } from 'react'
import {
    Alert,
    Box,
    Button,
    ButtonBase,
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
    searchCustomers,
    removeFamilyMember,
    type Family,
    type FamilyMember,
    type CustomerSummary,
} from '../../../services/api'
import { getErrorMessage } from '../../../services/api/httpClient'

type FamilyManagementDialogProps = {
    open: boolean
    mode: 'manage' | 'invite'
    onClose: () => void
    currentUserId: number
}

export function FamilyManagementDialog({
    open,
    mode,
    onClose,
    currentUserId,
}: FamilyManagementDialogProps) {
    const [family, setFamily] = useState<Family | null>(null)
    const [invitations, setInvitations] = useState<FamilyMember[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [userResults, setUserResults] = useState<CustomerSummary[]>([])
    const [selectedUser, setSelectedUser] = useState<CustomerSummary | null>(null)
    const [searching, setSearching] = useState(false)
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

    useEffect(() => {
        if (open) return

        setSearchQuery('')
        setUserResults([])
        setSelectedUser(null)
        setSearching(false)
    }, [open])

    useEffect(() => {
        if (!notice && !error) return

        const timeoutId = window.setTimeout(() => {
            setNotice('')
            setError('')
        }, 4000)

        return () => window.clearTimeout(timeoutId)
    }, [notice, error])

    useEffect(() => {
        const query = searchQuery.trim()

        if (query.length < 2) {
            setUserResults([])
            setSearching(false)
            return
        }

        let active = true
        const timeoutId = window.setTimeout(() => {
            setSearching(true)
            void searchCustomers(query)
                .then((results) => {
                    if (active) setUserResults(results)
                })
                .finally(() => {
                    if (active) setSearching(false)
                })
        }, 300)

        return () => {
            active = false
            window.clearTimeout(timeoutId)
        }
    }, [searchQuery])

    const runAction = async (
        action: string,
        operation: () => Promise<unknown>,
        successMessage: string,
        onSuccess?: () => void,
    ) => {
        setBusy(action)
        setError('')
        setNotice('')

        try {
            await operation()
            setNotice(successMessage)
            onSuccess?.()
            setRefreshKey((value) => value + 1)
        } catch (actionError) {
            setError(getErrorMessage(actionError, 'The request could not be completed.'))
        } finally {
            setBusy('')
        }
    }

    const isFamilyHead = family?.createdBy === currentUserId
    const canCreateFamily = !family && invitations.length === 0
    const acceptedMembers = family?.members.filter((member) => member.status === 'ACCEPTED') ?? []
    const pendingMembers = family?.members.filter((member) => member.status === 'PENDING') ?? []
    const selectedContact = selectedUser?.email?.trim() || selectedUser?.phoneNumber?.trim()

    return (
        <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
            <DialogTitle sx={{ fontWeight: 800 }}>
                {mode === 'invite' ? 'Invite a family member' : 'Family'}
            </DialogTitle>
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

                                {acceptedMembers.map((member) => (
                                    <Box
                                        key={member.id}
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(0, 1fr) auto 72px',
                                            gap: 1,
                                            alignItems: 'center',
                                            minHeight: 48,
                                            py: 0.5,
                                            borderBottom: '1px solid',
                                            borderColor: 'divider',
                                        }}
                                    >
                                        <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                                            {member.name ?? `Member #${member.userId}`}
                                        </Typography>

                                        <Chip
                                            size="small"
                                            label={member.userId === family.createdBy ? 'Leader' : 'Member'}
                                            color={member.userId === family.createdBy ? 'primary' : 'default'}
                                        />

                                        {isFamilyHead && member.userId !== family.createdBy ? (
                                            <Button
                                                size="small"
                                                color="error"
                                                disabled={Boolean(busy)}
                                                onClick={() => void runAction(
                                                    `remove-${member.id}`,
                                                    () => removeFamilyMember(member.userId),
                                                    'Family member removed.',
                                                )}
                                                sx={{ minWidth: 72, textTransform: 'none' }}
                                            >
                                                {busy === `remove-${member.id}` ? 'Removing…' : 'Remove'}
                                            </Button>
                                        ) : (
                                            <Box />
                                        )}
                                    </Box>
                                ))}

                                {pendingMembers.length > 0 && (
                                    <Stack spacing={0.8}>
                                        <Typography sx={{ fontWeight: 700 }}>Pending invitations</Typography>
                                        {pendingMembers.map((member) => (
                                            <Box
                                                key={member.id}
                                                sx={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'minmax(0, 1fr) auto 72px',
                                                    gap: 1,
                                                    alignItems: 'center',
                                                    minHeight: 48,
                                                    py: 0.5,
                                                    borderBottom: '1px solid',
                                                    borderColor: 'divider',
                                                }}
                                            >
                                                <Typography sx={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                                                    {member.name ?? `Member #${member.userId}`}
                                                </Typography>

                                                <Chip size="small" label="Pending" color="warning" />

                                                {isFamilyHead && member.userId !== family.createdBy ? (
                                                    <Button
                                                        size="small"
                                                        color="error"
                                                        disabled={Boolean(busy)}
                                                        onClick={() => void runAction(
                                                            `remove-${member.id}`,
                                                            () => removeFamilyMember(member.userId),
                                                            'Family invitation removed.',
                                                        )}
                                                        sx={{ minWidth: 72, textTransform: 'none' }}
                                                    >
                                                        {busy === `remove-${member.id}` ? 'Removing…' : 'Remove'}
                                                    </Button>
                                                ) : (
                                                    <Box />
                                                )}
                                            </Box>
                                        ))}
                                    </Stack>
                                )}

                            </Stack>

                            {isFamilyHead && (
                                <Stack spacing={1}>
                                    <Typography sx={{ fontWeight: 700 }}>Invite a family member</Typography>
                                    <TextField
                                        label="Search by email or phone"
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value)
                                            setSelectedUser(null)
                                            setUserResults([])
                                        }}
                                        disabled={Boolean(busy)}
                                    />

                                    {searching && (
                                        <Typography variant="body2" color="text.secondary">Searching…</Typography>
                                    )}

                                    {selectedUser ? (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                justifyContent: 'space-between',
                                                gap: 1,
                                                border: '1px solid',
                                                borderColor: 'success.light',
                                                borderRadius: 2,
                                                px: 1.3,
                                                py: 1.1,
                                            }}
                                        >
                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="caption" color="success.main" sx={{ fontWeight: 800 }}>
                                                    Selected user
                                                </Typography>
                                                <Typography sx={{ fontWeight: 700 }}>
                                                    {selectedUser.fullName ?? selectedUser.firstName ?? 'Customer'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {[selectedUser.email, selectedUser.phoneNumber].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </Box>

                                            <Button
                                                size="small"
                                                onClick={() => {
                                                    setSelectedUser(null)
                                                    setSearchQuery('')
                                                }}
                                            >
                                                Clear
                                            </Button>
                                        </Box>
                                    ) : (
                                        userResults.map((user) => (
                                            <ButtonBase
                                                key={user.id}
                                                onClick={() => setSelectedUser(user)}
                                                sx={{
                                                    display: 'block',
                                                    width: '100%',
                                                    p: 1,
                                                    textAlign: 'left',
                                                    border: '1px solid',
                                                    borderColor: 'divider',
                                                    borderRadius: 1,
                                                }}
                                            >
                                                <Typography sx={{ fontWeight: 700 }}>
                                                    {user.fullName ?? user.firstName ?? 'Customer'}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {[user.email, user.phoneNumber].filter(Boolean).join(' · ')}
                                                </Typography>
                                            </ButtonBase>
                                        ))
                                    )}

                                    <Button
                                        variant="contained"
                                        disabled={Boolean(busy) || !selectedContact}
                                        onClick={() => {
                                            if (!selectedContact) return
                                            void runAction(
                                                'invite',
                                                () => inviteFamilyMember(selectedContact),
                                                'Invitation sent.',
                                                () => {
                                                    setSearchQuery('')
                                                    setUserResults([])
                                                    setSelectedUser(null)
                                                },
                                            )
                                        }}
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
                                        You have received an invitation from {invitation.name ?? 'a family member'}.
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
                                                () => {
                                                    setSearchQuery('')
                                                    setUserResults([])
                                                    setSelectedUser(null)
                                                }
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