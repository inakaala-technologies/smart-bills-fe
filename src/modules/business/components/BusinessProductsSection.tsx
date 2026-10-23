
import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import {
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  createBusinessProduct,
  deactivateBusinessProduct,
  getBusinessProducts,
  updateBusinessProduct,
  type BusinessProduct,
  type ProductPayload,
} from '../../../services/api/billingApi'

type Props = {
  businessId: number | null
  onProductCountChange?: (count: number) => void
}

type ProductForm = {
  name: string
  sku: string
  description: string
  hsnCode: string
  price: string
  gstRate: string
  unit: string
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  description: '',
  hsnCode: '',
  price: '',
  gstRate: '',
  unit: '',
}

const formatMoney = (amount: number) =>
  Number(amount).toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 2.5,
    backgroundColor: 'background.paper',
  },
}

export function BusinessProductsSection({ businessId, onProductCountChange, }: Props) {
  const [products, setProducts] = useState<BusinessProduct[]>([])
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)

  const loadProducts = useCallback(async () => {
    if (!businessId) {
      setProducts([])
      onProductCountChange?.(0)
      return
    }

    setLoading(true)

    try {
      const result = await getBusinessProducts(businessId)

      if (!result.ok) {
        setError(true)
        setMessage(result.message ?? 'Failed to load products.')
        return
      }

      const activeProducts = result.products.filter(
  (product) => product.status === 'ACTIVE',
)

setProducts(activeProducts)
onProductCountChange?.(activeProducts.length)
    } catch {
      setError(true)
      setMessage('Failed to load products. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [businessId, onProductCountChange])

  useEffect(() => {
    void loadProducts()
  }, [loadProducts])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const handleSave = async () => {
    if (!businessId) {
      setError(true)
      setMessage('Select a business profile before saving products.')
      return
    }

    const name = form.name.trim()
    const price = Number(form.price)
    const gstRate = form.gstRate.trim() === '' ? 0 : Number(form.gstRate)

    if (
      !name ||
      form.price.trim() === '' ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(true)
      setMessage('Enter a product name and a valid non-negative price.')
      return
    }

    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      setError(true)
      setMessage('GST rate must be between 0 and 100.')
      return
    }

    const payload: ProductPayload = {
      businessId,
      name,
      price,
      gstRate,
      sku: form.sku.trim(),
      description: form.description.trim(),
      hsnCode: form.hsnCode.trim(),
      unit: form.unit.trim(),
    }

    setSaving(true)
    setMessage('')

    try {
      const result =
        editingId !== null
          ? await updateBusinessProduct(editingId, {
              name: payload.name,
              price: payload.price,
              gstRate: payload.gstRate,
              sku: payload.sku,
              description: payload.description,
              hsnCode: payload.hsnCode,
              unit: payload.unit,
            })
          : await createBusinessProduct(payload)

      if (!result.ok) {
        setError(true)
        setMessage(result.message ?? 'Could not save product.')
        return
      }

      setError(false)
      setMessage(
        editingId !== null
          ? 'Product updated successfully.'
          : 'Product saved successfully.',
      )

      resetForm()
      await loadProducts()
    } catch {
      setError(true)
      setMessage('Could not save product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (product: BusinessProduct) => {
    setEditingId(product.id)
    setForm({
      name: product.name,
      sku: product.sku ?? '',
      description: product.description ?? '',
      hsnCode: product.hsnCode ?? '',
      price: String(product.price),
      gstRate: product.gstRate == null ? '' : String(product.gstRate),
      unit: product.unit ?? '',
    })
    setMessage('')
    setError(false)
  }

  const handleDeactivate = async (productId: number) => {
    if (
      !window.confirm(
        'Deactivate this product? It will no longer appear in the active product list.',
      )
    ) {
      return
    }

    try {
      const result = await deactivateBusinessProduct(productId)

      if (!result.ok) {
        setError(true)
        setMessage(result.message ?? 'Could not deactivate product.')
        return
      }

      if (editingId === productId) {
        resetForm()
      }

      setError(false)
      setMessage('Product deactivated successfully.')
      await loadProducts()
    } catch {
      setError(true)
      setMessage('Could not deactivate product. Please try again.')
    }
  }

  const filteredProducts = products.filter((product) => {
    const query = searchText.trim().toLowerCase()

    if (!query) return true

    return [
      product.name,
      product.sku ?? '',
      product.hsnCode ?? '',
      product.description ?? '',
    ].some((value) => value.toLowerCase().includes(query))
  })

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 900,
        mx: 'auto',
        minWidth: 0,
        p: { xs: 0, sm: 1 },
        pb: 2,
      }}
    >
      <Stack spacing={2.5} sx={{ minWidth: 0 }}>
        {/* Page header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'primary.main',
                  backgroundColor: 'action.hover',
                }}
              >
                <Package size={21} />
              </Box>

              <Typography
                variant="h5"
                sx={{
                  fontWeight: 850,
                  fontSize: { xs: 22, sm: 28 },
                  lineHeight: 1.2,
                  letterSpacing: '-0.5px',
                }}
              >
                Product Catalog
              </Typography>
            </Stack>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, lineHeight: 1.6 }}
            >
              Manage your products, prices and GST for invoices.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            aria-label="Refresh products"
            onClick={() => void loadProducts()}
            disabled={loading || !businessId}
            sx={{
              flexShrink: 0,
              minWidth: 0,
              px: 1.25,
              py: 1,
              borderRadius: 2.5,
              textTransform: 'none',
              fontWeight: 700,
            }}
          >
            <RefreshCw size={16} />
            <Box component="span" sx={{ ml: 0.75 }}>
              Refresh
            </Box>
          </Button>
        </Box>

        {/* Status messages */}
        {!businessId && (
          <Alert severity="info" sx={{ borderRadius: 2.5 }}>
            Select or create a business profile before managing products.
          </Alert>
        )}

        {message && (
          <Alert
            severity={error ? 'error' : 'success'}
            onClose={() => setMessage('')}
            sx={{ borderRadius: 2.5, overflowWrap: 'anywhere' }}
          >
            {message}
          </Alert>
        )}

        {/* Add / edit product form */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3.5,
            borderColor: 'divider',
            boxShadow: '0 4px 18px rgba(20, 50, 45, 0.035)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2.5}>
              <Box>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 0.5 }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 800, fontSize: 19 }}
                  >
                    {editingId !== null ? 'Edit product' : 'Add a product'}
                  </Typography>

                  {editingId !== null && (
                    <Box
                      sx={{
                        px: 1,
                        py: 0.35,
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 750,
                        color: 'primary.main',
                        backgroundColor: 'action.hover',
                      }}
                    >
                      EDITING
                    </Box>
                  )}
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  Enter the product details below. Fields marked * are
                  required.
                </Typography>
              </Box>

              <Divider />

              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault()
                  void handleSave()
                }}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: {
                    xs: 'minmax(0, 1fr)',
                    sm: 'repeat(2, minmax(0, 1fr))',
                  },
                  gap: 2,
                  width: '100%',
                  minWidth: 0,
                  '& .MuiTextField-root': {
                    width: '100%',
                    minWidth: 0,
                  },
                }}
              >
                <TextField
                  label="Product name"
                  required
                  size="small"
                  fullWidth
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="e.g. Office Chair"
                  sx={fieldSx}
                />

                <TextField
                  label="SKU"
                  size="small"
                  fullWidth
                  value={form.sku}
                  onChange={(event) =>
                    setForm({ ...form, sku: event.target.value })
                  }
                  placeholder="Optional product code"
                  sx={fieldSx}
                />

                <TextField
                  label="Price (₹)"
                  required
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  placeholder="0.00"
                  sx={fieldSx}
                />

                <TextField
                  label="Unit"
                  size="small"
                  fullWidth
                  value={form.unit}
                  onChange={(event) =>
                    setForm({ ...form, unit: event.target.value })
                  }
                  placeholder="Piece, kg, hour..."
                  sx={fieldSx}
                />

                <TextField
                  label="GST rate (%)"
                  size="small"
                  type="number"
                  fullWidth
                  slotProps={{
                    htmlInput: { min: 0, max: 100, step: '0.01' },
                  }}
                  value={form.gstRate}
                  onChange={(event) =>
                    setForm({ ...form, gstRate: event.target.value })
                  }
                  placeholder="0"
                  sx={fieldSx}
                />

                <TextField
                  label="HSN code"
                  size="small"
                  fullWidth
                  value={form.hsnCode}
                  onChange={(event) =>
                    setForm({ ...form, hsnCode: event.target.value })
                  }
                  placeholder="Optional HSN code"
                  sx={fieldSx}
                />

                <TextField
                  label="Description"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Add product details (optional)"
                  sx={{ ...fieldSx, gridColumn: { sm: '1 / -1' } }}
                />

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.25}
                  sx={{ gridColumn: { sm: '1 / -1' }, pt: 0.5 }}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    startIcon={
                      saving ? (
                        <CircularProgress size={17} color="inherit" />
                      ) : editingId !== null ? (
                        <CheckCircle2 size={17} />
                      ) : (
                        <Plus size={18} />
                      )
                    }
                    disabled={!businessId || saving}
                    sx={{
                      minHeight: 46,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 750,
                      boxShadow: 'none',
                      '&:hover': { boxShadow: 'none' },
                    }}
                  >
                    {saving
                      ? 'Saving product...'
                      : editingId !== null
                        ? 'Update product'
                        : 'Save product'}
                  </Button>

                  {editingId !== null && (
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<X size={17} />}
                      onClick={resetForm}
                      disabled={saving}
                      sx={{
                        minHeight: 46,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                      }}
                    >
                      Cancel edit
                    </Button>
                  )}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Saved products */}
        <Card
          variant="outlined"
          sx={{
            borderRadius: 3.5,
            borderColor: 'divider',
            boxShadow: '0 4px 18px rgba(20, 50, 45, 0.035)',
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="h6"
                  sx={{ fontWeight: 800, fontSize: 19 }}
                >
                  Saved products
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {products.length} active{' '}
                  {products.length === 1 ? 'product' : 'products'}
                </Typography>
              </Box>

              <TextField
                size="small"
                fullWidth
                placeholder="Search by name, SKU or HSN..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                sx={fieldSx}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search size={18} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Divider />

              {loading ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 5,
                  }}
                >
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary">
                    Loading products...
                  </Typography>
                </Box>
              ) : filteredProducts.length === 0 ? (
                <Box
                  sx={{
                    py: 4,
                    px: 1,
                    textAlign: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: 56,
                      height: 56,
                      mx: 'auto',
                      mb: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '50%',
                      color: 'primary.main',
                      backgroundColor: 'action.hover',
                    }}
                  >
                    <Package size={26} />
                  </Box>

                  <Typography sx={{ fontWeight: 800 }}>
                    {searchText
                      ? 'No matching products'
                      : 'No products yet'}
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.75, lineHeight: 1.6 }}
                  >
                    {searchText
                      ? 'Try a different name, SKU or HSN code.'
                      : 'Add your first product using the form above.'}
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {filteredProducts.map((product) => (
                    <Box
                      key={product.id}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 3,
                        backgroundColor: 'background.paper',
                        minWidth: 0,
                        transition: 'border-color 160ms ease',
                        '&:hover': {
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Stack spacing={1.75}>
                        {/* Product details */}
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontWeight: 800,
                              fontSize: 16,
                              lineHeight: 1.45,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {product.name}
                          </Typography>

                          <Typography
                            sx={{
                              mt: 0.75,
                              fontSize: 19,
                              fontWeight: 800,
                              color: 'primary.main',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {formatMoney(product.price)}
                          </Typography>
                        </Box>

                        {/* Product attributes */}
                        <Stack
                          direction="row"
                          useFlexGap
                          flexWrap="wrap"
                          gap={1}
                        >
                          <Box
                            sx={{
                              px: 1.25,
                              py: 0.65,
                              borderRadius: 2,
                              backgroundColor: 'action.hover',
                              maxWidth: '100%',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              Unit
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 650,
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {product.unit || 'Not specified'}
                            </Typography>
                          </Box>

                          <Box
                            sx={{
                              px: 1.25,
                              py: 0.65,
                              borderRadius: 2,
                              backgroundColor: 'action.hover',
                            }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: 'block' }}
                            >
                              GST
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 650 }}
                            >
                              {product.gstRate ?? 0}%
                            </Typography>
                          </Box>

                          {product.sku && (
                            <Box
                              sx={{
                                px: 1.25,
                                py: 0.65,
                                borderRadius: 2,
                                backgroundColor: 'action.hover',
                                maxWidth: '100%',
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                SKU
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 650,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {product.sku}
                              </Typography>
                            </Box>
                          )}

                          {product.hsnCode && (
                            <Box
                              sx={{
                                px: 1.25,
                                py: 0.65,
                                borderRadius: 2,
                                backgroundColor: 'action.hover',
                                maxWidth: '100%',
                              }}
                            >
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block' }}
                              >
                                HSN code
                              </Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 650,
                                  overflowWrap: 'anywhere',
                                }}
                              >
                                {product.hsnCode}
                              </Typography>
                            </Box>
                          )}
                        </Stack>

                        {product.description && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              lineHeight: 1.6,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            {product.description}
                          </Typography>
                        )}

                        <Divider />

                        {/* Actions */}
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                        >
                          <Button
                            variant="outlined"
                            fullWidth
                            size="medium"
                            startIcon={<Pencil size={16} />}
                            onClick={() => handleEdit(product)}
                            sx={{
                              minHeight: 42,
                              borderRadius: 2.5,
                              textTransform: 'none',
                              fontWeight: 700,
                            }}
                          >
                            Edit product
                          </Button>

                          <IconButton
                            aria-label={`Deactivate ${product.name}`}
                            title="Deactivate product"
                            onClick={() =>
                              void handleDeactivate(product.id)
                            }
                            sx={{
                              width: 42,
                              height: 42,
                              flexShrink: 0,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 2.5,
                              color: 'error.main',
                            }}
                          >
                            <Trash2 size={18} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  )
}
