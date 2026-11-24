import { useEffect, useMemo, useState } from 'react'
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { fetchCategories, fetchCategoryProducts, fetchProduct, fetchProducts } from './api'
import type { Product, ProductCategory } from './types'

const PAGE_SIZE = 8

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
}

function displayCategory(category: string) {
  return category.replace(/-/g, ' ')
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<ListingPage />} />
      <Route path="/product/:id" element={<ProductPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function StoreHeader({
  query,
  onQueryChange,
  onSearchSubmit,
}: {
  query: string
  onQueryChange: (value: string) => void
  onSearchSubmit: () => void
}) {
  return (
    <header className="site-header">
      <Link aria-label="Goods home" className="menu-button" to="/">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
      </Link>
      <form className="header-search" onSubmit={(event) => { event.preventDefault(); onSearchSubmit() }}>
        <svg aria-hidden="true" className="search-icon" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
        <input
          aria-label="Search products"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search products..."
          type="search"
          value={query}
        />
      </form>
      <div aria-hidden="true" className="header-actions">
        <svg viewBox="0 0 24 24"><path d="M2 3h2l2.4 12.1a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 1.9-1.4L22 8H5" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /></svg>
        <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9z" /><path d="M15 3.5V9h5.5A9 9 0 0 0 15 3.5z" /></svg>
        <svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0z" /></svg>
      </div>
    </header>
  )
}

function ListingPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [categoryProducts, setCategoryProducts] = useState<Product[] | null>(null)
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [catalogError, setCatalogError] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [retryCatalog, setRetryCatalog] = useState(0)
  const [retryCategory, setRetryCategory] = useState(0)

  const category = searchParams.get('category') ?? ''
  const brand = searchParams.get('brand') ?? ''
  const query = searchParams.get('q') ?? ''
  const minPrice = searchParams.get('min') ?? ''
  const maxPrice = searchParams.get('max') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  useEffect(() => {
    const controller = new AbortController()
    setCatalogLoading(true)
    setCatalogError('')

    Promise.all([fetchProducts(controller.signal), fetchCategories(controller.signal)])
      .then(([nextProducts, nextCategories]) => {
        setProducts(nextProducts)
        setCategories(nextCategories)
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalogError(error instanceof Error ? error.message : 'Unable to load products.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCatalogLoading(false)
      })

    return () => controller.abort()
  }, [retryCatalog])

  useEffect(() => {
    if (!category) {
      setCategoryProducts(null)
      setCategoryError('')
      setCategoryLoading(false)
      return
    }

    const controller = new AbortController()
    setCategoryLoading(true)
    setCategoryError('')
    setCategoryProducts(null)

    fetchCategoryProducts(category, controller.signal)
      .then((result) => setCategoryProducts(result))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCategoryError(error instanceof Error ? error.message : 'Unable to load this category.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoryLoading(false)
      })

    return () => controller.abort()
  }, [category, retryCategory])

  const brands = useMemo(
    () => [...new Set((category ? categoryProducts ?? products : products).map((product) => product.brand).filter(Boolean) as string[])].sort(),
    [category, categoryProducts, products],
  )

  const filteredProducts = useMemo(() => {
    const source = category ? categoryProducts ?? [] : products
    const min = minPrice === '' ? null : Number(minPrice)
    const max = maxPrice === '' ? null : Number(maxPrice)
    const normalizedQuery = query.trim().toLowerCase()
    const searchTerms = normalizedQuery === 'perfume' || normalizedQuery === 'cologne'
      ? [normalizedQuery, 'fragrance']
      : [normalizedQuery]

    return source
      .filter((product) => !brand || product.brand === brand)
      .filter((product) => min === null || product.price >= min)
      .filter((product) => max === null || product.price <= max)
      .filter(
        (product) =>
          !normalizedQuery ||
          searchTerms.some((term) =>
            `${product.title} ${product.description} ${product.brand ?? ''} ${product.category}`
              .toLowerCase()
              .includes(term),
          ),
      )
  }, [brand, category, categoryProducts, maxPrice, minPrice, products, query])

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE))
  const visibleProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) updateParams({ page: String(totalPages) })
  }, [page, totalPages])

  function updateParams(updates: Record<string, string>) {
    const next = new URLSearchParams(searchParams)
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value)
      else next.delete(key)
    })
    if (!('page' in updates)) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function resetFilters() {
    setSearchParams({})
  }

  const isLoading = catalogLoading || categoryLoading
  const error = catalogError || categoryError

  return (
    <div className="page-shell">
      <StoreHeader
        query={query}
        onQueryChange={(value) => updateParams({ q: value })}
        onSearchSubmit={() => updateParams({ q: query })}
      />
      <main className="listing-main">
        <aside aria-label="Product filters" className="filter-panel">
          <label className="sidebar-search">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
            <input
              aria-label="Filter products by search"
              onChange={(event) => updateParams({ q: event.target.value })}
              placeholder="Search..."
              type="search"
              value={query}
            />
          </label>
          <div className="filter-group">
            <h2 className="filter-label">Categories</h2>
            <div className="filter-options">
              {categories.map((item) => (
                <label className="check-option" key={item.slug}>
                  <input
                    checked={category === item.slug}
                    name="category"
                    onChange={() => updateParams({ category: item.slug })}
                    type="radio"
                  />
                  <span>{item.name}</span>
                </label>
              ))}
            </div>
            {category && (
              <button className="clear-filter" onClick={() => updateParams({ category: '' })} type="button">
                Show all categories
              </button>
            )}
          </div>
          <fieldset className="filter-group price-filter">
            <legend className="filter-label">Price Range</legend>
            <div className="price-inputs">
              <input
                aria-label="Minimum price"
                min="0"
                onChange={(event) => updateParams({ min: event.target.value })}
                placeholder="Min"
                type="number"
                value={minPrice}
              />
              <input
                aria-label="Maximum price"
                min="0"
                onChange={(event) => updateParams({ max: event.target.value })}
                placeholder="Max"
                type="number"
                value={maxPrice}
              />
            </div>
            <button className="apply-button" onClick={() => updateParams({ min: minPrice, max: maxPrice })} type="button">Apply</button>
          </fieldset>
          <div className="filter-group">
            <h2 className="filter-label">Brands</h2>
            <div className="filter-options brand-options">
              {brands.map((item) => (
                <label className="check-option" key={item}>
                  <input
                    checked={brand === item}
                    name="brand"
                    onChange={() => updateParams({ brand: brand === item ? '' : item })}
                    type="checkbox"
                  />
                  <span>{item}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="clear-button" onClick={resetFilters} type="button">Clear all filters</button>
        </aside>

        <section aria-label="Products" className="product-area">
          <div className="product-heading">
            <h1><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="10" r="6.5" /><path d="m15 15 6 6M5.5 10a4.5 4.5 0 0 1 4.5-4.5" /></svg> Filters</h1>
            <p className="results-count">
              {isLoading ? 'Loading products...' : `${filteredProducts.length} products`}
            </p>
          </div>

              {error ? (
                <div className="state-card error-card" role="alert">
                  <span className="state-icon">!</span>
                  <h3>We couldn’t load the collection.</h3>
                  <p>{error}</p>
                  <button
                    className="button button-dark"
                    onClick={() => {
                      if (catalogError) setRetryCatalog((value) => value + 1)
                      if (categoryError) setRetryCategory((value) => value + 1)
                    }}
                    type="button"
                  >
                    Try again
                  </button>
                </div>
              ) : isLoading ? (
                <div aria-label="Loading products" className="product-grid">
                  {Array.from({ length: 8 }, (_, index) => <div className="product-skeleton" key={index} />)}
                </div>
              ) : visibleProducts.length ? (
                <div className="product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      state={{ from: `${location.pathname}${location.search}` }}
                    />
                  ))}
                </div>
              ) : (
                <div className="state-card empty-card">
                  <span className="state-icon">↗</span>
                  <h3>No pieces found this time.</h3>
                  <p>Try a different search or clear a filter to see more of the collection.</p>
                  <button className="button button-dark" onClick={resetFilters} type="button">Clear filters</button>
                </div>
              )}

              {!isLoading && !error && filteredProducts.length > PAGE_SIZE && (
                <nav aria-label="Product pages" className="pagination">
                  <button
                    aria-label="Previous page"
                    className="page-control"
                    disabled={page <= 1}
                    onClick={() => updateParams({ page: String(page - 1) })}
                    type="button"
                  >← Previous</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                    const start = Math.min(Math.max(1, page - 1), Math.max(1, totalPages - 4))
                    return start + index
                  }).map((pageNumber) => (
                    <button
                      aria-current={pageNumber === page ? 'page' : undefined}
                      className={`page-number${pageNumber === page ? ' is-current' : ''}`}
                      key={pageNumber}
                      onClick={() => updateParams({ page: String(pageNumber) })}
                      type="button"
                    >{pageNumber}</button>
                  ))}
                  <button
                    aria-label="Next page"
                    className="page-control"
                    disabled={page >= totalPages}
                    onClick={() => updateParams({ page: String(page + 1) })}
                    type="button"
                  >Next →</button>
                </nav>
              )}
        </section>
      </main>
    </div>
  )
}

function ProductCard({
  product,
  state,
}: {
  product: Product
  state: { from: string }
}) {
  return (
    <Link
      aria-label={`View ${product.title}, ${formatPrice(product.price)}`}
      className="product-card"
      state={state}
      to={`/product/${product.id}`}
    >
      <div className="product-image-wrap">
        <img alt={product.title} className="product-image" loading="lazy" src={product.thumbnail} />
      </div>
      <div className="product-meta">
        <h3>{product.title}</h3>
        <div className="product-price-rating">
          <span className="product-price">{formatPrice(product.price)}</span>
          <span aria-label={`${product.rating} out of 5 stars`} className="rating">
            <span aria-hidden="true" className="stars">{'★'.repeat(Math.round(product.rating))}{'☆'.repeat(5 - Math.round(product.rating))}</span>
            <span className="rating-number">({product.rating.toFixed(1)})</span>
          </span>
        </div>
      </div>
    </Link>
  )
}

function ProductPage() {
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const id = pathname.split('/').filter(Boolean).at(-1) ?? ''
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const [selectedImage, setSelectedImage] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const returnTo = (state as { from?: unknown } | null)?.from
  const backTarget = typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')
    ? returnTo
    : '/'
  const previousQuery = new URLSearchParams(backTarget.split('?')[1] ?? '').get('q') ?? ''

  useEffect(() => setSearchQuery(previousQuery), [previousQuery])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetchProduct(id, controller.signal)
      .then(setProduct)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load this product.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id, retry])

  const images = product?.images?.length ? product.images : product ? [product.thumbnail] : []

  function showImage(index: number) {
    if (images.length) setSelectedImage((index + images.length) % images.length)
  }

  return (
    <div className="page-shell">
      <StoreHeader
        query={searchQuery}
        onQueryChange={setSearchQuery}
        onSearchSubmit={() => navigate(`/?q=${encodeURIComponent(searchQuery)}`)}
      />
      <main className="detail-main">
        {loading ? (
          <div aria-label="Loading product details" className="detail-loading">
            <div>
              <button className="back-link" onClick={() => navigate(backTarget)} type="button">← Back</button>
              <div className="detail-loading-image" />
            </div>
            <div className="detail-loading-copy" />
          </div>
        ) : error ? (
          <div className="state-card error-card detail-state" role="alert">
            <button className="back-link" onClick={() => navigate(backTarget)} type="button">← Back</button>
            <span className="state-icon">!</span>
            <h3>We couldn’t find this piece.</h3>
            <p>{error}</p>
            <button className="button button-dark" onClick={() => setRetry((value) => value + 1)} type="button">Try again</button>
          </div>
        ) : product ? (
          <article className="detail-layout">
            <div className="detail-gallery">
              <button className="back-link" onClick={() => navigate(backTarget)} type="button">
                <span aria-hidden="true">←</span> Back
              </button>
              <div className="detail-image-wrap">
                <img alt={product.title} className="detail-image" src={images[selectedImage] ?? product.thumbnail} />
              </div>
              <nav aria-label="Product images" className="gallery-pagination">
                <button className="page-control" onClick={() => showImage(selectedImage - 1)} type="button">← Previous</button>
                {images.map((image, index) => (
                  <button
                    aria-label={`Show product image ${index + 1}`}
                    aria-current={index === selectedImage ? 'page' : undefined}
                    className={`page-number${index === selectedImage ? ' is-current' : ''}`}
                    key={image}
                    onClick={() => showImage(index)}
                    type="button"
                  >{index + 1}</button>
                ))}
                <button className="page-control" onClick={() => showImage(selectedImage + 1)} type="button">Next →</button>
              </nav>
            </div>
            <div className="detail-copy">
              <h1>{product.title}</h1>
              <div className="detail-price-rating">
                <p className="detail-price">{formatPrice(product.price)}</p>
                <RatingStars rating={product.rating} />
              </div>
              <p className="detail-attribute"><strong>Brand:</strong> {product.brand ?? '—'}</p>
              <p className="detail-attribute"><strong>Category:</strong> {displayCategory(product.category)}</p>
              <div className="detail-rule" />
              <h2>Description</h2>
              <p className="detail-description">{product.description}</p>
              <div className="detail-rule" />
              <h2>Reviews</h2>
              <div className="review-list">
                {product.reviews?.length ? product.reviews.map((review, index) => (
                  <article className="review" key={`${review.reviewerEmail}-${index}`}>
                    <div className="review-heading">
                      <strong>{review.reviewerName}</strong>
                      <RatingStars rating={review.rating} />
                    </div>
                    <p>{review.comment}</p>
                  </article>
                )) : <p className="detail-description">No reviews yet.</p>}
              </div>
            </div>
          </article>
        ) : null}
      </main>
    </div>
  )
}

function RatingStars({ rating }: { rating: number }) {
  return (
    <span aria-label={`${rating.toFixed(1)} out of 5 stars`} className="rating">
      <span aria-hidden="true" className="stars">{'★'.repeat(Math.round(rating))}{'☆'.repeat(5 - Math.round(rating))}</span>
      <span className="rating-number">({rating.toFixed(1)})</span>
    </span>
  )
}

function NotFoundPage() {
  return (
    <div className="page-shell">
      <StoreHeader query="" onQueryChange={() => undefined} onSearchSubmit={() => undefined} />
      <main className="not-found">
        <p className="eyebrow">A LITTLE DETOUR</p>
        <h1>This page wandered off.</h1>
        <Link className="button button-dark" to="/">Back to the collection <span aria-hidden="true">↗</span></Link>
      </main>
    </div>
  )
}

export default App
