// API Configuration
// Use production API for now - change to local IP for local development
// Local dev example: 'http://10.107.16.209:3000'
export const API_BASE_URL = 'https://subercraftex.com';

export const API_ENDPOINTS = {
  // Auth
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    verifyEmail: '/api/auth/verify-email',
    resendVerification: '/api/auth/resend-verification',
  },
  // Products
  products: {
    list: '/api/products',
    detail: (id: string) => `/api/products/${id}`,
    reviews: (id: string) => `/api/products/${id}/reviews`,
  },
  // Categories
  categories: {
    list: '/api/categories',
    detail: (id: string) => `/api/categories/${id}`,
  },
  // Cart
  cart: {
    list: '/api/cart',
    add: '/api/cart',
    update: (id: string) => `/api/cart/${id}`,
    remove: (id: string) => `/api/cart/${id}`,
    services: '/api/cart/services',
  },
  // Orders
  orders: {
    list: '/api/orders',
    create: '/api/orders',
    detail: (id: string) => `/api/orders/${id}`,
    tracking: (id: string) => `/api/orders/${id}/tracking`,
  },
  // Services
  services: {
    list: '/api/services',
    detail: (id: string) => `/api/services/${id}`,
    availability: (id: string) => `/api/services/${id}/availability`,
    materials: (id: string) => `/api/services/${id}/materials`,
  },
  // Bookings
  bookings: {
    list: '/api/bookings',
    create: '/api/bookings',
    detail: (id: string) => `/api/bookings/${id}`,
    quote: (id: string) => `/api/bookings/${id}/quote`,
    approveQuote: (id: string) => `/api/bookings/${id}/quote/approve`,
    rejectQuote: (id: string) => `/api/bookings/${id}/quote/reject`,
    cancel: (id: string) => `/api/bookings/${id}/cancel`,
    payments: (id: string) => `/api/bookings/${id}/payments`,
    progress: (id: string) => `/api/bookings/${id}/progress`,
    review: (id: string) => `/api/bookings/${id}/review`,
    materialRequests: (id: string) => `/api/bookings/${id}/material-requests`,
  },
  // Wishlist
  wishlist: {
    list: '/api/wishlist',
    add: '/api/wishlist',
    remove: (id: string) => `/api/wishlist/${id}`,
  },
  // Reviews
  reviews: {
    create: '/api/reviews',
    helpful: (id: string) => `/api/reviews/${id}/helpful`,
  },
  // Addresses
  addresses: {
    list: '/api/addresses',
    create: '/api/addresses',
    update: (id: string) => `/api/addresses/${id}`,
    remove: (id: string) => `/api/addresses/${id}`,
  },
  // Investor
  investor: {
    register: '/api/investors/register',
    me: '/api/investors/me',
    kyc: '/api/investors/kyc',
    kycUpload: '/api/investors/kyc/upload',
    acceptAgreement: '/api/investors/accept-agreement',
    deposits: '/api/investors/deposits',
    confirmDeposit: (id: string) => `/api/investors/deposits/${id}/confirm`,
    withdrawals: '/api/investors/withdrawals',
  },
  // Payments
  payments: {
    createIntent: '/api/create-payment-intent',
  },
  // Upload
  upload: '/api/upload',
  // Banners
  banners: {
    list: '/api/hero-banners',
  },
  // Upcoming Services
  upcomingServices: {
    list: '/api/upcoming-services',
    detail: (id: string) => `/api/upcoming-services/${id}`,
  },
  // Tailor
  tailor: {
    me: '/api/tailors/me',
    bookings: '/api/tailors/bookings',
    bookingDetail: (id: string) => `/api/bookings/${id}`,
    addProgress: (bookingId: string) => `/api/bookings/${bookingId}/progress`,
    updateProgress: (bookingId: string, progressId: string) => `/api/bookings/${bookingId}/progress/${progressId}`,
  },
  // Fittings
  fittings: {
    list: '/api/fittings',
    create: '/api/fittings',
    detail: (id: string) => `/api/fittings/${id}`,
    update: (id: string) => `/api/fittings/${id}`,
    delete: (id: string) => `/api/fittings/${id}`,
  },
} as const;
