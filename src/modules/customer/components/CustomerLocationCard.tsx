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
import { alpha } from '@mui/material/styles'
import { Building2, FileText, Home, MapPin, Store, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LocationPicker,
  type LocationValue,
} from '../../../components/LocationPicker'
import { BusinessTypeFilter } from '../../../components/BusinessTypeFilter'
import { BusinessTypeIcon } from '../../../components/BusinessTypeIcon'
import { DashboardListRow } from '../../../components/DashboardListRow'
import { EmptyState } from '../../../components/EmptyState'
import {
  getBusinessTypeLabel,
  normalizeBusinessType,
} from '../../../constants/businessTypes'
import {
  fetchNearbyBusinesses,
  fetchNearbyOffers,
  updateMyLocation,
  type DashboardData,
  type NearbyBusinessSummary,
  type NearbyOfferSummary,
} from '../../../services/api'
import { useAppDispatch } from '../../../store/hooks'
import { setSelectedBusinessId } from '../../../store/customerDashboardSlice'

// Shared helpers: resolve relative backend paths and detect PDF flyers.
import { isPdfOffer, resolveAssetUrl } from '../../../utils/offerAsset'

type BusinessesSubTab = 'nearby' | 'offers' | 'my'

const SUB_TABS: Array<{ key: BusinessesSubTab; label: string; icon: typeof Store }> = [
  { key: 'nearby', label: 'Near Business', icon: Store },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'my', label: 'My Business', icon: Building2 },
]

type CustomerLocationCardProps = {
  locationAddress?: string
  latitude?: number
  longitude?: number
  view?: 'businesses' | 'offers'
  myBusinesses?: DashboardData['businesses']
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

export function CustomerLocationCard({
  locationAddress,
  latitude,
  longitude,
  view = 'businesses',
  myBusinesses = [],
}: CustomerLocationCardProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [subTab, setSubTab] = useState<BusinessesSubTab>(view === 'offers' ? 'offers' : 'nearby')
  const [myBusinessTypeFilter, setMyBusinessTypeFilter] = useState('ALL')
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
  const filteredMyBusinesses = (myBusinesses ?? []).filter((business) =>
    myBusinessTypeFilter === 'ALL' || normalizeBusinessType(business.businessType) === myBusinessTypeFilter,
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

    void Promise.resolve().then(() => {
      setLocation(nextLocation)
      setSavedLocation(nextLocation)
    })
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
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setNearbyBusinesses([])
          setBusinessesLoading(false)
          setBusinessesError(false)
        }
      })

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
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setNearbyOffers([])
          setOffersLoading(false)
          setOffersError(false)
        }
      })

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

  const renderLocationPicker = () => (
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
            loading={saving}
            onClick={() => void saveLocation()}
            disabled={
              saving || !location.locationAddress.trim()
            }
            sx={{
              textTransform: 'none',
              fontWeight: 800,
            }}
          >
            Save location
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
  )

  const renderRadiusChips = () => (
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
            radiusKm === radius ? 'primary' : 'default'
          }
          onClick={() => setRadiusKm(radius)}
        />
      ))}
    </Stack>
  )

  return (
    <Box sx={{ mb: 2, minWidth: 0, maxWidth: '100%' }}>
      {/* Sub-tab selector */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          mb: 2,
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
          borderRadius: '14px',
          p: '4px',
        }}
      >
        {SUB_TABS.map(({ key, label, icon: TabIcon }) => {
          const isActive = subTab === key
          const count =
            key === 'nearby'
              ? filteredBusinesses.length
              : key === 'offers'
              ? nearbyOffers.length
              : filteredMyBusinesses.length

          return (
            <Box
              key={key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setSubTab(key)}
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.6,
                py: '8px',
                px: { xs: 0.5, sm: 1 },
                borderRadius: '11px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'primary.main' : 'transparent',
                color: isActive ? '#fff' : 'text.secondary',
                fontWeight: isActive ? 800 : 600,
                fontSize: { xs: '12px', sm: '13px' },
                lineHeight: 1.3,
                letterSpacing: '-0.01em',
                transition: 'all 0.18s ease',
                userSelect: 'none',
                boxShadow: isActive ? '0 2px 8px rgba(108, 92, 231, 0.28)' : 'none',
                '&:hover': {
                  backgroundColor: isActive
                    ? 'primary.main'
                    : (theme) => alpha(theme.palette.primary.main, 0.14),
                  color: isActive ? '#fff' : 'primary.main',
                },
              }}
            >
              <TabIcon size={15} strokeWidth={isActive ? 2.5 : 2} style={{ flexShrink: 0 }} />
              <span>{label}</span>
              {count > 0 && (
                <Box
                  component="span"
                  sx={{
                    px: 0.6,
                    py: 0.1,
                    fontSize: '10px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    backgroundColor: isActive
                      ? 'rgba(255, 255, 255, 0.25)'
                      : (theme) => alpha(theme.palette.primary.main, 0.12),
                    color: isActive ? '#fff' : 'primary.main',
                    lineHeight: 1.2,
                  }}
                >
                  {count}
                </Box>
              )}
            </Box>
          )
        })}
      </Box>

      {/* ── Offers tab ── */}
      {subTab === 'offers' && (
        <Box>
          {!hasCoordinates ? (
            <>
              <Alert severity="info" sx={{ mb: 1.2 }}>
                Set your location to see offers near you.
              </Alert>
              {renderLocationPicker()}
            </>
          ) : (
            <>
              {savedLocation.locationAddress && (
                <Stack direction="row" spacing={0.6} sx={{ alignItems: 'center', mb: 1, color: 'text.secondary' }}>
                  <MapPin size={14} style={{ flexShrink: 0 }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {savedLocation.locationAddress}
                  </Typography>
                </Stack>
              )}
              {renderRadiusChips()}
            <Box sx={{ mt: 1.5 }}>
              <Typography
                sx={{
                  mb: 0.8,
                  color: 'text.primary',
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                Offers near you ({nearbyOffers.length})
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

                    // Resolve relative backend paths (e.g. /uploads/...)
                    // to a full URL the browser can load.
                    const assetUrl = resolveAssetUrl(offer.imageUrl)
                    const isPdf = isPdfOffer(offer)

                    return (
                      <Card
                        key={offer.id}
                        variant="outlined"
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          borderRadius: 1.5,
                          borderColor: 'divider',
                          bgcolor: 'background.paper',
                        }}
                      >
                        {/* Offer image or PDF flyer (always on top: the app is a fixed phone-width column) */}
                        {assetUrl && (
                          <Box
                            sx={{
                              flexShrink: 0,
                              width: '100%',
                              p: 1.2,
                              pb: 0,
                            }}
                          >
                            {isPdf ? (
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
                                  href={assetUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                  }}
                                >
                                  View flyer (PDF)
                                </Button>
                              </Box>
                            ) : (
                              <Box
                                component="img"
                                src={assetUrl}
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
              </>
            )}
        </Box>
      )}

      {/* ── Nearby Businesses tab ── */}
      {subTab === 'nearby' && (
        <Box>
          {renderLocationPicker()}
          {!hasCoordinates ? (
            <Alert severity="info" sx={{ mt: 1.2 }}>
              Choose a location with GPS or the selectors above to discover businesses near you.
            </Alert>
          ) : (
            <>
              {renderRadiusChips()}
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
                    {/* Always stacked: the app is a fixed phone-width column, so the browser
                        window width (sm breakpoint) must not decide this layout. */}
                    <Stack spacing={1} sx={{ mb: 1, minWidth: 0 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontWeight: 800 }}
                      >
                        {filteredBusinesses.length} nearby businesses
                      </Typography>
                      <Stack
                        direction="row"
                        sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, minWidth: 0 }}
                      >
                        <Chip
                          label="Home services"
                          size="small"
                          clickable
                          color={homeServicesOnly ? 'success' : 'default'}
                          variant={homeServicesOnly ? 'filled' : 'outlined'}
                          onClick={() => setHomeServicesOnly((current) => !current)}
                          aria-pressed={homeServicesOnly}
                        />
                        {/* Dropdown shrinks to the space left in the row instead of a fixed 190px */}
                        <Box
                          sx={{
                            flex: '1 1 170px',
                            minWidth: 0,
                            '& .MuiFormControl-root': { minWidth: 0, width: '100%' },
                          }}
                        >
                          <BusinessTypeFilter
                            id="nearby-business-type"
                            value={businessTypeFilter}
                            onChange={setBusinessTypeFilter}
                          />
                        </Box>
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
            </>
          )}
        </Box>
      )}

      {/* ── My Business tab ── */}
      {subTab === 'my' && (
        <Box sx={{ mt: 0.5 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', gap: 1, mb: 1.5 }}
          >
            <Box>
              <Typography sx={{ color: 'text.primary', fontSize: 17, fontWeight: 900 }}>My businesses</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Business profiles linked to your account.
              </Typography>
            </Box>
            <BusinessTypeFilter id="my-business-type" value={myBusinessTypeFilter} onChange={setMyBusinessTypeFilter} />
          </Stack>

          {filteredMyBusinesses.length > 0 ? (
            <Stack spacing={1.2}>
              {filteredMyBusinesses.map((business) => (
                <Box
                  key={business.id}
                  onClick={() => {
                    dispatch(setSelectedBusinessId(business.id))
                    navigate(`/business/${business.id}`)
                  }}
                  sx={{
                    cursor: 'pointer',
                    borderRadius: '16px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: '0 10px 20px rgba(0,0,0,0.18)' },
                  }}
                >
                  <DashboardListRow
                    leading={<BusinessTypeIcon businessType={business.businessType} />}
                    title={business.businessName ?? business.name ?? `Business ${business.id}`}
                    subtitle={`${getBusinessTypeLabel(business.businessType)}${business.email ? ` · ${business.email}` : ''}`}
                    trailing={
                      <Chip
                        label={business.status ?? 'active'}
                        size="small"
                        sx={{ bgcolor: 'success.light', color: 'success.dark', fontWeight: 700 }}
                      />
                    }
                  />
                </Box>
              ))}
            </Stack>
          ) : (
            <EmptyState
              title={myBusinesses && myBusinesses.length > 0 ? 'No businesses in this category' : 'No businesses'}
              description={myBusinesses && myBusinesses.length > 0 ? 'Choose another business type to see more results.' : 'Business records will appear here.'}
            />
          )}
        </Box>
      )}
    </Box>
  )
}