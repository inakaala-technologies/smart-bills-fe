import { useEffect, useState } from 'react'
import { alpha } from '@mui/material/styles'
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
import { MapPin, Store, Tag, Building2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { LocationPicker, type LocationValue } from '../../../components/LocationPicker'
import { BusinessTypeFilter } from '../../../components/BusinessTypeFilter'
import { BusinessTypeIcon } from '../../../components/BusinessTypeIcon'
import { DashboardListRow } from '../../../components/DashboardListRow'
import { EmptyState } from '../../../components/EmptyState'
import {
  fetchNearbyBusinesses,
  fetchNearbyOffers,
  updateMyLocation,
  type DashboardData,
  type NearbyBusinessSummary,
  type NearbyOfferSummary,
} from '../../../services/api'
import { getBusinessTypeLabel, normalizeBusinessType } from '../../../constants/businessTypes'
import { useAppDispatch } from '../../../store/hooks'
import { setSelectedBusinessId } from '../../../store/customerDashboardSlice'

type BusinessesSubTab = 'nearby' | 'offers' | 'my'

type BusinessesTabViewProps = {
  locationAddress?: string
  latitude?: number
  longitude?: number
  data: DashboardData
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${distanceKm.toFixed(2)} km`
}

const SUB_TABS: Array<{ key: BusinessesSubTab; label: string; icon: typeof Store }> = [
  { key: 'nearby', label: 'Near Business', icon: Store },
  { key: 'offers', label: 'Offers', icon: Tag },
  { key: 'my', label: 'My Business', icon: Building2 },
]

export function BusinessesTabView({
  locationAddress,
  latitude,
  longitude,
  data,
}: BusinessesTabViewProps) {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const initialLocation: LocationValue = {
    locationAddress: locationAddress ?? '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }

  const [subTab, setSubTab] = useState<BusinessesSubTab>('nearby')
  const [location, setLocation] = useState<LocationValue>(initialLocation)
  const [savedLocation, setSavedLocation] = useState<LocationValue>(initialLocation)
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusinessSummary[]>([])
  const [nearbyOffers, setNearbyOffers] = useState<NearbyOfferSummary[]>([])
  const [radiusKm, setRadiusKm] = useState(25)
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL')
  const [myBusinessTypeFilter, setMyBusinessTypeFilter] = useState('ALL')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState(false)

  const filteredNearbyBusinesses = nearbyBusinesses.filter(
    (b) => businessTypeFilter === 'ALL' || normalizeBusinessType(b.businessType) === businessTypeFilter,
  )

  const filteredMyBusinesses = data.businesses.filter(
    (b) => myBusinessTypeFilter === 'ALL' || normalizeBusinessType(b.businessType) === myBusinessTypeFilter,
  )

  // Fetch nearby businesses
  useEffect(() => {
    let cancelled = false
    if (savedLocation.latitude === null || savedLocation.longitude === null) return () => { cancelled = true }
    void Promise.resolve().then(() => { if (!cancelled) setLoading(true) })
    void fetchNearbyBusinesses(savedLocation.latitude, savedLocation.longitude, radiusKm)
      .then((businesses) => { if (!cancelled) setNearbyBusinesses(businesses) })
      .catch(() => { if (!cancelled) setFeedback('Nearby businesses could not be loaded right now.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [savedLocation.latitude, savedLocation.longitude, radiusKm])

  // Fetch nearby offers
  useEffect(() => {
    let cancelled = false
    if (savedLocation.latitude === null || savedLocation.longitude === null) return () => { cancelled = true }
    void Promise.resolve().then(() => { if (!cancelled) { setOffersLoading(true); setOffersError(false) } })
    void fetchNearbyOffers(savedLocation.latitude, savedLocation.longitude, radiusKm)
      .then((offers) => { if (!cancelled) setNearbyOffers(offers) })
      .catch(() => { if (!cancelled) setOffersError(true) })
      .finally(() => { if (!cancelled) setOffersLoading(false) })
    return () => { cancelled = true }
  }, [savedLocation.latitude, savedLocation.longitude, radiusKm])

  const saveLocation = async () => {
    if (!location.country || !location.region || !location.city || (location.latitude === null) !== (location.longitude === null)) {
      setFeedback('Select a country, state or region, and city or town before saving.')
      setFeedbackError(true)
      return
    }
    setSaving(true)
    try {
      const selectedLocation = { ...location, locationAddress: [location.city, location.region, location.country].join(', ') }
      await updateMyLocation(selectedLocation)
      setSavedLocation(selectedLocation)
      setFeedback('Location saved.')
      setFeedbackError(false)
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not save your location.')
      setFeedbackError(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ backgroundColor: 'action.hover', borderRadius: '24px', p: 2, border: '1px solid var(--mui-palette-divider)' }}>
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
              ? filteredNearbyBusinesses.length
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

      {/* ── Nearby Businesses tab ── */}
      {subTab === 'nearby' && (
        <Box>
          <Typography sx={{ mb: 0.4, color: 'text.primary', fontSize: 17, fontWeight: 900 }}>
            Businesses near you
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1.3, color: 'text.secondary' }}>
            Choose a search location to see active businesses across BHive.
          </Typography>

          <LocationPicker
            value={location}
            onChange={setLocation}
            footer={(
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Button
                  variant="contained"
                  onClick={() => void saveLocation()}
                  disabled={saving || !location.locationAddress.trim()}
                  sx={{ textTransform: 'none', fontWeight: 800 }}
                >
                  {saving ? 'Saving…' : 'Save location'}
                </Button>
                {feedback && (
                  <Typography variant="caption" sx={{ color: feedbackError ? 'error.main' : 'primary.main' }}>
                    {feedback}
                  </Typography>
                )}
              </Stack>
            )}
          />

          {savedLocation.latitude === null || savedLocation.longitude === null ? (
            <Alert severity="info" sx={{ mt: 1.2 }}>
              Choose a location with GPS or the selectors above to search nearby businesses.
            </Alert>
          ) : (
            <>
              {/* Radius chips */}
              <Stack direction="row" spacing={0.7} sx={{ mt: 1.5, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                  Search radius
                </Typography>
                {[5, 25, 50, 100].map((r) => (
                  <Chip
                    key={r}
                    label={`${r} km`}
                    size="small"
                    clickable
                    color={radiusKm === r ? 'primary' : 'default'}
                    onClick={() => setRadiusKm(r)}
                  />
                ))}
              </Stack>

              {loading && (
                <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>
                  Finding nearby businesses…
                </Typography>
              )}

              {!loading && nearbyBusinesses.length > 0 && (
                <>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 1 }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                      {filteredNearbyBusinesses.length} nearby {filteredNearbyBusinesses.length === 1 ? 'business' : 'businesses'}
                    </Typography>
                    <BusinessTypeFilter id="nearby-business-type" value={businessTypeFilter} onChange={setBusinessTypeFilter} />
                  </Stack>

                  {filteredNearbyBusinesses.length > 0 ? (
                    <Stack spacing={0.8}>
                      {filteredNearbyBusinesses.map((business) => (
                        <Card key={business.id} variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }}>
                          <CardContent
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 1,
                              p: 1.2,
                              '&:last-child': { pb: 1.2 },
                            }}
                          >
                            <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
                              <BusinessTypeIcon businessType={business.businessType} />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>{business.name}</Typography>
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', overflowWrap: 'anywhere' }}>
                                  {getBusinessTypeLabel(business.businessType)}{business.address ? ` · ${business.address}` : ''}
                                </Typography>
                              </Box>
                            </Stack>
                            <Typography sx={{ flexShrink: 0, color: 'primary.main', fontSize: 12, fontWeight: 800 }}>
                              <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                              {formatDistance(business.distanceKm)}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Alert severity="info" sx={{ mt: 1 }}>No nearby businesses match this type.</Alert>
                  )}
                </>
              )}

              {!loading && nearbyBusinesses.length === 0 && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  No active businesses with mapped locations were found within {radiusKm} km.
                </Alert>
              )}
            </>
          )}
        </Box>
      )}

      {/* ── Offers tab ── */}
      {subTab === 'offers' && (
        <Box>
          <Typography sx={{ mb: 0.4, color: 'text.primary', fontSize: 17, fontWeight: 900 }}>
            Offers near you
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1.3, color: 'text.secondary' }}>
            Exclusive deals from businesses in your area.
          </Typography>

          {savedLocation.latitude === null || savedLocation.longitude === null ? (
            <>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Set your location in the <strong>Near Business</strong> tab to see offers near you.
              </Alert>
              <LocationPicker
                value={location}
                onChange={setLocation}
                footer={(
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Button
                      variant="contained"
                      onClick={() => void saveLocation()}
                      disabled={saving || !location.locationAddress.trim()}
                      sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                      {saving ? 'Saving…' : 'Save location'}
                    </Button>
                    {feedback && (
                      <Typography variant="caption" sx={{ color: feedbackError ? 'error.main' : 'primary.main' }}>
                        {feedback}
                      </Typography>
                    )}
                  </Stack>
                )}
              />
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
              {/* Radius chips */}
              <Stack direction="row" spacing={0.7} sx={{ mt: 0.5, mb: 1.2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                  Search radius
                </Typography>
                {[5, 25, 50, 100].map((r) => (
                  <Chip
                    key={r}
                    label={`${r} km`}
                    size="small"
                    clickable
                    color={radiusKm === r ? 'primary' : 'default'}
                    onClick={() => setRadiusKm(r)}
                  />
                ))}
              </Stack>

              {/* Business type filter for offers — omitted: NearbyOfferSummary has no businessType field */}

              {offersLoading && (
                <Typography variant="body2" sx={{ py: 0.7, color: 'text.secondary' }}>
                  Finding local offers…
                </Typography>
              )}
              {offersError && <Alert severity="warning" sx={{ mb: 1 }}>Local offers could not be loaded right now.</Alert>}
              {!offersLoading && !offersError && nearbyOffers.length === 0 && (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No current offers within {radiusKm} km.
                </Typography>
              )}
              {!offersLoading && nearbyOffers.length > 0 && (
                <Stack spacing={0.8}>
                  {nearbyOffers.map((offer) => (
                    <Card key={offer.id} variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider', bgcolor: 'background.paper' }}>
                      <CardContent sx={{ p: 1.2, '&:last-child': { pb: 1.2 } }}>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography sx={{ color: 'text.primary', fontWeight: 900 }}>{offer.title}</Typography>
                            <Typography sx={{ mt: 0.2, color: 'primary.main', fontWeight: 900 }}>{offer.discountLabel}</Typography>
                          </Box>
                          <Chip label={formatDistance(offer.distanceKm)} size="small" color="success" variant="outlined" />
                        </Stack>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary', fontWeight: 700 }}>
                          {offer.businessName}
                        </Typography>
                        {offer.description && (
                          <Typography variant="body2" sx={{ mt: 0.45, color: 'text.secondary', overflowWrap: 'anywhere' }}>
                            {offer.description}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: 'text.secondary' }}>
                          Valid through {new Date(offer.endsAt).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </>
          )}
        </Box>
      )}

      {/* ── My Business tab ── */}
      {subTab === 'my' && (
        <Box>
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

          {data.businesses.length > 0 ? (
            filteredMyBusinesses.length > 0 ? (
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
              <EmptyState title="No businesses in this category" description="Choose another business type to see more results." />
            )
          ) : (
            <EmptyState title="No businesses" description="Business records will appear here." />
          )}
        </Box>
      )}
    </Box>
  )
}
