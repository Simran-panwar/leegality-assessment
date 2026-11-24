import type { Product, ProductCategory, ProductResponse } from './types'

const API_BASE = 'https://dummyjson.com'

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { signal })
  if (!response.ok) {
    throw new Error(`The product service returned ${response.status}. Please try again.`)
  }
  return response.json() as Promise<T>
}

export async function fetchProducts(signal?: AbortSignal): Promise<Product[]> {
  const result = await request<ProductResponse>('/products?limit=0', signal)
  return result.products
}

export async function fetchCategories(signal?: AbortSignal): Promise<ProductCategory[]> {
  const result = await request<Array<string | ProductCategory>>('/products/categories', signal)
  return result.map((category) =>
    typeof category === 'string'
      ? { slug: category, name: category.replace(/-/g, ' ') }
      : category,
  )
}

export async function fetchCategoryProducts(
  category: string,
  signal?: AbortSignal,
): Promise<Product[]> {
  const result = await request<ProductResponse>(
    `/products/category/${encodeURIComponent(category)}?limit=0`,
    signal,
  )
  return result.products
}

export function fetchProduct(id: string, signal?: AbortSignal): Promise<Product> {
  return request<Product>(`/products/${encodeURIComponent(id)}`, signal)
}
