import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import { FileText, Home, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  LocationPicker,
  type LocationValue,
} from '../../../components/LocationPicker'
import { BusinessTypeFilter } from '../../../components/BusinessTypeFilter'
import { BusinessTypeIcon } from '../../../components/BusinessTypeIcon'
import {
  getBusinessTypeLabel,
  normalizeBusinessType,
} from '../../../constants/businessTypes'
import {
  fetchNearbyBusinesses,
  fetchNearbyOffers,
  updateMyLocation,
  type NearbyBusinessSummary,
  type NearbyOfferSummary,
} from '../../../services/api'

type CustomerLocationCardProps = {
  locationAddress?: string
  latitude?: number
  longitude?: number
  view?: 'businesses' | 'offers'
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} m`
  }

  return `${distanceKm.toFixed(2)} km`
}

function formatBusinessLocation(address?: string) {
  if (!address?.trim()) {
    return ''
  }

  return address.trim()
}
function isPdfAttachment(offer: NearbyOfferSummary) {
  if (offer.attachmentType) return offer.attachmentType === 'PDF'

  // Fallback: check the file extension, ignoring any query string.
  return /\.pdf$/i.test((offer.imageUrl ?? '').split('?')[0])
}

export function CustomerLocationCard({
  locationAddress,
  latitude,
  longitude,
  view = 'businesses',
}: CustomerLocationCardProps) {
  const initialLocation: LocationValue = {
    locationAddress: locationAddress ?? '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }

  const [location, setLocation] =
    useState<LocationValue>(initialLocation)

  const [savedLocation, setSavedLocation] =
    useState<LocationValue>(initialLocation)

  const [nearbyBusinesses, setNearbyBusinesses] =
    useState<NearbyBusinessSummary[]>([])

  const [nearbyOffers, setNearbyOffers] =
    useState<NearbyOfferSummary[]>([])

  const [radiusKm, setRadiusKm] = useState(25)

  const [saving, setSaving] = useState(false)

  const [businessesLoading, setBusinessesLoading] =
    useState(false)

  const [offersLoading, setOffersLoading] =
    useState(false)

  const [businessesError, setBusinessesError] =
    useState(false)

  const [offersError, setOffersError] =
    useState(false)

  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState(false)
  const [homeServicesOnly, setHomeServicesOnly] = useState(false)
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL')
  const filteredBusinesses = nearbyBusinesses.filter((business) =>
    (businessTypeFilter === 'ALL' ||
      normalizeBusinessType(business.businessType) === businessTypeFilter) &&
      (!homeServicesOnly || business.homeServicesEnabled === true),
  )

  /*
   * Keep the location picker synchronized when the
   * customer's saved location changes in the parent.
   */
  useEffect(() => {
    const nextLocation: LocationValue = {
      locationAddress: locationAddress ?? '',
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    }

    setLocation(nextLocation)
    setSavedLocation(nextLocation)
  }, [locationAddress, latitude, longitude])

  /*
   * Fetch nearby businesses.
   */
  useEffect(() => {
    let cancelled = false

    if (
      savedLocation.latitude === null ||
      savedLocation.longitude === null
    ) {
      setNearbyBusinesses([])
      setBusinessesLoading(false)
      setBusinessesError(false)

      return () => {
        cancelled = true
      }
    }

    const loadBusinesses = async () => {
      setBusinessesLoading(true)
      setBusinessesError(false)

      try {
        const businesses = await fetchNearbyBusinesses(
          savedLocation.latitude!,
          savedLocation.longitude!,
          radiusKm,
        )

        if (!cancelled) {
          setNearbyBusinesses(businesses)
        }
      } catch {
        if (!cancelled) {
          setNearbyBusinesses([])
          setBusinessesError(true)
        }
      } finally {
        if (!cancelled) {
          setBusinessesLoading(false)
        }
      }
    }

    void loadBusinesses()

    return () => {
      cancelled = true
    }
  }, [
    savedLocation.latitude,
    savedLocation.longitude,
    radiusKm,
  ])

  /*
   * Fetch nearby offers.
   */
  useEffect(() => {
    let cancelled = false

    if (
      savedLocation.latitude === null ||
      savedLocation.longitude === null
    ) {
      setNearbyOffers([])
      setOffersLoading(false)
      setOffersError(false)

      return () => {
        cancelled = true
      }
    }

    const loadOffers = async () => {
      setOffersLoading(true)
      setOffersError(false)

      try {
        const offers = await fetchNearbyOffers(
          savedLocation.latitude!,
          savedLocation.longitude!,
          radiusKm,
        )

        if (!cancelled) {
          setNearbyOffers(offers)
        }
      } catch {
        if (!cancelled) {
          setNearbyOffers([])
          setOffersError(true)
        }
      } finally {
        if (!cancelled) {
          setOffersLoading(false)
        }
      }
    }

    void loadOffers()

    return () => {
      cancelled = true
    }
  }, [
    savedLocation.latitude,
    savedLocation.longitude,
    radiusKm,
  ])

  /*
   * Save the customer's selected location.
   */
  const saveLocation = async () => {
    if (
      !location.country ||
      !location.region ||
      !location.city ||
      (location.latitude === null) !==
        (location.longitude === null)
    ) {
      setFeedback(
        'Select a country, state or region, and city or town before saving.',
      )
      setFeedbackError(true)
      return
    }

    setSaving(true)

    try {
      const selectedLocation = {
        ...location,
        locationAddress: [
          location.city,
          location.region,
          location.country,
        ].join(', '),
      }

      await updateMyLocation(selectedLocation)

      setSavedLocation(selectedLocation)
      setLocation(selectedLocation)

      setFeedback('Location saved.')
      setFeedbackError(false)
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : 'Could not save your location.',
      )

      setFeedbackError(true)
    } finally {
      setSaving(false)
    }
  }

  /*
   * Find an offer's business address.
   * Prefer the offer API address and fall back to the
   * matching nearby-business record when available.
   */
  const getOfferBusinessLocation = (
    offer: NearbyOfferSummary,
  ) => {
    const matchingBusiness = nearbyBusinesses.find(
      (business) => business.id === offer.businessId,
    )

    return formatBusinessLocation(
      offer.address || matchingBusiness?.address,
    )
  }

  const hasCoordinates =
    savedLocation.latitude !== null &&
    savedLocation.longitude !== null

  return (
    <Box sx={{ mb: 2 }}>
      {/* Customer location selector */}
      <LocationPicker
        value={location}
        onChange={setLocation}
        footer={
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Button
              variant="contained"
              onClick={() => void saveLocation()}
              disabled={
                saving || !location.locationAddress.trim()
              }
              sx={{
                textTransform: 'none',
                fontWeight: 800,
              }}
            >
              {saving ? 'Saving…' : 'Save location'}
            </Button>

            {feedback && (
              <Typography
                variant="caption"
                sx={{
                  color: feedbackError
                    ? 'error.main'
                    : 'primary.main',
                }}
              >
                {feedback}
              </Typography>
            )}
          </Stack>
        }
      />

      {/* Location is required for both views */}
      {!hasCoordinates ? (
        <Alert severity="info" sx={{ mt: 1.2 }}>
          Choose a location with GPS or the selectors above
          to discover {view === 'offers' ? 'offers' : 'businesses'} near you.
        </Alert>
      ) : (
        <>
          {/* Search radius */}
          <Stack
            direction="row"
            spacing={0.7}
            sx={{
              mt: 1.5,
              mb: 1.5,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontWeight: 800,
              }}
            >
              Search radius
            </Typography>

            {[5, 25, 50, 100].map((radius) => (
              <Chip
                key={radius}
                label={`${radius} km`}
                size="small"
                clickable
                color={
                  radiusKm === radius ? 'success' : 'default'
                }
                onClick={() => setRadiusKm(radius)}
              />
            ))}
          </Stack>
          {/* OFFERS VIEW */}
          {view === 'offers' && (
            <Box sx={{ mt: 1.5 }}>
              <Typography
                sx={{
                  mb: 0.8,
                  color: 'text.primary',
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Offers near you
              </Typography>

              {offersLoading && (
                <Typography
                  variant="body2"
                  sx={{
                    py: 0.7,
                    color: 'text.secondary',
                  }}
                >
                  Finding local offers…
                </Typography>
              )}

              {offersError && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Local offers could not be loaded right now.
                  Please try again.
                </Alert>
              )}

              {!offersLoading &&
                !offersError &&
                nearbyOffers.length === 0 && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                  >
                    No current offers within {radiusKm} km.
                  </Typography>
                )}

              {!offersLoading && nearbyOffers.length > 0 && (
                <Stack spacing={0.8}>
                  {nearbyOffers.map((offer) => {
                    const businessLocation =
                      getOfferBusinessLocation(offer)

                    return (
                                            <Card
                        key={offer.id}
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          borderRadius: 1.5,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        {/* Offer banner image (left on desktop, top on mobile) */}
                                                {offer.imageUrl && (
                          <Box
                            sx={{
                              flexShrink: 0,
                              width: { xs: '100%', sm: 264 },
                              p: 1.2,
                              pb: { xs: 0, sm: 1.2 },
                            }}
                          >
                            {isPdfAttachment(offer) ? (
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 1,
                                  width: '100%',
                                  aspectRatio: '16 / 9',
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              >
                                <FileText size={32} />
                                <Button
                                  component="a"
                                  href={offer.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="small"
                                  variant="outlined"
                                  sx={{ textTransform: 'none', fontWeight: 700 }}
                                >
                                  View PDF
                                </Button>
                              </Box>
                            ) : (
                              <Box
                                component="img"
                                src={offer.imageUrl}
                                alt={offer.title}
                                loading="lazy"
                                sx={{
                                  display: 'block',
                                  width: '100%',
                                  aspectRatio: '16 / 9',
                                  objectFit: 'cover',
                                  borderRadius: 1,
                                  bgcolor: 'action.hover',
                                }}
                              />
                            )}
                          </Box>
                        )}
                        <CardContent
                          sx={{
                            flex: 1,
                            minWidth: 0,
                            p: 1.2,
                            '&:last-child': {
                              pb: 1.2,
                            },
                          }}
                        >
                          {/* Offer title and discount */}
                          <Typography
                            sx={{
                              color: 'text.primary',
                              fontWeight: 900,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {offer.title}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.2,
                              color: 'primary.main',
                              fontWeight: 900,
                            }}
                          >
                            {offer.discountLabel}
                          </Typography>

                          {/* Business name and distance */}
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{
                              mt: 0.7,
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Typography
                              variant="body2"
                              sx={{
                                color: 'text.secondary',
                                fontWeight: 700,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {offer.businessName}
                            </Typography>

                            <Chip
                              label={formatDistance(
                                offer.distanceKm,
                              )}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          </Stack>

                          {/* Business location */}
                          {businessLocation && (
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{
                                alignItems: 'flex-start',
                                mt: 0.6,
                                color: 'text.secondary',
                              }}
                            >
                              <Box
                                sx={{
                                  display: 'flex',
                                  flexShrink: 0,
                                  mt: '2px',
                                }}
                              >
                                <MapPin size={14} />
                              </Box>

                              <Typography
                                variant="body2"
                                sx={{ overflowWrap: 'anywhere' }}
                              >
                                {businessLocation}
                              </Typography>
                            </Stack>
                          )}

                          {/* Offer description */}
                          {offer.description && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 0.7,
                                color: 'text.secondary',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {offer.description}
                            </Typography>
                          )}

                          {/* Offer validity */}
                          {offer.endsAt && (
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                mt: 0.7,
                                color: 'text.secondary',
                              }}
                            >
                              Valid through{' '}
                              {new Date(
                                offer.endsAt,
                              ).toLocaleDateString()}
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </Stack>
              )}
            </Box>
          )}

          {/* BUSINESSES VIEW */}
          {view === 'businesses' && (
            <Box sx={{ mt: 1.5 }}>
              <Typography
                sx={{
                  mb: 0.8,
                  color: 'text.primary',
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Businesses near you
              </Typography>

              {businessesLoading && (
                <Typography
                  variant="body2"
                  sx={{
                    py: 0.7,
                    color: 'text.secondary',
                  }}
                >
                  Finding nearby businesses…
                </Typography>
              )}

              {businessesError && (
                <Alert severity="warning" sx={{ mb: 1 }}>
                  Nearby businesses could not be loaded right
                  now. Please try again.
                </Alert>
              )}

              {!businessesLoading &&
                !businessesError &&
                nearbyBusinesses.length === 0 && (
                  <Typography
                    variant="body2"
                    sx={{ color: 'text.secondary' }}
                  >
                    No businesses found within {radiusKm} km.
                  </Typography>
                )}

              {!businessesLoading &&
                !businessesError &&
                nearbyBusinesses.length > 0 && (
                  <>
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={1}
                      sx={{
                        alignItems: { xs: 'stretch', sm: 'center' },
                        justifyContent: 'space-between',
                        mb: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 800 }}
                      >
                        {filteredBusinesses.length} nearby businesses
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          label="Home services"
                          size="small"
                          clickable
                          color={homeServicesOnly ? 'success' : 'default'}
                          variant={homeServicesOnly ? 'filled' : 'outlined'}
                          onClick={() => setHomeServicesOnly((current) => !current)}
                          aria-pressed={homeServicesOnly}
                        />
                        <BusinessTypeFilter
                          id="nearby-business-type"
                          value={businessTypeFilter}
                          onChange={setBusinessTypeFilter}
                        />
                      </Stack>
                    </Stack>
                    {filteredBusinesses.length > 0 ? (
                    <Stack spacing={0.8}>
                    {filteredBusinesses.map((business) => {
                      const businessLocation =
                        formatBusinessLocation(business.address)

                      return (
                        <Card
                          key={business.id}
                          variant="outlined"
                          sx={{
                            borderRadius: 1.5,
                            borderColor: 'divider',
                            bgcolor: 'background.paper',
                          }}
                        >
                          <CardContent
                            sx={{
                              p: 1.4,
                              '&:last-child': {
                                pb: 1.4,
                              },
                            }}
                          >
                            {/* Business name and distance */}
                            <Stack
                              direction="row"
                              spacing={1}
                              sx={{
                                alignItems: 'flex-start',
                                justifyContent: 'space-between',
                              }}
                            >
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ minWidth: 0, alignItems: 'center' }}
                              >
                                <BusinessTypeIcon businessType={business.businessType} />
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography
                                    sx={{
                                      color: 'text.primary',
                                      fontWeight: 900,
                                      overflowWrap: 'anywhere',
                                    }}
                                  >
                                    {business.name}
                                  </Typography>
                                  {business.businessType && (
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        display: 'block',
                                        mt: 0.3,
                                        color: 'text.secondary',
                                      }}
                                    >
                                      {getBusinessTypeLabel(business.businessType)}
                                    </Typography>
                                  )}
                                  {business.homeServicesEnabled && (
                                    <Chip
                                      icon={<Home size={12} />}
                                      label="Home services"
                                      size="small"
                                      color="success"
                                      variant="outlined"
                                      sx={{ mt: 0.5, height: 20, fontSize: 11 }}
                                    />
                                  )}
                                </Box>
                              </Stack>

                              <Chip
                                label={formatDistance(
                                  business.distanceKm,
                                )}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            </Stack>

                            {/* Business location */}
                            {businessLocation && (
                              <Stack
                                direction="row"
                                spacing={0.6}
                                sx={{
                                  alignItems: 'flex-start',
                                  mt: 0.8,
                                  color: 'text.secondary',
                                }}
                              >
                                <Box
                                  sx={{
                                    display: 'flex',
                                    flexShrink: 0,
                                    mt: '2px',
                                  }}
                                >
                                  <MapPin size={15} />
                                </Box>

                                <Typography
                                  variant="body2"
                                  sx={{ overflowWrap: 'anywhere' }}
                                >
                                  {businessLocation}
                                </Typography>
                              </Stack>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}
                  </Stack>
                    ) : (
                      <Alert severity="info" sx={{ mt: 1 }}>
                        No nearby businesses match these filters.
                      </Alert>
                    )}
                  </>
                )}
            </Box>
          )}
        </>
      )}
    </Box>
  )
}