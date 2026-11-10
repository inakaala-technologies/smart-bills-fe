type OfferAsset = {
  imageUrl: string | null
  attachmentType: 'IMAGE' | 'PDF' | null
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/**
 * The backend returns the uploaded file as `attachmentUrl` with a lowercase
 * `attachmentType` ("image" / "pdf"). The UI uses `imageUrl` and
 * 'IMAGE' | 'PDF'. This maps one to the other and keeps every other field.
 */
export function normalizeOfferAsset<T extends object>(offer: T): T & OfferAsset {
  const record = offer as Record<string, unknown>

  const url = readString(record.imageUrl) ?? readString(record.attachmentUrl)
  const rawType = readString(record.attachmentType)?.toUpperCase() ?? ''

  const isPdf =
    rawType === 'PDF' ||
    rawType === 'APPLICATION/PDF' ||
    (url !== null && /\.pdf$/i.test(url.split('?')[0]))

  return {
    ...offer,
    imageUrl: url,
    attachmentType: url ? (isPdf ? 'PDF' : 'IMAGE') : null,
  }
}