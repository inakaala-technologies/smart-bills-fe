import { apiClient } from './httpClient'
import type { NearbyBusinessSummary, NearbyOfferSummary } from './types'

export async function fetchNearbyBusinesses(latitude: number, longitude: number, radiusKm = 25): Promise<NearbyBusinessSummary[]> {
  const { data } = await apiClient.get<Array<Record<string, unknown>>>('/api/v1/businesses/nearby', {
    params: { latitude, longitude, radiusKm },
  })
  return data.map((row) => ({
    id: Number(row.id),
    name: String(row.name ?? 'Business'),
    businessType: typeof row.businessType === 'string' ? row.businessType : undefined,
    address: typeof row.address === 'string' ? row.address : undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceKm: Number(row.distanceKm),
  }))
}

export async function fetchNearbyOffers(latitude: number, longitude: number, radiusKm = 25): Promise<NearbyOfferSummary[]> {
  return (await apiClient.get<NearbyOfferSummary[]>('/api/v1/businesses/offers/nearby', {
    params: { latitude, longitude, radiusKm },
  })).data
}
