export interface Product {
  id: number
  title: string
  description: string
  price: number
  rating: number
  brand?: string
  category: string
  thumbnail: string
  images: string[]
  stock: number
  discountPercentage?: number
  reviews?: ProductReview[]
}

export interface ProductReview {
  rating: number
  comment: string
  date: string
  reviewerName: string
  reviewerEmail: string
}

export interface ProductResponse {
  products: Product[]
  total: number
  skip: number
  limit: number
}

export interface ProductCategory {
  slug: string
  name: string
}
