import { useRef, useState } from 'react'
import { Alert, Avatar, Box, Button, ButtonBase, Stack, Typography } from '@mui/material'
import { Camera } from 'lucide-react'
import { uploadCurrentUserProfilePicture, type AuthUser } from '../services/auth'

type ProfilePictureUploadProps = {
  authUser: Pick<AuthUser, 'name' | 'profilePictureUrl'> | null
  onUploaded: (user: AuthUser) => void
  size?: number
  inverted?: boolean
}

export function ProfilePictureUpload({
  authUser,
  onUploaded,
  size = 66,
  inverted = false,
}: ProfilePictureUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const uploadFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setMessage('')
    setError(false)
    const result = await uploadCurrentUserProfilePicture(file)
    if (result.ok && result.user) {
      onUploaded(result.user)
      setMessage('Profile picture updated.')
    } else {
      setError(true)
      setMessage(result.message ?? 'Could not upload your profile picture.')
    }
    setUploading(false)
  }

  const initials = (authUser?.name ?? 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'U'

  return (
    <Stack spacing={0.25} sx={{ alignItems: 'center', flexShrink: 0 }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          void uploadFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <ButtonBase
        type="button"
        aria-label="Upload profile picture"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        sx={{
          position: 'relative',
          borderRadius: '50%',
          '&:focus-visible': { outline: '2px solid', outlineColor: inverted ? '#ffffff' : 'primary.main', outlineOffset: 3 },
        }}
      >
        <Avatar
          src={authUser?.profilePictureUrl || undefined}
          alt={authUser?.name ? `${authUser.name} profile picture` : 'Profile picture'}
          sx={{
            width: size,
            height: size,
            bgcolor: 'rgba(15,3,45,0.5)',
            color: '#ffffff',
            fontSize: Math.round(size * 0.3),
            fontWeight: 800,
            border: inverted ? '2px solid rgba(255,255,255,0.35)' : '2px solid var(--mui-palette-divider)',
          }}
        >
          {initials}
        </Avatar>
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: Math.max(22, size * 0.34),
            height: Math.max(22, size * 0.34),
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            border: '2px solid',
            borderColor: inverted ? '#ffffff' : 'background.paper',
          }}
        >
          <Camera size={Math.max(12, size * 0.19)} />
        </Box>
      </ButtonBase>
      <Button
        size="small"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        sx={{
          minWidth: 0,
          px: 0.5,
          color: inverted ? '#ffffff' : 'primary.main',
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'none',
        }}
      >
        {uploading ? 'Uploading…' : 'Change photo'}
      </Button>
      {message && (
        <Box sx={{ maxWidth: 210 }}>
          {error ? (
            <Alert severity="error" sx={{ py: 0, '& .MuiAlert-message': { fontSize: 10 } }}>{message}</Alert>
          ) : (
            <Typography sx={{ color: inverted ? 'rgba(255,255,255,0.9)' : 'success.main', fontSize: 10 }}>
              {message}
            </Typography>
          )}
        </Box>
      )}
      {!message && (
        <Typography sx={{ color: inverted ? 'rgba(255,255,255,0.72)' : 'text.secondary', fontSize: 9 }}>
          JPEG, PNG, GIF or WebP · Max 2 MB
        </Typography>
      )}
    </Stack>
  )
}
