import { apiClient } from '../services/api/httpClient'

type OfferAsset = {
  imageUrl?: string | null
  attachmentType?: string | null
}

/**
 * Turns a backend path like "/uploads/offers/abc.png" into a full URL.
 * Absolute, data: and blob: URLs are returned unchanged.
 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url

  const base = (apiClient.defaults.baseURL ?? '').replace(/\/$/, '')
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

/** True when the offer attachment is a PDF flyer rather than an image. */
export function isPdfOffer(offer: OfferAsset): boolean {
  return (
    Boolean(offer.attachmentType?.toUpperCase().includes('PDF')) ||
    /\.pdf($|\?)/i.test(offer.imageUrl ?? '')
  )
}