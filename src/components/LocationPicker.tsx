import { Accordion, AccordionDetails, AccordionSummary, Alert, Autocomplete, Button, Stack, TextField, Typography } from '@mui/material'
import { ChevronDown, MapPin, Navigation } from 'lucide-react'
import { getData } from 'country-list'
import { type ReactNode, useEffect, useEffectEvent, useRef, useState } from 'react'
import { apiClient } from '../services/api/httpClient'

export type LocationValue = {
  locationAddress: string
  latitude: number | null
  longitude: number | null
  country?: string
  region?: string
  city?: string
}

type LocationPickerProps = {
  value: LocationValue
  onChange: (value: LocationValue) => void
  required?: boolean
  footer?: ReactNode
}

const countryAliases: Record<string, string> = {
  US: 'United States',
  GB: 'United Kingdom',
  KR: 'South Korea',
  KP: 'North Korea',
  RU: 'Russia',
  IR: 'Iran',
  SY: 'Syria',
  BO: 'Bolivia',
  VE: 'Venezuela',
  TZ: 'Tanzania',
  VN: 'Vietnam',
  LA: 'Laos',
  MD: 'Moldova',
  CZ: 'Czechia',
  MK: 'North Macedonia',
}
const countries = [...getData()]
  .map((country) => ({ ...country, name: countryAliases[country.code] ?? country.name }))
  .sort((first, second) => first.name.localeCompare(second.name))
type PlaceSuggestion = {
  place_id: number
  display_name: string
  lat: string
  lon: string
  address?: Record<string, string>
}

export function LocationPicker({ value, onChange, required = true, footer }: LocationPickerProps) {
  const [gpsMessage, setGpsMessage] = useState('')
  const [gpsError, setGpsError] = useState(false)
  const [resolving, setResolving] = useState(false)
  const autoLookupKey = useRef('')
  const [selectedCountry, setSelectedCountry] = useState<typeof countries[number] | null>(null)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [selectedRegionPlace, setSelectedRegionPlace] = useState<PlaceSuggestion | null>(null)
  const lastGeocoderRequest = useRef(0)
  const regionSearchId = useRef(0)
  const citySearchId = useRef(0)
  const [stateQuery, setStateQuery] = useState('')
  const [stateOptions, setStateOptions] = useState<PlaceSuggestion[]>([])
  const [searchingStates, setSearchingStates] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const [placeOptions, setPlaceOptions] = useState<PlaceSuggestion[]>([])
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null)
  const [searchingPlaces, setSearchingPlaces] = useState(false)
  const [expanded, setExpanded] = useState(() => !value.locationAddress.trim())
  const canSearchStates = Boolean(selectedCountry && !selectedRegionPlace && stateQuery.trim().length >= 2)
  const canSearchPlaces = Boolean(selectedCountry && selectedState && !selectedPlace && cityQuery.trim().length >= 2)
  const visibleStateOptions = canSearchStates ? stateOptions : []
  const visiblePlaceOptions = canSearchPlaces ? placeOptions : []

  const geocoderRequest = async (url: string) => {
    const now = Date.now()
    const requestTime = Math.max(now, lastGeocoderRequest.current + 1100)
    lastGeocoderRequest.current = requestTime
    if (requestTime > now) await new Promise((resolve) => window.setTimeout(resolve, requestTime - now))
    const response = await apiClient.get(url, { headers: { 'Accept-Language': navigator.language || 'en' } })
    return response.data
  }

  const resolvePlaceName = useEffectEvent(async (latitude: number, longitude: number) => {
    setResolving(true)
    setGpsError(false)
    setGpsMessage('Looking up city or town…')
    try {
      const params = new URLSearchParams({ format: 'jsonv2', lat: String(latitude), lon: String(longitude), zoom: '10', addressdetails: '1' })
      const result = await geocoderRequest(`https://nominatim.openstreetmap.org/reverse?${params}`) as { address?: Record<string, string>; display_name?: string; place_id?: number }
      const address = result.address ?? {}
      const locality = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? address.county
      const region = address.state ?? address.region ?? address.province
      const country = countries.find((item) => item.code.toLowerCase() === address.country_code?.toLowerCase())
      if (!locality || !region || !country) throw new Error('Could not resolve full location')
      const resolvedPlace: PlaceSuggestion = {
        place_id: Number(result.place_id ?? 0),
        display_name: result.display_name ?? [locality, region, country.name].join(', '),
        lat: String(latitude),
        lon: String(longitude),
        address,
      }
      const resolvedRegion: PlaceSuggestion = {
        ...resolvedPlace,
        place_id: -1,
        display_name: region,
        address: { ...address, state: region },
      }
      setSelectedCountry(country)
      setSelectedRegionPlace(resolvedRegion)
      setSelectedState(region)
      setStateQuery(region)
      setSelectedPlace(resolvedPlace)
      setCityQuery(locality)
      onChange({ ...value, locationAddress: [locality, region, country.name].join(', '), latitude, longitude, country: country.name, region, city: locality })
      setGpsMessage('Country, region, and city found from your GPS location.')
    } catch {
      setGpsMessage('Could not find a city or town for these coordinates. Enter the location name manually.')
      setGpsError(true)
    } finally {
      setResolving(false)
    }
  })

  useEffect(() => {
    if (value.latitude === null || value.longitude === null) return
    if (selectedCountry) return
    const lookupKey = `${value.latitude},${value.longitude}`
    if (autoLookupKey.current === lookupKey) return
    autoLookupKey.current = lookupKey
    void resolvePlaceName(value.latitude, value.longitude)
  }, [value.latitude, value.longitude, value.locationAddress, selectedCountry])

  useEffect(() => {
    const query = stateQuery.trim()
    if (!canSearchStates || !selectedCountry) return

    const requestId = ++regionSearchId.current
    const timeoutId = window.setTimeout(async () => {
      setSearchingStates(true)
      try {
        const params = new URLSearchParams({ format: 'jsonv2', q: `${query}, ${selectedCountry.name}`, featuretype: 'state', addressdetails: '1', limit: '8' })
        const places = await geocoderRequest(`https://nominatim.openstreetmap.org/search?${params}`) as PlaceSuggestion[]
        if (requestId !== regionSearchId.current) return
        setStateOptions(places.filter((place, index) => places.findIndex((candidate) => candidate.display_name === place.display_name) === index))
      } catch {
        if (requestId === regionSearchId.current) {
          setStateOptions([])
          setGpsMessage('Could not load region suggestions. Check the region name and try again.')
          setGpsError(true)
        }
      } finally {
        if (requestId === regionSearchId.current) setSearchingStates(false)
      }
    }, 600)

    return () => {
      window.clearTimeout(timeoutId)
      if (regionSearchId.current === requestId) regionSearchId.current += 1
    }
  }, [canSearchStates, selectedCountry, selectedRegionPlace, stateQuery])

  useEffect(() => {
    const query = cityQuery.trim()
    if (!canSearchPlaces || !selectedCountry || !selectedState) return

    const requestId = ++citySearchId.current
    const timeoutId = window.setTimeout(async () => {
      setSearchingPlaces(true)
      try {
        const searchText = [query, selectedState, selectedCountry.name].join(', ')
        const params = new URLSearchParams({ format: 'jsonv2', q: searchText, addressdetails: '1', limit: '8' })
        const places = await geocoderRequest(`https://nominatim.openstreetmap.org/search?${params}`) as PlaceSuggestion[]
        if (requestId !== citySearchId.current) return
        setPlaceOptions(places.filter((place, index) => places.findIndex((candidate) => candidate.display_name === place.display_name) === index))
      } catch {
        if (requestId === citySearchId.current) {
          setPlaceOptions([])
          setGpsMessage('Could not load city or town suggestions. Check the name and try again.')
          setGpsError(true)
        }
      } finally {
        if (requestId === citySearchId.current) setSearchingPlaces(false)
      }
    }, 600)

    return () => {
      window.clearTimeout(timeoutId)
      if (citySearchId.current === requestId) citySearchId.current += 1
    }
  }, [canSearchPlaces, cityQuery, selectedCountry, selectedPlace, selectedState])

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage('Location access is not available in this browser. Choose a location manually.')
      setGpsError(true)
      return
    }
    setGpsMessage('Finding your location…')
    setGpsError(false)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const latitude = Number(coords.latitude.toFixed(7))
        const longitude = Number(coords.longitude.toFixed(7))
        autoLookupKey.current = ''
        setSelectedCountry(null)
        setSelectedRegionPlace(null)
        setSelectedState(null)
        setStateQuery('')
        setSelectedPlace(null)
        setCityQuery('')
        onChange({ ...value, locationAddress: '', latitude, longitude, country: undefined, region: undefined, city: undefined })
      },
      (error) => {
        setGpsMessage(error.code === error.PERMISSION_DENIED
          ? 'Location access was denied. Choose a location manually.'
          : 'Could not read your location. Try again or choose a location manually.')
        setGpsError(true)
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const selectCity = (place: PlaceSuggestion | null) => {
    setSelectedPlace(place)
    if (!place || !selectedCountry) return
    const address = place.address ?? {}
    const locality = address.city ?? address.town ?? address.village ?? address.municipality ?? address.suburb ?? place.display_name.split(',')[0]
    const region = selectedState ?? address.state
    const latitude = Number(place.lat)
    const longitude = Number(place.lon)
    const locationAddress = [locality, region, selectedCountry.name].filter(Boolean).join(', ')
    onChange({ ...value, locationAddress, latitude, longitude, country: selectedCountry.name, region: region ?? undefined, city: locality })
    setCityQuery(locality)
    setGpsMessage('City selected. The location address was generated from your selection.')
    setGpsError(false)
  }

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, nextExpanded) => setExpanded(nextExpanded)}
      disableGutters
      elevation={0}
      sx={{ border: '1px solid #e1ebe6', borderRadius: '12px !important', '&:before': { display: 'none' } }}
    >
      <AccordionSummary
        expandIcon={<ChevronDown size={17} />}
        sx={{ minHeight: 62, '& .MuiAccordionSummary-content': { my: 1.1, minWidth: 0 } }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <MapPin size={17} color="var(--mui-palette-primary-main)" />
          <Stack spacing={0.15} sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ color: '#24433b', fontWeight: 800 }}>
              Location{required ? ' *' : ''}
            </Typography>
            <Typography variant="body2" noWrap sx={{ color: value.locationAddress ? '#49635b' : '#7a8984' }}>
              {value.locationAddress || 'Choose a country, region, and city or town'}
            </Typography>
          </Stack>
        </Stack>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
        <Stack spacing={1.1}>
          <Button variant="outlined" startIcon={<Navigation size={16} />} onClick={useCurrentLocation} disabled={resolving} sx={{ alignSelf: 'flex-start', textTransform: 'none', fontWeight: 700 }}>
            Use current location
          </Button>
          <Typography variant="caption" sx={{ color: '#687d78' }}>
            GPS uses your device location; selecting a place uses its mapped coordinates.
          </Typography>
          {gpsMessage && <Alert severity={gpsError ? 'warning' : 'info'} sx={{ py: 0 }}>{gpsMessage}</Alert>}
          <Typography variant="caption" sx={{ color: '#687d78' }}>
            Location suggestions use <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>.
          </Typography>
          <Stack spacing={1}>
            <Typography variant="caption" sx={{ color: '#607570', fontWeight: 700 }}>Select a country, region, and city or town</Typography>
            <Autocomplete
              options={countries}
              value={selectedCountry}
              onChange={(_, country) => {
                setSelectedCountry(country)
                setSelectedState(null)
                setSelectedRegionPlace(null)
                setStateQuery('')
                setStateOptions([])
                setSelectedPlace(null)
                setCityQuery('')
                onChange({ ...value, locationAddress: '', latitude: null, longitude: null, country: country?.name, region: undefined, city: undefined })
              }}
              getOptionLabel={(country) => country.name}
              isOptionEqualToValue={(option, selected) => option.code === selected.code}
              renderInput={(params) => <TextField {...params} label="Country" required />}
            />
            {selectedCountry && (
              <Autocomplete
                options={selectedRegionPlace ? [selectedRegionPlace, ...visibleStateOptions.filter((place) => place.place_id !== selectedRegionPlace.place_id)] : visibleStateOptions}
                value={selectedRegionPlace}
                inputValue={stateQuery}
                loading={canSearchStates && searchingStates}
                onInputChange={(_, text, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setStateQuery(text)
                    setStateOptions([])
                    setSelectedState(null)
                    setSelectedRegionPlace(null)
                    setCityQuery('')
                    setSelectedPlace(null)
                    onChange({ ...value, locationAddress: '', latitude: null, longitude: null, region: undefined, city: undefined })
                  }
                }}
                onChange={(_, place) => {
                  const region = place?.address?.state ?? place?.address?.province ?? place?.display_name.split(',')[0] ?? null
                  setSelectedState(region)
                  setSelectedRegionPlace(place)
                  setStateQuery(region ?? '')
                  setSelectedPlace(null)
                  setCityQuery('')
                  onChange({ ...value, locationAddress: '', latitude: null, longitude: null, country: selectedCountry?.name, region: region ?? undefined, city: undefined })
                }}
                getOptionLabel={(place) => place.address?.state ?? place.address?.province ?? place.display_name.split(',')[0]}
                isOptionEqualToValue={(option, selected) => option.place_id === selected.place_id}
                loadingText="Searching regions…"
                noOptionsText={stateQuery.trim().length < 2 ? 'Type at least 2 characters' : 'No matching regions'}
                renderOption={(props, place) => <li {...props} key={place.place_id}>{place.display_name}</li>}
                renderInput={(params) => <TextField {...params} label="State or region" required />}
              />
            )}
            {selectedCountry && selectedState && (
              <Autocomplete
                options={selectedPlace ? [selectedPlace, ...visiblePlaceOptions.filter((place) => place.place_id !== selectedPlace.place_id)] : visiblePlaceOptions}
                value={selectedPlace}
                inputValue={cityQuery}
                loading={canSearchPlaces && searchingPlaces}
                onInputChange={(_, text, reason) => {
                  if (reason === 'input' || reason === 'clear') {
                    setCityQuery(text)
                    setPlaceOptions([])
                    setSelectedPlace(null)
                    onChange({ ...value, locationAddress: '', latitude: null, longitude: null, city: undefined })
                  }
                }}
                onChange={(_, place) => selectCity(place)}
                getOptionLabel={(place) => place.address?.city ?? place.address?.town ?? place.address?.village ?? place.display_name.split(',')[0]}
                isOptionEqualToValue={(option, selected) => option.place_id === selected.place_id}
                loadingText="Searching cities and towns…"
                noOptionsText={cityQuery.trim().length < 2 ? 'Type at least 2 characters' : 'No matching places'}
                renderOption={(props, place) => <li {...props} key={place.place_id}>{place.display_name}</li>}
                renderInput={(params) => <TextField {...params} label="City or town" placeholder="Type at least 3 characters" required />}
              />
            )}
          </Stack>
          <TextField
            label="Generated location address"
            value={value.locationAddress}
            required={required}
            helperText="Read-only, generated from your selection."
            multiline
            minRows={2}
            fullWidth
            sx={{ '& .MuiInputBase-root, & .MuiInputBase-input': { cursor: 'default' } }}
            slotProps={{ input: { readOnly: true, startAdornment: <MapPin size={17} style={{ marginRight: 9, flexShrink: 0 }} /> } }}
          />
          {footer}
        </Stack>
      </AccordionDetails>
    </Accordion>
  )
}