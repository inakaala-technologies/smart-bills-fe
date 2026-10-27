// Fetches a customer's policy from the insurer endpoints on API Setu.
//
// IMPORTANT: this calls "/apisetu/...", which only exists while you run `npm run dev`
// (see the proxy setting in vite.config.ts). Before going live, the calls must move
// to the BHive backend so real keys never sit in browser code.

const API_BASE = '/apisetu'
const API_KEY = 'demokey123456ABCD789' // public sandbox demo key
const CLIENT_ID = 'in.gov.sandbox'
const TIMEOUT_MS = 20000

/* ---------- Endpoint list: add one object here for each new endpoint ---------- */

export interface PolicyInputField {
  name: string // exact field name the insurer expects in certificateParameters
  label: string // what the customer sees
  placeholder: string
  sample: string // value from the API Setu documentation page
  fixedValue?: string // if set, the customer is NOT asked: this value is always sent to the insurer
}

export interface InsurerEndpoint {
  id: string
  categoryId: string // must match an id in INSURANCE_CATEGORIES (health, cyber, life, ...)
  insurer: string
  path: string // the part of the URL after https://sandbox.api-setu.in
  fields: PolicyInputField[]
}

// Every Bajaj Allianz endpoint takes the same single field.
const BAJAJ_POLICY_FIELDS: PolicyInputField[] = [
  { name: 'policy_number', label: 'Policy number', placeholder: 'OG-XX-XXXX-XXXX-XXXXXXXX', sample: 'OG-XX-XXXX-XXXX-XXXXXXXX' },
]

// Oriental Insurance (Health) needs three values. The customer enters the policy number and
// the policy start date; the insurer code is the same for every customer, so it is fixed.
const ORIENTAL_POLICY_FIELDS: PolicyInputField[] = [
  { name: 'POLNO', label: 'Policy number', placeholder: '215700/31/2020/211', sample: '215700/31/2020/211' },
  { name: 'STARTDT', label: 'Policy start date', placeholder: '13-APR-2019', sample: '13-APR-2019' },
  { name: 'INSCODE', label: 'Insurer code', placeholder: '99999999', sample: '99999999', fixedValue: '99999999' },
]

// Each category has one or more insurance companies. When a category has more than one
// (Health has two), the customer picks the company on screen.
// Life and Personal accident have no endpoint of their own on API Setu, so for test data
// they reuse the Bajaj Allianz Health endpoint (hlipc). Change the path if you want another.
export const INSURER_ENDPOINTS: InsurerEndpoint[] = [
  {
    id: 'bajaj-health',
    categoryId: 'health',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/hlipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'oriental-health',
    categoryId: 'health',
    insurer: 'Oriental Insurance',
    path: '/certificate/v3/orientalinsurance/hlipc',
    fields: ORIENTAL_POLICY_FIELDS,
  },
  {
    id: 'bajaj-cyber',
    categoryId: 'cyber',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/cyipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'bajaj-car',
    categoryId: 'car',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/cripc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'bajaj-two-wheeler',
    categoryId: 'two-wheeler',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/twipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'bajaj-commercial-vehicle',
    categoryId: 'commercial-vehicle',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/cvipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'bajaj-home',
    categoryId: 'home',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/hmipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    id: 'bajaj-travel',
    categoryId: 'travel',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/tripc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    // Life company 1 (shown first): no Life endpoint from Bajaj Allianz, so this reuses its Health endpoint for test data.
    // Replace the path (and fields) here when you have the real second Life company endpoint.
    id: 'bajaj-life',
    categoryId: 'life',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/hlipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
  {
    // Life company 2: Pramerica Life has its own Life endpoint on API Setu.
    id: 'pramerica-life',
    categoryId: 'life',
    insurer: 'Pramerica Life',
    path: '/certificate/v3/pramericalife/licer',
    fields: [{ name: 'policyNo', label: 'Policy number', placeholder: '00545434', sample: '00545434' }],
  },
  {
    // No Personal accident endpoint from Bajaj Allianz: reuses the Health endpoint for test data.
    id: 'bajaj-personal-accident',
    categoryId: 'personal-accident',
    insurer: 'Bajaj Allianz',
    path: '/certificate/v3/bajajallianz/hlipc',
    fields: BAJAJ_POLICY_FIELDS,
  },
]

export function getEndpointsFor(categoryId: string): InsurerEndpoint[] {
  return INSURER_ENDPOINTS.filter((endpoint) => endpoint.categoryId === categoryId)
}

export function getEndpointById(endpointId: string): InsurerEndpoint | undefined {
  return INSURER_ENDPOINTS.find((endpoint) => endpoint.id === endpointId)
}

/* ---------- Result types ---------- */

export interface PolicyField {
  label: string
  value: string
}

export interface PolicyResult {
  fields: PolicyField[]
  raw: string
  empty: boolean // true when the server answered OK but sent nothing
  fetchedAt: number // when the details were fetched from the insurer (ms since 1970)
  fromCache: boolean // true when this is the saved copy, not a fresh call
}

/* ---------- Turning the reply into label/value rows ---------- */

const MAX_FIELDS = 80

function flattenXml(xml: string): PolicyField[] {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return []

  const fields: PolicyField[] = []
  const join = (path: string, name: string) => (path ? `${path}.${name}` : name)

  const walk = (node: Element, path: string) => {
    for (const attr of Array.from(node.attributes)) {
      fields.push({ label: join(path, attr.name), value: attr.value })
    }
    const children = Array.from(node.children)
    if (children.length === 0) {
      const text = node.textContent?.trim()
      if (text) fields.push({ label: path || node.tagName, value: text })
      return
    }
    children.forEach((child) => walk(child, join(path, child.tagName)))
  }

  walk(doc.documentElement, '')
  return fields.slice(0, MAX_FIELDS)
}

function flattenJson(value: unknown, path = '', out: PolicyField[] = []): PolicyField[] {
  if (out.length >= MAX_FIELDS) return out
  if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      flattenJson(child, path ? `${path}.${key}` : key, out)
    }
  } else if (value !== null && value !== undefined && String(value).trim() !== '') {
    out.push({ label: path, value: String(value) })
  }
  return out
}

/* ---------- Friendly error messages ---------- */

function messageForStatus(status: number, gotWebPage: boolean): string {
  if (status === 404) return 'API Setu answered “404 Not Found”. The sandbox may be down, or this address may have changed.'
  if (status === 401 || status === 403) return 'API Setu rejected the key or client ID.'
  if (status === 400) return 'API Setu says the details are not valid. Check the values you entered.'
  if (status >= 500) return `API Setu had a problem (status ${status}). Try again later.`
  if (gotWebPage) return 'Got a web page instead of policy data. Check that npm run dev is running and the /apisetu proxy is in vite.config.ts.'
  return `Request failed (status ${status}).`
}

/* ---------- Saved policies ---------- */
// The customer enters a policy number once. After the insurer answers, the policy details
// are saved here (in this browser's localStorage) together with the policy number. Next time
// the same policy number is used, the saved details are shown and the insurer is NOT called
// again. A fresh call only happens when the caller asks for forceRefresh (the Refresh button).
// NOTE: localStorage is only for development and testing. For real customers, save the policy
// in the BHive backend database against the customer's account instead.

const STORE_KEY = 'bhive.policies.v1'
const MAX_SAVED = 20

export interface SavedPolicy {
  endpointId: string
  categoryId: string
  values: Record<string, string> // what the customer entered, e.g. { policy_number: 'OG-...' }
  result: PolicyResult
}

function readStore(): SavedPolicy[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as SavedPolicy[]) : []
  } catch {
    return [] // storage blocked or broken: act as if nothing is saved
  }
}

function writeStore(list: SavedPolicy[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_SAVED)))
  } catch {
    // storage full or blocked: the policy simply will not be saved
  }
}

const sameValues = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(a) === JSON.stringify(b)

export function findSavedPolicy(endpointId: string, values: Record<string, string>): SavedPolicy | undefined {
  return readStore().find((item) => item.endpointId === endpointId && sameValues(item.values, values))
}

// Newest first
export function getSavedPolicies(categoryId: string): SavedPolicy[] {
  return readStore().filter((item) => item.categoryId === categoryId)
}

export function deleteSavedPolicy(endpointId: string, values: Record<string, string>): void {
  writeStore(readStore().filter((item) => !(item.endpointId === endpointId && sameValues(item.values, values))))
}

function savePolicy(endpoint: InsurerEndpoint, values: Record<string, string>, result: PolicyResult): void {
  const others = readStore().filter((item) => !(item.endpointId === endpoint.id && sameValues(item.values, values)))
  writeStore([{ endpointId: endpoint.id, categoryId: endpoint.categoryId, values, result }, ...others])
}

/* ---------- The call ---------- */

export async function fetchPolicy(
  endpoint: InsurerEndpoint,
  values: Record<string, string>,
  options: { forceRefresh?: boolean } = {},
): Promise<PolicyResult> {
  // The certificateParameters sent to the insurer: the policy number the customer entered
  const certificateParameters: Record<string, string> = {}
  for (const field of endpoint.fields) {
    certificateParameters[field.name] = field.fixedValue ?? (values[field.name] ?? '').trim()
  }

  // Already fetched before? Then use the saved details and do not call the insurer again.
  if (!options.forceRefresh) {
    const saved = findSavedPolicy(endpoint.id, certificateParameters)
    if (saved) return { ...saved.result, fromCache: true }
  }

  if (!import.meta.env.DEV) {
    throw new Error('Live policy lookup is only available while developing. It will work after the BHive backend is connected.')
  }

  const now = new Date().toISOString()
  const body = {
    txnId: crypto.randomUUID(),
    format: 'xml',
    certificateParameters,
    consentArtifact: {
      consent: {
        consentId: crypto.randomUUID(),
        timestamp: now,
        dataConsumer: { id: 'string' },
        dataProvider: { id: 'string' },
        purpose: { description: 'string' },
        user: { idType: 'string', idNumber: 'string', mobile: '9988776655', email: 'test@email.com' },
        data: { id: 'string' },
        permission: {
          access: 'string',
          dateRange: { from: now, to: now },
          frequency: { unit: 'string', value: 0, repeats: 0 },
        },
      },
      signature: { signature: 'string' },
    },
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE}${endpoint.path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json', // without this header the sandbox answered 404
        'Content-Type': 'application/json',
        'X-APISETU-APIKEY': API_KEY,
        'X-APISETU-CLIENTID': CLIENT_ID,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(`API Setu did not answer within ${TIMEOUT_MS / 1000} seconds. The sandbox is sometimes slow. Try again.`)
    }
    throw new Error('Could not reach the server. Check your internet and that npm run dev is running.')
  }

  const text = await response.text()
  const gotWebPage = /^\s*(<!doctype html|<html)/i.test(text)

  if (!response.ok || gotWebPage) {
    throw new Error(messageForStatus(response.status, gotWebPage))
  }

  const trimmed = text.trim()
  if (!trimmed) return { fields: [], raw: '', empty: true, fetchedAt: Date.now(), fromCache: false }

  let fields: PolicyField[] = []
  if (trimmed.startsWith('<')) {
    fields = flattenXml(trimmed)
  } else {
    try {
      fields = flattenJson(JSON.parse(trimmed))
    } catch {
      fields = []
    }
  }

  const result: PolicyResult = { fields, raw: text, empty: false, fetchedAt: Date.now(), fromCache: false }
  savePolicy(endpoint, certificateParameters, result) // keep it so this policy is not fetched again
  return result
}