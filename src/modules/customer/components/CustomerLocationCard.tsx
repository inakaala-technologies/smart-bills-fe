import { Alert, Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material'
import { MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LocationPicker, type LocationValue } from '../../../components/LocationPicker'
import { BusinessTypeFilter } from '../../../components/BusinessTypeFilter'
import { BusinessTypeIcon } from '../../../components/BusinessTypeIcon'
import { getBusinessTypeLabel, normalizeBusinessType } from '../../../constants/businessTypes'
import { fetchNearbyBusinesses, fetchNearbyOffers, updateMyLocation, type NearbyBusinessSummary, type NearbyOfferSummary } from '../../../services/api'

type CustomerLocationCardProps = {
  locationAddress?: string
  latitude?: number
  longitude?: number
}

function formatDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${distanceKm.toFixed(2)} km`
}

export function CustomerLocationCard({ locationAddress, latitude, longitude }: CustomerLocationCardProps) {
  const initialLocation: LocationValue = {
    locationAddress: locationAddress ?? '',
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  }
  const [location, setLocation] = useState<LocationValue>(initialLocation)
  const [savedLocation, setSavedLocation] = useState<LocationValue>(initialLocation)
  const [nearbyBusinesses, setNearbyBusinesses] = useState<NearbyBusinessSummary[]>([])
  const [businessTypeFilter, setBusinessTypeFilter] = useState('ALL')
  const [nearbyOffers, setNearbyOffers] = useState<NearbyOfferSummary[]>([])
  const [radiusKm, setRadiusKm] = useState(25)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [offersLoading, setOffersLoading] = useState(false)
  const [offersError, setOffersError] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [feedbackError, setFeedbackError] = useState(false)
  const filteredBusinesses = nearbyBusinesses.filter((business) =>
    businessTypeFilter === 'ALL' || normalizeBusinessType(business.businessType) === businessTypeFilter,
  )

  useEffect(() => {
    let cancelled = false
    if (savedLocation.latitude === null || savedLocation.longitude === null) {
      return () => { cancelled = true }
    }
    const businessesRequest = fetchNearbyBusinesses(savedLocation.latitude, savedLocation.longitude, radiusKm)
    void Promise.resolve().then(() => { if (!cancelled) setLoading(true) })
    void businessesRequest
      .then((businesses) => { if (!cancelled) setNearbyBusinesses(businesses) })
      .catch(() => { if (!cancelled) setFeedback('Nearby businesses could not be loaded right now.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [savedLocation.latitude, savedLocation.longitude, radiusKm])

  useEffect(() => {
    let cancelled = false
    if (savedLocation.latitude === null || savedLocation.longitude === null) {
      return () => { cancelled = true }
    }
    const offersRequest = fetchNearbyOffers(savedLocation.latitude, savedLocation.longitude, radiusKm)
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setOffersLoading(true)
        setOffersError(false)
      }
    })
    void offersRequest
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
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ mb: 0.4, color: 'text.primary', fontSize: 18, fontWeight: 900 }}>Businesses near you</Typography>
      <Typography variant="caption" sx={{ display: 'block', mb: 1.3, color: 'text.secondary' }}>Choose a search location to see active businesses across BHive.</Typography>
      <LocationPicker
        value={location}
        onChange={setLocation}
        footer={(
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button variant="contained" onClick={() => void saveLocation()} disabled={saving || !location.locationAddress.trim()} sx={{ textTransform: 'none', fontWeight: 800 }}>
              {saving ? 'Saving…' : 'Save location'}
            </Button>
            {feedback && <Typography variant="caption" sx={{ color: feedbackError ? 'error.main' : 'primary.main' }}>{feedback}</Typography>}
          </Stack>
        )}
      />
      {savedLocation.latitude === null || savedLocation.longitude === null ? (
        <Alert severity="info" sx={{ mt: 1.2 }}>Choose a location with GPS or the selectors above to search nearby businesses.</Alert>
      ) : (
        <>
          <Stack direction="row" spacing={0.7} sx={{ mt: 1.5, mb: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>Search radius</Typography>
            {[5, 25, 50, 100].map((radius) => <Chip key={radius} label={`${radius} km`} size="small" clickable color={radiusKm === radius ? 'success' : 'default'} onClick={() => setRadiusKm(radius)} />)}
          </Stack>
          {loading && <Typography variant="body2" sx={{ py: 1, color: 'text.secondary' }}>Finding nearby businesses…</Typography>}
          {!loading && nearbyBusinesses.length > 0 && (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>{filteredBusinesses.length} nearby businesses</Typography>
                <BusinessTypeFilter id="nearby-business-type" value={businessTypeFilter} onChange={setBusinessTypeFilter} />
              </Stack>
              {filteredBusinesses.length > 0 ? (
                <Stack spacing={0.8}>
                  {filteredBusinesses.map((business) => (
                    <Card key={business.id} variant="outlined" sx={{ borderRadius: 1.5, borderColor: 'divider' }}>
                      <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, p: 1.2, '&:last-child': { pb: 1.2 } }}>
                        <Stack direction="row" spacing={1} sx={{ minWidth: 0, alignItems: 'center' }}>
                          <BusinessTypeIcon businessType={business.businessType} />
                          <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ color: 'text.primary', fontWeight: 800 }}>{business.name}</Typography>
                          <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', overflowWrap: 'anywhere' }}>{getBusinessTypeLabel(business.businessType)}{business.address ? ` · ${business.address}` : ''}</Typography>
                          </Box>
                        </Stack>
                        <Typography sx={{ flexShrink: 0, color: 'primary.main', fontSize: 12, fontWeight: 800 }}><MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 3 }} />{formatDistance(business.distanceKm)}</Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>No nearby businesses match this type.</Alert>
              )}
            </>
          )}
          {!loading && nearbyBusinesses.length === 0 && <Alert severity="info" sx={{ mt: 1 }}>No active businesses with mapped locations were found within {radiusKm} km.</Alert>}
          <Box sx={{ mt: 2.2 }}>
            <Typography sx={{ mb: 0.8, color: 'text.primary', fontSize: 16, fontWeight: 900 }}>Offers near you</Typography>
            {offersLoading && <Typography variant="body2" sx={{ py: 0.7, color: 'text.secondary' }}>Finding local offers…</Typography>}
            {offersError && <Alert severity="warning" sx={{ mb: 1 }}>Local offers could not be loaded right now.</Alert>}
            {!offersLoading && !offersError && nearbyOffers.length === 0 && <Typography variant="body2" sx={{ color: 'text.secondary' }}>No current offers within {radiusKm} km.</Typography>}
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
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.4, color: 'text.secondary', fontWeight: 700 }}>{offer.businessName}</Typography>
                      {offer.description && <Typography variant="body2" sx={{ mt: 0.45, color: 'text.secondary', overflowWrap: 'anywhere' }}>{offer.description}</Typography>}
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: 'text.secondary' }}>Valid through {new Date(offer.endsAt).toLocaleDateString()}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </Box>
        </>
      )}
    </Box>
  )
}