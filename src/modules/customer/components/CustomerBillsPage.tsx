
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  ArrowLeft,
  Droplets,
  FileText,
  ReceiptText,
  Zap,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
import {
  CustomerConsentBottomSheet,
  CUSTOMER_CONSENT_STATEMENT_VERSION,
} from './CustomerConsentBottomSheet'
import {
  fetchBillCatalog,
  fetchBillProviders,
  fetchProviderFields,
  fetchSavedBill,
  fetchSavedBillPdf,
  fetchSavedBills,
  acceptCustomerBillConsent,
  getInsuranceCatalogType,
  submitBillFetch,
  type BillCategory,
  type BillProvider,
  type InsuranceCatalogType,
  type ProviderFetchResponse,
  type ProviderInputField,
  type SavedBill,
} from '../../../services/api/billingApi'
import { ApiClientError, getErrorMessage } from '../../../services/api/httpClient'

type BillCategoryCode = 'ELECTRICITY' | 'WATER' | 'ECHALLAN' | 'INSURANCE' | 'DOCUMENTS'
const DEFAULT_BILL_CATEGORY_CODES: BillCategoryCode[] = ['ELECTRICITY', 'WATER', 'ECHALLAN']
type CustomerBillsPageProps = {
  categoryCodes?: BillCategoryCode[]
  insuranceType?: InsuranceCatalogType
  title?: string
}
const categoryDetails: Record<BillCategoryCode, { description: string; icon: typeof Zap }> = {
  ELECTRICITY: { description: 'Electricity bill payments', icon: Zap },
  WATER: { description: 'Water bill payments', icon: Droplets },
  ECHALLAN: { description: 'Traffic challan details', icon: ReceiptText },
  INSURANCE: { description: 'Insurance policy details', icon: ShieldCheck },
  DOCUMENTS: { description: 'Vehicle and identity documents', icon: FileText },
}

const supportedInputTypes = new Set([
  'text',
  'number',
  'email',
  'password',
  'tel',
  'url',
  'date',
  'time',
  'month',
  'search',
])

function isBillCategoryCode(code: string): code is BillCategoryCode {
  return code in categoryDetails
}

function getInputType(inputType: string): string {
  const normalizedType = inputType.toLowerCase()
  return supportedInputTypes.has(normalizedType) ? normalizedType : 'text'
}

function getConsentAcceptanceErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return error instanceof Error
      ? error.message
      : 'We could not record your consent. Please try again.'
  }

  if (error.status === 401 || error.status === 403) {
    return 'Your session could not be verified. Please sign in again before continuing.'
  }
  if (error.status === 404) {
    return 'This provider is no longer available. Please select another provider.'
  }
  if (error.status === 400 && error.message.toLowerCase().includes('statement version')) {
    return 'The consent information has changed. Refresh the page before trying again.'
  }
  if (error.status === 400 && error.message.toLowerCase().includes('requested data fields')) {
    return 'The selected provider details have changed. Review the fields and try again.'
  }
  if (error.status === undefined) {
    return 'We could not connect to record your consent. Check your connection and try again.'
  }
  return error.message || 'We could not record your consent. Please review the request and try again.'
}

function getProviderFetchErrorMessage(error: unknown): string {
  const status = error instanceof ApiClientError ? error.status : undefined
  const backendMessage = getErrorMessage(error, '').toLowerCase()

  if (status === 503) {
    return 'External authorization is not currently available, so no bill was fetched. Start a new attempt and provide fresh consent.'
  }
  if ((status === 409 && backendMessage.includes('consent'))
    || /consent.{0,30}(expired|revoked|used|no longer valid)/.test(backendMessage)) {
    return 'This consent is no longer valid, may have been revoked, or has already been used. Provide fresh consent for a new fetch.'
  }
  if (status === 409) {
    return 'A fetch for these details is already being processed. Please wait and try again with fresh consent if needed.'
  }
  if (status === 404 && backendMessage.includes('consent')) {
    return 'This consent could not be found. Provide fresh consent for a new fetch.'
  }
  if (backendMessage.includes('consent does not match')
    || (status === 400 && backendMessage.includes('requested data fields'))) {
    return 'The consent does not match this provider or the information requested. Review the details and provide fresh consent.'
  }
  if (status === 401 || status === 403) {
    return 'Your session could not be verified. Please sign in again before fetching.'
  }
  if (status === 502 || status === 504) {
    return 'The service provider could not be reached. No bill was fetched. Start a new attempt and provide fresh consent.'
  }
  if (status === undefined) {
    return 'We could not confirm the fetch because of a connection problem. No bill was fetched. Start a new attempt and provide fresh consent.'
  }
  return getErrorMessage(error, 'We could not fetch these details. No bill was fetched. Start a new attempt and provide fresh consent.')
}

export function CustomerBillsPage({
  categoryCodes = DEFAULT_BILL_CATEGORY_CODES,
  insuranceType,
  title,
}: CustomerBillsPageProps) {
  const categoryCodeKey = categoryCodes.join('|')
  const [categories, setCategories] = useState<Array<BillCategory & { code: BillCategoryCode }>>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categoriesError, setCategoriesError] = useState('')
  const [categoryCode, setCategoryCode] = useState<BillCategoryCode>(categoryCodes[0] ?? 'ELECTRICITY')
  const [providers, setProviders] = useState<BillProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(true)
  const [providersError, setProvidersError] = useState('')
  const [providerCode, setProviderCode] = useState('')
  const [fields, setFields] = useState<ProviderInputField[]>([])
  const [fieldsLoading, setFieldsLoading] = useState(false)
  const [fieldsError, setFieldsError] = useState('')
  const [providerInputs, setProviderInputs] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] =
    useState<'success' | 'warning' | 'error' | 'info'>('info')
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentError, setConsentError] = useState('')
  const [isConsentSubmitting, setIsConsentSubmitting] = useState(false)
  const consentSubmissionInProgress = useRef(false)
  const [fetchResult, setFetchResult] = useState<ProviderFetchResponse | null>(null)
  const [savedBills, setSavedBills] = useState<SavedBill[]>([])
  const [savedBillsLoading, setSavedBillsLoading] = useState(true)
  const [savedBillsError, setSavedBillsError] = useState('')
  const [savedBillsPage, setSavedBillsPage] = useState(0)
  const [savedBillsHasMore, setSavedBillsHasMore] = useState(false)
  const [selectedSavedBill, setSelectedSavedBill] = useState<SavedBill | null>(null)
  const [savedBillLoadingId, setSavedBillLoadingId] = useState<number | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true
    const allowedCodes = categoryCodeKey.split('|')

    fetchBillCatalog()
      .then((data) => {
        if (!active) return
        const allowedCodeSet = new Set(allowedCodes)
        const supportedCategories = data.filter(
          (item): item is BillCategory & { code: BillCategoryCode } => (
            allowedCodeSet.has(item.code) && isBillCategoryCode(item.code)
          ),
        )
        setCategories(supportedCategories)
        setProvidersLoading(supportedCategories.length > 0)
        setCategoryCode((currentCode) => (
          supportedCategories.some((item) => item.code === currentCode)
            ? currentCode
            : (supportedCategories[0]?.code as BillCategoryCode | undefined)
              ?? (allowedCodes[0] as BillCategoryCode | undefined)
              ?? 'ELECTRICITY'
        ))
      })
      .catch((error: unknown) => {
        if (active) {
          setCategoriesError(getErrorMessage(error, 'Could not load bill categories.'))
          setProvidersLoading(false)
        }
      })
      .finally(() => {
        if (active) setCategoriesLoading(false)
      })

    return () => {
      active = false
    }
  }, [categoryCodeKey])

  useEffect(() => {
    let active = true
    if (!categories.some((item) => item.code === categoryCode)) return

    fetchBillProviders(categoryCode)
      .then((data) => {
        if (active) {
          setProviders(data.filter((provider) => (
            !insuranceType || getInsuranceCatalogType(provider.name) === insuranceType
          )))
        }
      })
      .catch((error: unknown) => {
        if (active) setProvidersError(getErrorMessage(error, 'Could not load providers.'))
      })
      .finally(() => {
        if (active) setProvidersLoading(false)
      })

    return () => {
      active = false
    }
  }, [categories, categoryCode, insuranceType])

  useEffect(() => {
    let active = true
    if (!providerCode) return

    fetchProviderFields(providerCode)
      .then((data) => {
        if (active) setFields([...data].sort((first, second) => first.displayOrder - second.displayOrder))
      })
      .catch((error: unknown) => {
        if (active) setFieldsError(getErrorMessage(error, 'Could not load provider fields.'))
      })
      .finally(() => {
        if (active) setFieldsLoading(false)
      })

    return () => {
      active = false
    }
  }, [providerCode])

  useEffect(() => {
    let active = true
    fetchSavedBills(categoryCode, 0)
      .then((result) => {
        if (!active) return
        setSavedBills(result.content)
        setSavedBillsHasMore(result.number + 1 < result.totalPages)
      })
      .catch((error: unknown) => {
        if (active) setSavedBillsError(getErrorMessage(error, 'Could not load saved bills.'))
      })
      .finally(() => {
        if (active) setSavedBillsLoading(false)
      })
    return () => {
      active = false
    }
  }, [categoryCode])

  const handleCategoryChange = (nextCategory: BillCategoryCode) => {
    setCategoryCode(nextCategory)
    setProviders([])
    setProvidersLoading(true)
    setProvidersError('')
    setProviderCode('')
    setFields([])
    setFieldsLoading(false)
    setFieldsError('')
    setProviderInputs({})
    setFetchResult(null)
    setSavedBillsLoading(true)
    setSavedBillsError('')
    setSavedBillsPage(0)
    setSelectedSavedBill(null)
    setMessage('')
  }

  const handleProviderChange = (nextProviderCode: string) => {
    setProviderCode(nextProviderCode)
    setFields([])
    setFieldsLoading(Boolean(nextProviderCode))
    setFieldsError('')
    setProviderInputs({})
    setFetchResult(null)
    setMessage('')
  }

  const handleFetchClick = () => {
    setMessage('')
    setConsentError('')

    if (!providerCode) {
      setMessageType('warning')
      setMessage('Please select a provider.')
      return
    }

    const missingField = fields.find((field) => field.required && !providerInputs[field.fieldKey]?.trim())
    if (missingField) {
      setMessageType('warning')
      setMessage(`Please enter ${missingField.label}.`)
      return
    }

    const requestedDataFields = Object.keys(providerInputs)
    if (requestedDataFields.length === 0) {
      setMessageType('warning')
      setMessage('Enter at least one provider detail before continuing.')
      return
    }

    setFetchResult(null)
    setConsentOpen(true)
  }

  const handleConsentContinue = async () => {
    if (consentSubmissionInProgress.current) return

    consentSubmissionInProgress.current = true
    setIsConsentSubmitting(true)
    setConsentError('')
    setMessage('')

    let consentAccepted = false
    try {
      const consent = await acceptCustomerBillConsent({
        providerCode,
        requestedDataFields: Object.keys(providerInputs),
        purposeCode: 'MANUAL_BILL_FETCH',
        statementVersion: CUSTOMER_CONSENT_STATEMENT_VERSION,
        accepted: true,
      })
      consentAccepted = true
      setConsentOpen(false)

      const result = await submitBillFetch(
        providerCode,
        providerInputs,
        consent.consentRecordId,
      )
      setFetchResult(result)
      setMessageType('success')
      setMessage('Your information was fetched successfully.')
    } catch (error) {
      setFetchResult(null)
      if (consentAccepted) {
        setConsentOpen(false)
        setMessageType('error')
        setMessage(getProviderFetchErrorMessage(error))
      } else {
        setConsentError(getConsentAcceptanceErrorMessage(error))
      }
    } finally {
      consentSubmissionInProgress.current = false
      setIsConsentSubmitting(false)
    }
  }

  const loadMoreSavedBills = async () => {
    const nextPage = savedBillsPage + 1
    setSavedBillsLoading(true)
    setSavedBillsError('')
    try {
      const result = await fetchSavedBills(categoryCode, nextPage)
      setSavedBills((current) => [...current, ...result.content])
      setSavedBillsPage(nextPage)
      setSavedBillsHasMore(nextPage + 1 < result.totalPages)
    } catch (error) {
      setSavedBillsError(getErrorMessage(error, 'Could not load more saved bills.'))
    } finally {
      setSavedBillsLoading(false)
    }
  }

  const openSavedBill = async (id: number) => {
    setSavedBillLoadingId(id)
    setDetailError('')
    try {
      setSelectedSavedBill(await fetchSavedBill(id))
    } catch (error) {
      setDetailError(getErrorMessage(error, 'Could not load saved bill details.'))
    } finally {
      setSavedBillLoadingId(null)
    }
  }

  const downloadSavedBillPdf = async (id: number) => {
    setPdfLoadingId(id)
    setDetailError('')
    try {
      const blob = await fetchSavedBillPdf(id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `saved-bill-${id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDetailError(getErrorMessage(error, 'Could not download the saved bill PDF.'))
    } finally {
      setPdfLoadingId(null)
    }
  }

  const downloadFetchedPdf = () => {
    if (!fetchResult?.pdfData) return
    const bytes = Uint8Array.from(atob(fetchResult.pdfData), (character) => character.charCodeAt(0))
    const url = URL.createObjectURL(new Blob([bytes], { type: fetchResult.contentType ?? 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `${providerCode.toLowerCase()}-bill.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Stack spacing={2.5} sx={{ pb: 3 }}>
      {/* Page heading */}
      <Box>
        <Button
          startIcon={<ArrowLeft size={18} />}
          onClick={() => window.history.back()}
          sx={{
            mb: 1.5,
            px: 0,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          Back to dashboard
        </Button>

        <Typography
          sx={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: '-0.045em',
            lineHeight: 1.2,
          }}
        >
          {title ?? 'Pay your bills'}
        </Typography>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mt: 0.8, lineHeight: 1.6 }}
        >
          Find bill and document details for your accounts.
        </Typography>
      </Box>

      {/* Intro banner */}
      <Card
        elevation={0}
        sx={{
          borderRadius: 3.5,
          color: 'primary.contrastText',
          background:
            'linear-gradient(135deg, #155eef 0%, #3538cd 100%)',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 2.3, '&:last-child': { pb: 2.3 } }}>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 3,
                bgcolor: 'rgba(255,255,255,0.16)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <ReceiptText size={25} />
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, fontSize: 17 }}>
                All bills, one place
              </Typography>
              <Typography
                variant="body2"
                sx={{ opacity: 0.9, mt: 0.4 }}
              >
                Select a category to get started.
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Category selection */}
      {(categories.length > 1 || categoriesLoading || categoriesError) && <Box>
        <Typography sx={{ fontWeight: 900, fontSize: 17, mb: 1.3 }}>
          Choose a category
        </Typography>

        {categoriesLoading && (
          <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">Loading categories…</Typography>
          </Box>
        )}
        {categoriesError && <Alert severity="error" sx={{ mb: 1.5 }}>{categoriesError}</Alert>}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 1.2,
          }}
        >
          {categories.map((item) => {
            const details = categoryDetails[item.code]
            const Icon = details.icon
            const selected = categoryCode === item.code

            return (
              <Card
                key={item.id}
                variant="outlined"
                onClick={() => handleCategoryChange(item.code)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 3,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? 'primary.main' : 'divider',
                  bgcolor: selected ? 'action.selected' : 'background.paper',
                  transition: 'border-color 0.18s ease',
                }}
              >
                <CardContent
                  sx={{ p: 1.6, '&:last-child': { pb: 1.6 } }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mb: 1.2,
                    }}
                  >
                    <Box
                      sx={{
                        height: 42,
                        width: 42,
                        borderRadius: 2.5,
                        display: 'grid',
                        placeItems: 'center',
                        bgcolor: selected
                          ? 'primary.main'
                          : 'action.hover',
                        color: selected
                          ? 'primary.contrastText'
                          : 'primary.main',
                      }}
                    >
                      <Icon size={21} />
                    </Box>

                    {selected && (
                      <ShieldCheck
                        size={18}
                        color="currentColor"
                      />
                    )}
                  </Box>

                  <Typography sx={{ fontWeight: 800, fontSize: 14 }}>
                    {item.name}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 0.5, lineHeight: 1.5 }}
                  >
                    {details.description}
                  </Typography>
                </CardContent>
              </Card>
            )
          })}
        </Box>
      </Box>}

      {/* Form */}
      <Card
        variant="outlined"
        sx={{ borderRadius: 3.5, borderColor: 'divider' }}
      >
        <CardContent sx={{ p: 2.2, '&:last-child': { pb: 2.2 } }}>
          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>
            {categories.find((item) => item.code === categoryCode)?.name ?? 'Bill details'}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.6, mb: 2.2, lineHeight: 1.6 }}
          >
            Select a provider and enter the details requested for that account.
          </Typography>

          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              required
              label="Select Provider"
              value={providerCode}
              disabled={categoriesLoading || providersLoading || providers.length === 0}
              onChange={(event) => {
                handleProviderChange(event.target.value)
              }}
              helperText="Providers are loaded for the selected category."
            >
              {providers.map((item) => (
                <MenuItem key={item.id} value={item.code}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>

            {providersLoading && (
              <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Loading providers…</Typography>
              </Box>
            )}
            {providersError && <Alert severity="error">{providersError}</Alert>}
            {!providersLoading && !providersError && categories.some((item) => item.code === categoryCode) && providers.length === 0 && (
              <Alert severity="info">No providers are available for this category.</Alert>
            )}

            {providerCode && fieldsLoading && (
              <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} />
                <Typography variant="body2" color="text.secondary">Loading provider fields…</Typography>
              </Box>
            )}
            {fieldsError && <Alert severity="error">{fieldsError}</Alert>}
            {!fieldsLoading && !fieldsError && fields.map((field) => (
              <TextField
                fullWidth
                key={field.fieldKey}
                required={field.required}
                type={getInputType(field.inputType)}
                multiline={field.inputType.toLowerCase() === 'textarea'}
                label={field.label}
                placeholder={field.placeholder ?? ''}
                helperText={field.helpText ?? undefined}
                value={providerInputs[field.fieldKey] ?? ''}
                onChange={(event) => {
                  setProviderInputs((current) => ({
                    ...current,
                    [field.fieldKey]: event.target.value,
                  }))
                  setMessage('')
                }}
                error={Boolean(message && field.required && !providerInputs[field.fieldKey]?.trim())}
              />
            ))}
          </Stack>

          {message && (
            <Alert
              severity={messageType}
              sx={{ mt: 2, borderRadius: 2 }}
            >
              {message}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleFetchClick}
            disabled={fieldsLoading || !providerCode || isConsentSubmitting}
            endIcon={<ChevronRight size={19} />}
            sx={{
              mt: 2.5,
              py: 1.45,
              borderRadius: 2.5,
              textTransform: 'none',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            Fetch details
          </Button>
        </CardContent>
      </Card>

      {fetchResult && (
        <Card variant="outlined" sx={{ borderRadius: 3.5 }}>
          <CardContent>
            <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 1.5 }}>Fetched details</Typography>
            {fetchResult.format.toUpperCase() === 'JSON' && (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, m: 0 }}>
                {JSON.stringify(fetchResult.jsonData, null, 2)}
              </Box>
            )}
            {fetchResult.format.toUpperCase() === 'XML' && (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, m: 0 }}>
                {fetchResult.xmlData}
              </Box>
            )}
            {fetchResult.format.toUpperCase() === 'PDF' && fetchResult.pdfData && (
              <Button onClick={downloadFetchedPdf}>Download fetched PDF</Button>
            )}
            {!['JSON', 'XML', 'PDF'].includes(fetchResult.format.toUpperCase()) && (
              <Alert severity="warning">Unsupported response format: {fetchResult.format}</Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Card variant="outlined" sx={{ borderRadius: 3.5 }}>
        <CardContent>
          <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 1.5 }}>Saved history</Typography>
          {savedBillsError && <Alert severity="error" sx={{ mb: 1.5 }}>{savedBillsError}</Alert>}
          {detailError && <Alert severity="error" sx={{ mb: 1.5 }}>{detailError}</Alert>}
          {savedBillsLoading && (
            <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">Loading saved records…</Typography>
            </Box>
          )}
          {!savedBillsLoading && savedBills.length === 0 && !savedBillsError && (
            <Typography variant="body2" color="text.secondary">No saved records for this category yet.</Typography>
          )}
          <Stack spacing={1.2}>
            {savedBills.map((bill) => (
              <Card key={bill.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Typography sx={{ fontWeight: 800 }}>{bill.providerName}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {bill.fetchedAt ? new Date(bill.fetchedAt).toLocaleString() : 'Fetch date unavailable'}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      onClick={() => void openSavedBill(bill.id)}
                      disabled={savedBillLoadingId === bill.id}
                    >
                      {savedBillLoadingId === bill.id ? 'Loading…' : 'View details'}
                    </Button>
                    {bill.pdfAvailable && (
                      <Button
                        size="small"
                        onClick={() => void downloadSavedBillPdf(bill.id)}
                        disabled={pdfLoadingId === bill.id}
                      >
                        {pdfLoadingId === bill.id ? 'Downloading…' : 'Download PDF'}
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
          {selectedSavedBill && (
            <Card variant="outlined" sx={{ mt: 1.5, borderRadius: 2 }}>
              <CardContent sx={{ p: 1.5 }}>
                <Typography sx={{ fontWeight: 800, mb: 1 }}>
                  Saved details — {selectedSavedBill.providerName}
                </Typography>
                {selectedSavedBill.jsonData != null && (
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, m: 0 }}>
                    {JSON.stringify(selectedSavedBill.jsonData, null, 2)}
                  </Box>
                )}
                {selectedSavedBill.xmlData && (
                  <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontSize: 13, m: 0 }}>
                    {selectedSavedBill.xmlData}
                  </Box>
                )}
                <Button size="small" onClick={() => setSelectedSavedBill(null)} sx={{ mt: 1 }}>
                  Close details
                </Button>
              </CardContent>
            </Card>
          )}
          {savedBillsHasMore && (
            <Button onClick={() => void loadMoreSavedBills()} disabled={savedBillsLoading} sx={{ mt: 1 }}>
              Load more
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Security note */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 1,
          px: 1,
        }}
      >
        <ShieldCheck
          size={17}
          style={{ flexShrink: 0, marginTop: 2 }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textAlign: 'left', lineHeight: 1.6 }}
        >
          Provider and input definitions are loaded from the backend. Automatic fetching is not enabled for Insurance or Documents.
        </Typography>
      </Box>
      <CustomerConsentBottomSheet
        open={consentOpen}
        purpose={`Fetch ${categories.find((item) => item.code === categoryCode)?.name.toLowerCase() ?? 'bill'} information from the selected provider.`}
        categoryName={categories.find((item) => item.code === categoryCode)?.name ?? categoryDetails[categoryCode].description}
        providerName={providers.find((item) => item.code === providerCode)?.name ?? providerCode}
        dataItems={Object.keys(providerInputs).map((fieldKey) => (
          fields.find((field) => field.fieldKey === fieldKey)?.label ?? fieldKey
        ))}
        unavailableNotice="This InGyro consent is separate from any provider authorization required to retrieve your information. If external authorization is unavailable, no bill will be fetched."
        errorMessage={consentError}
        busy={isConsentSubmitting}
        onCancel={() => {
          setConsentError('')
          setConsentOpen(false)
        }}
        onContinue={() => void handleConsentContinue()}
      />
    </Stack>
  )
}
