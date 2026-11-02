import { useRef, useState } from 'react'
import { Alert, Box, Button, Stack, Typography } from '@mui/material'
import { ImagePlus } from 'lucide-react'
import { uploadBusinessBanner } from '../services/api/businessApi'
import type { BusinessSummary } from '../services/api/types'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

type BusinessBannerUploadProps = {
  businessId: number
  bannerImageUrl?: string
  onUploaded: (business: BusinessSummary) => void
}

export function BusinessBannerUpload({ businessId, bannerImageUrl, onUploaded }: BusinessBannerUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const uploadFile = async (file?: File) => {
    if (!file) return
    setMessage('')
    setError(false)
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(true)
      setMessage('Only JPEG, PNG, GIF, and WebP images are allowed.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError(true)
      setMessage('Banner images must be 2 MB or smaller.')
      return
    }
    setUploading(true)
    try {
      onUploaded(await uploadBusinessBanner(businessId, file))
      setMessage('Banner image updated.')
    } catch (uploadError) {
      setError(true)
      setMessage(uploadError instanceof Error ? uploadError.message : 'Could not upload the banner image.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Box component="section">
      <Typography sx={{ mb: 0.7, ml: 0.6, color: 'text.secondary', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Business banner
      </Typography>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        hidden
        onChange={(event) => {
          void uploadFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <Box
        role="img"
        aria-label={bannerImageUrl ? 'Current business banner' : 'No business banner uploaded'}
        sx={{
          height: 110,
          borderRadius: 2.2,
          overflow: 'hidden',
          display: 'grid',
          placeItems: 'center',
          color: 'primary.contrastText',
          background: bannerImageUrl
            ? `center / cover no-repeat url("${bannerImageUrl}")`
            : 'linear-gradient(135deg, var(--mui-palette-primary-main), var(--mui-palette-secondary-main))',
        }}
      >
        {!bannerImageUrl && <ImagePlus size={28} />}
      </Box>
      <Stack spacing={0.6} sx={{ mt: 0.8, alignItems: 'flex-start' }}>
        <Button
          size="small"
          variant="outlined"
          disabled={uploading}
          startIcon={<ImagePlus size={15} />}
          onClick={() => inputRef.current?.click()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {uploading ? 'Uploading…' : bannerImageUrl ? 'Change banner' : 'Upload banner'}
        </Button>
        {message && (error ? (
          <Alert severity="error" sx={{ py: 0, width: '100%' }}>{message}</Alert>
        ) : (
          <Typography sx={{ color: 'success.main', fontSize: 11 }}>{message}</Typography>
        ))}
        {!message && (
          <Typography sx={{ color: 'text.secondary', fontSize: 10 }}>
            JPEG, PNG, GIF or WebP · Max 2 MB · Shown on your customer-facing business page
          </Typography>
        )}
      </Stack>
    </Box>
  )
}
