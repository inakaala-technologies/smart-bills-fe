import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { FileText, ImagePlus, Megaphone, Trash2, X } from 'lucide-react'
import {
  createBusinessOffer,
  deactivateBusinessOffer,
  fetchBusinessOffers,
  type BusinessOffer,
  type CustomerSegment,
} from '../../../services/api'
import { isPdfOffer, resolveAssetUrl } from '../../../utils/offerAsset'

type BusinessOffersWorkspaceProps = {
  businessId: number
  businessName: string
  businessLocation: string
  hasMappedLocation: boolean
}

type OfferForm = {
  title: string
  discountLabel: string
  description: string
  startsOn: string
  endsOn: string
  targetSegment: CustomerSegment
}

const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const MAX_FILE_SIZE = 5 * 1024 * 1024

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function createInitialForm(): OfferForm {
  const today = new Date()
  const defaultEnd = new Date(today)

  defaultEnd.setDate(today.getDate() + 7)

  return {
    title: '',
    discountLabel: '',
    description: '',
    startsOn: toDateInputValue(today),
    endsOn: toDateInputValue(defaultEnd),
    targetSegment: 'ALL',
  }
}

export function BusinessOffersWorkspace({
  businessId,
  businessName,
  businessLocation,
  hasMappedLocation,
}: BusinessOffersWorkspaceProps) {
  const [offers, setOffers] = useState<BusinessOffer[]>([])
  const [form, setForm] = useState<OfferForm>(createInitialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  // Hidden file input opened by the "Upload image" button.
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Release the temporary preview URL when it changes or on unmount.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  // Load offers for the selected business.
  useEffect(() => {
    let isCurrent = true

    const loadOffers = async () => {
      setLoading(true)

      try {
        const loadedOffers = await fetchBusinessOffers(businessId)

        if (isCurrent) {
          setOffers(loadedOffers)
        }
      } catch {
        if (isCurrent) {
          setMessage('Offers could not be loaded. Please try again.')
          setError(true)
        }
      } finally {
        if (isCurrent) {
          setLoading(false)
        }
      }
    }

    void loadOffers()

    return () => {
      isCurrent = false
    }
  }, [businessId])

  // Update the offer form.
  const updateForm = (field: keyof OfferForm, value: string) => {
    setForm((current) =>
      field === 'targetSegment'
        ? { ...current, targetSegment: value as CustomerSegment }
        : { ...current, [field]: value },
    )
  }

  // Open the device file picker.
  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  // Select an offer image/PDF and create a local preview.
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    // Allow picking the same file again later.
    event.target.value = ''

    if (!file) return

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setMessage('Please select a JPG, PNG, WEBP, or PDF file.')
      setError(true)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setMessage('The file size must be 5 MB or less.')
      setError(true)
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
    setMessage('')
    setError(false)
  }

  // Remove the selected image (the effect above revokes the URL).
  const removeSelectedImage = () => {
    setSelectedImage(null)
    setImagePreview('')
  }

  // Publish a new offer.
  const publishOffer = async () => {
    if (
      !form.title.trim() ||
      !form.discountLabel.trim() ||
      !form.startsOn ||
      !form.endsOn
    ) {
      return
    }

    if (form.endsOn < form.startsOn) {
      setMessage('The end date must be on or after the start date.')
      setError(true)
      return
    }

    setSaving(true)
    setMessage('')

    try {
      const offer = await createBusinessOffer(
        businessId,
        {
          title: form.title.trim(),
          discountLabel: form.discountLabel.trim(),
          description: form.description.trim(),
          startsAt: `${form.startsOn}T00:00:00`,
          endsAt: `${form.endsOn}T23:59:59`,
          targetSegment: form.targetSegment,
        },
        selectedImage,
      )

      setOffers((current) => [offer, ...current])
      setForm(createInitialForm())
      removeSelectedImage()
      setMessage('Offer published.')
      setError(false)
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'Could not publish this offer.',
      )
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  // Deactivate an offer.
  const removeOffer = async (offerId: number) => {
    setRemovingId(offerId)
    setMessage('')

    try {
      await deactivateBusinessOffer(businessId, offerId)

      setOffers((current) =>
        current.map((offer) =>
          offer.id === offerId ? { ...offer, active: false } : offer,
        ),
      )

      setMessage('Offer removed from customer discovery.')
      setError(false)
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : 'Could not remove this offer.',
      )
      setError(true)
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Stack spacing={1.6}>
      {/* Offers heading */}
      <Box>
        <Typography
          variant="h6"
          sx={{ color: 'text.primary', fontWeight: 900 }}
        >
          Offers
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Share current deals with customers near {businessName}.
        </Typography>
      </Box>

      {/* Location warning */}
      {!hasMappedLocation && (
        <Alert severity="warning">
          Add a map location to this business profile before publishing
          offers for nearby customers.
        </Alert>
      )}

      {/* Success and error messages */}
      {message && (
        <Alert
          severity={error ? 'error' : 'success'}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      {/* Create offer form */}
      <Card
        variant="outlined"
        sx={{ borderRadius: 1.5, borderColor: 'divider' }}
      >
        <CardContent>
          <Stack spacing={1.3}>
            <Box>
              <Typography sx={{ fontWeight: 800 }}>
                Create an offer
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Choose who sees it and how long it runs.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, minmax(0, 1fr))',
                },
                gap: 1.2,
              }}
            >
              <TextField
                label="Offer title"
                value={form.title}
                onChange={(event) =>
                  updateForm('title', event.target.value)
                }
                required
                slotProps={{ htmlInput: { maxLength: 120 } }}
              />

              <TextField
                label="Discount or offer"
                value={form.discountLabel}
                onChange={(event) =>
                  updateForm('discountLabel', event.target.value)
                }
                required
                placeholder="20% off, Buy 1 Get 1"
                slotProps={{ htmlInput: { maxLength: 80 } }}
              />

              <TextField
                label="Details"
                value={form.description}
                onChange={(event) =>
                  updateForm('description', event.target.value)
                }
                multiline
                minRows={2}
                slotProps={{ htmlInput: { maxLength: 1000 } }}
                sx={{ gridColumn: { sm: '1 / -1' } }}
              />

              <TextField
                select
                label="Customer segment"
                value={form.targetSegment}
                onChange={(event) =>
                  updateForm('targetSegment', event.target.value)
                }
                sx={{ gridColumn: { sm: '1 / -1' } }}
              >
                <MenuItem value="ALL">All customers</MenuItem>
                <MenuItem value="NEW">New customers</MenuItem>
                <MenuItem value="LOYAL">
                  Loyal customers · ₹10,000+ verified spend
                </MenuItem>
                <MenuItem value="AT_RISK">
                  At-risk · no activity in 90 days
                </MenuItem>
                <MenuItem value="MEMBERS">Active members</MenuItem>
              </TextField>

              <TextField
                label="Starts"
                type="date"
                value={form.startsOn}
                onChange={(event) =>
                  updateForm('startsOn', event.target.value)
                }
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <TextField
                label="Ends"
                type="date"
                value={form.endsOn}
                onChange={(event) =>
                  updateForm('endsOn', event.target.value)
                }
                required
                fullWidth
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Box>

            {/* Offer banner image */}
            <Box>
              <Typography sx={{ mb: 0.4, fontWeight: 700, fontSize: 14 }}>
                Offer image or PDF
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mb: 1 }}
              >
                Landscape banner (16:9) or a PDF flyer shown to customers.
                JPG, PNG, WEBP, or PDF · Max 5 MB
              </Typography>

              {/* Hidden file input opened by the Upload button */}
              <input
                ref={fileInputRef}
                hidden
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleImageChange}
              />

              {imagePreview ? (
                <>
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
                      maxWidth: 560,
                      aspectRatio: '16 / 9',
                      overflow: 'hidden',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      bgcolor: 'action.hover',
                    }}
                  >
                    {selectedImage?.type === 'application/pdf' ? (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1,
                          width: '100%',
                          height: '100%',
                          p: 2,
                          textAlign: 'center',
                        }}
                      >
                        <FileText size={36} />
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
                        >
                          {selectedImage.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          PDF attached
                        </Typography>
                      </Box>
                    ) : (
                      <Box
                        component="img"
                        src={imagePreview}
                        alt="Offer banner preview"
                        sx={{
                          display: 'block',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    )}

                    <IconButton
                      aria-label="Remove offer image"
                      title="Remove image"
                      onClick={removeSelectedImage}
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        '&:hover': { bgcolor: 'background.paper' },
                      }}
                    >
                      <X size={18} />
                    </IconButton>
                  </Box>

                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button
                      type="button"
                      variant="text"
                      color="error"
                      size="small"
                      onClick={removeSelectedImage}
                      sx={{ textTransform: 'none' }}
                    >
                      Remove
                    </Button>
                  </Stack>
                </>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    width: '100%',
                    maxWidth: 560,
                    aspectRatio: '16 / 9',
                    border: '1.5px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    p: 2,
                    textAlign: 'center',
                  }}
                >
                  <ImagePlus size={32} />

                  <Typography variant="body2" color="text.secondary">
                    No offer image selected
                  </Typography>

                  <Button
                    type="button"
                    variant="outlined"
                    startIcon={<ImagePlus size={17} />}
                    onClick={openFilePicker}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                  >
                    Upload image
                  </Button>
                </Box>
              )}
            </Box>

            <Button
              type="button"
              variant="contained"
              startIcon={<Megaphone size={16} />}
              onClick={() => void publishOffer()}
              disabled={
                saving ||
                !hasMappedLocation ||
                !form.title.trim() ||
                !form.discountLabel.trim()
              }
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              {saving ? 'Publishing…' : 'Publish offer'}
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* Existing offers */}
      <Stack spacing={1}>
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>
            Your offers
          </Typography>

          <Chip
            size="small"
            label={`${offers.filter((offer) => offer.active).length} active`}
            variant="outlined"
            sx={{ fontWeight: 700 }}
          />
        </Stack>

        {loading && <LinearProgress />}

        {!loading && offers.length === 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            No offers posted yet.
          </Typography>
        )}

        {offers.map((offer) => (
          <Card
            key={offer.id}
            variant="outlined"
            sx={{ borderRadius: 1.5, borderColor: 'divider' }}
          >
            <CardContent
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 1.2,
                p: 1.4,
                '&:last-child': { pb: 1.4 },
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                {/* Offer title and status */}
                <Stack
                  direction="row"
                  spacing={0.7}
                  sx={{
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    rowGap: 0.5,
                  }}
                >
                  <Typography
                    sx={{ color: 'text.primary', fontWeight: 800 }}
                  >
                    {offer.title}
                  </Typography>

                  <Chip
                    size="small"
                    variant="outlined"
                    color={offer.active ? 'success' : 'default'}
                    label={offer.active ? 'Active' : 'Inactive'}
                  />

                  <Chip
                    size="small"
                    variant="outlined"
                    label={
                      offer.targetSegment?.replace('_', ' ') ??
                      'All customers'
                    }
                  />
                </Stack>

                {/* Offer image or PDF flyer uploaded by the business */}
                {offer.imageUrl &&
                  (isPdfOffer(offer) ? (
                    <Button
                      href={resolveAssetUrl(offer.imageUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<FileText size={16} />}
                      size="small"
                      variant="outlined"
                      sx={{ mt: 0.8, textTransform: 'none' }}
                    >
                      View flyer (PDF)
                    </Button>
                  ) : (
                    <Box
                      component="img"
                      src={resolveAssetUrl(offer.imageUrl)}
                      alt={offer.title}
                      loading="lazy"
                      sx={{
                        display: 'block',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        objectFit: 'cover',
                        borderRadius: 2,
                        mt: 0.8,
                        bgcolor: 'action.hover',
                      }}
                    />
                  ))}

                {/* Offer discount */}
                <Typography
                  sx={{
                    mt: 0.8,
                    color: 'primary.main',
                    fontWeight: 800,
                  }}
                >
                  {offer.discountLabel}
                </Typography>

                {/* Associated business name and location */}
                <Stack
                  spacing={0.25}
                  sx={{
                    mt: 1,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: 'text.primary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    Business: {businessName}
                  </Typography>

                  <Typography
                    variant="body2"
                    sx={{
                      color: 'text.secondary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    Location: {businessLocation}
                  </Typography>
                </Stack>

                {/* Offer description */}
                {offer.description && (
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 0.8,
                      color: 'text.secondary',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {offer.description}
                  </Typography>
                )}

                {/* Offer validity */}
                <Typography
                  variant="caption"
                  sx={{
                    display: 'block',
                    mt: 0.6,
                    color: 'text.secondary',
                  }}
                >
                  Valid{' '}
                  {new Date(offer.startsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                  })}{' '}
                  –{' '}
                  {new Date(offer.endsAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Typography>
              </Box>

              {/* Remove offer */}
              {offer.active && (
                <IconButton
                  aria-label={`Remove ${offer.title}`}
                  title="Remove offer"
                  onClick={() => void removeOffer(offer.id)}
                  disabled={removingId === offer.id}
                  size="small"
                  sx={{ color: 'error.main' }}
                >
                  <Trash2 size={17} />
                </IconButton>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}