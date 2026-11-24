# Goods — Product Listing App

A responsive e-commerce product listing and detail experience built with React, TypeScript, and Vite. Product data and categories are loaded from the public [DummyJSON Products API](https://dummyjson.com/docs/products).

## Run locally

1. Install Node.js 20 or newer.
2. From the project folder, install dependencies:

   ```sh
   npm install
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

4. Open the local URL printed by Vite.

To create and preview a production build, run `npm run build` and then `npm run preview`.

## Features

- Product listing with image, title, price, and rating.
- Dynamically loaded categories, brand choices, and products.
- Combined category, brand, minimum/maximum price, and text search filters.
- URL-backed filter and pagination state, with pagination reset when filters change.
- API-backed category and product detail requests, loading placeholders, retryable errors, and empty results.
- Product detail route at `/product/:id`; returning from a product restores the listing URL and filters.
- Responsive layout and keyboard-accessible native controls.

## Assumptions

- Prices are displayed in US dollars because the API does not provide a currency field.
- All products are loaded once for client-side price, brand, and text filtering; selected categories are fetched through the category endpoint.
- Pagination is client-side and shows 8 matching products per page.
- Product details include the gallery and customer reviews supplied by the API; checkout and cart behavior are outside the assessment scope.
- Product image and API availability depend on DummyJSON and its remote image hosts.

## Architectural decisions

- React functional components and hooks keep listing, product detail, and request state local and explicit.
- `src/api.ts` centralizes typed API requests and HTTP error handling.
- `src/types.ts` contains the shared product and category response shapes.
- React Router handles `/` and `/product/:id`. Listing state is serialized in query parameters and passed back through navigation state.
- Styling is plain CSS to avoid introducing a heavy component library.

## If given more time

- Add a real cart, wishlist, and sorting controls.
- Add automated component and browser tests.
- Cache API responses and improve offline behavior.
- Add currency/locale preferences and image fallbacks.
