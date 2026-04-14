import { API_URL } from './runtime-config';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

// ─── In-memory access token store ────────────────────────────
// Never stored in localStorage — XSS-safe.
// Refresh token lives in an HttpOnly cookie managed by the server.
let _accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

// Standard API response format from backend
interface ApiResponseWrapper<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown
  ) {
    super(`API Error: ${status} ${statusText}`);
    this.name = 'ApiError';
  }
}

let _isRefreshing = false;
let _refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (_isRefreshing && _refreshPromise) return _refreshPromise;
  _isRefreshing = true;
  _refreshPromise = (async () => {
    try {
      // Refresh token is sent automatically via HttpOnly cookie
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) return false;
      const json = await res.json();
      const data = json?.data ?? json;
      if (data?.accessToken) {
        setAccessToken(data.accessToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      _isRefreshing = false;
      _refreshPromise = null;
    }
  })();
  return _refreshPromise;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function api<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const token = _accessToken;
  const locale = getCookie('locale');
  const currency = getCookie('currency');

  const config: RequestInit = {
    method,
    credentials: 'include', // send HttpOnly cookie
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(locale && { 'Accept-Language': locale }),
      ...(currency && { 'X-Currency': currency }),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response = await fetch(`${API_URL}${endpoint}`, config);

  // Auto-refresh token on 401 and retry once
  if (response.status === 401 && typeof window !== 'undefined' && !endpoint.includes('/auth/refresh')) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const retryConfig: RequestInit = {
        ...config,
        headers: {
          ...config.headers as Record<string, string>,
          Authorization: `Bearer ${_accessToken}`,
        },
      };
      response = await fetch(`${API_URL}${endpoint}`, retryConfig);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    // Extract error message from standardized error response
    const message = errorData?.message || response.statusText;
    throw new ApiError(response.status, message, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const json: ApiResponseWrapper<T> = await response.json();
  
  // Handle standardized API response format
  if (json && typeof json === 'object' && 'success' in json) {
    // For paginated responses, return data and meta together
    if (json.meta) {
      return { data: json.data, meta: json.meta } as T;
    }
    // For regular responses, return data directly
    return json.data as T;
  }
  
  // Fallback for non-standardized responses
  return json as T;
}

// Auth APIs
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api<{ accessToken: string; user: User }>('/auth/register', { method: 'POST', body: data }),

  login: (data: { email: string; password: string }) =>
    api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: data }),
  
  refresh: () =>
    api<{ accessToken: string }>('/auth/refresh', { method: 'POST' }),
  
  me: () => api<User>('/auth/me'),

  getMySuppliers: () => api<SupplierMembership[]>('/auth/me/suppliers'),
  
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api<void>('/auth/change-password', { method: 'POST', body: data }),

  logout: () =>
    api<void>('/auth/logout', { method: 'POST' }),

  forgotPassword: (email: string) =>
    api<{ message: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api<{ message: string }>('/auth/reset-password', { method: 'POST', body: data }),
  
  listUsers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<User>>(`/auth/users${query}`);
  },
  
  getUserById: (id: string) => api<User>(`/auth/users/${id}`),
  
  createUser: (data: CreateUserData) =>
    api<User>('/auth/users', { method: 'POST', body: data }),
  
  updateUser: (id: string, data: UpdateUserData) =>
    api<User>(`/auth/users/${id}`, { method: 'PATCH', body: data }),
  
  lockUser: (id: string, reason?: string) =>
    api(`/auth/users/${id}/lock`, { method: 'PATCH', body: { reason } }),
  
  unlockUser: (id: string, reason?: string) =>
    api(`/auth/users/${id}/unlock`, { method: 'PATCH', body: { reason } }),
  
  deleteUser: (id: string, reason?: string) =>
    api(`/auth/users/${id}`, { method: 'DELETE', body: { reason } }),
  
  restoreUser: (id: string, reason?: string) =>
    api(`/auth/users/${id}/restore`, { method: 'PATCH', body: { reason } }),
  
  resetUserPassword: (id: string, newPassword: string) =>
    api(`/auth/users/${id}/reset-password`, { method: 'PATCH', body: { newPassword } }),
};

// Catalog APIs
export const catalogApi = {
  listTours: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Tour>>(`/catalog/tours${query}`);
  },
  
  getTourById: (id: string) => api<Tour>(`/catalog/tours/${id}`),

  getTourBySlug: (slug: string) => api<Tour>(`/catalog/tours/by-slug/${slug}`),
  
  createTour: (data: CreateTourData) =>
    api<Tour>('/catalog/tours', { method: 'POST', body: data }),
  
  updateTour: (id: string, data: UpdateTourData) =>
    api<Tour>(`/catalog/tours/${id}`, { method: 'PATCH', body: data }),
  
  setTourStatus: (id: string, status: string) =>
    api(`/catalog/tours/${id}/status`, { method: 'PATCH', body: { status } }),
  
  listCategories: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Category>>(`/catalog/types/categories${query}`);
  },
  
  createCategory: (data: { name: string; slug: string; parentId?: string }) =>
    api<Category>('/catalog/types/categories', { method: 'POST', body: data }),
  
  updateCategory: (id: string, data: { name?: string; slug?: string; isActive?: boolean }) =>
    api<Category>(`/catalog/types/categories/${id}`, { method: 'PATCH', body: data }),
  
  listTags: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Tag>>(`/catalog/types/tags${query}`);
  },
  
  createTag: (data: { name: string; slug: string }) =>
    api<Tag>('/catalog/types/tags', { method: 'POST', body: data }),
  
  updateTag: (id: string, data: { name?: string; slug?: string }) =>
    api<Tag>(`/catalog/types/tags/${id}`, { method: 'PATCH', body: data }),

  // Category Translations
  getCategoryTranslations: (categoryId: string) =>
    api<CategoryTranslation[]>(`/catalog/types/categories/${categoryId}/translations`),
  
  upsertCategoryTranslation: (categoryId: string, data: UpsertTranslationData) =>
    api<CategoryTranslation>(`/catalog/types/categories/${categoryId}/translations`, { method: 'PUT', body: data }),
  
  deleteCategoryTranslation: (categoryId: string, languageCode: string) =>
    api(`/catalog/types/categories/${categoryId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Tag Translations
  getTagTranslations: (tagId: string) =>
    api<TagTranslation[]>(`/catalog/types/tags/${tagId}/translations`),
  
  upsertTagTranslation: (tagId: string, data: UpsertTranslationData) =>
    api<TagTranslation>(`/catalog/types/tags/${tagId}/translations`, { method: 'PUT', body: data }),
  
  deleteTagTranslation: (tagId: string, languageCode: string) =>
    api(`/catalog/types/tags/${tagId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Tour Translations
  getTourTranslations: (tourId: string) =>
    api<TourTranslation[]>(`/catalog/tours/${tourId}/translations`),
  
  upsertTourTranslation: (tourId: string, data: TourTranslation) =>
    api<TourTranslation>(`/catalog/tours/${tourId}/translations`, { method: 'POST', body: data }),

  deleteTourTranslation: (tourId: string, languageCode: string) =>
    api(`/catalog/tours/${tourId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Tour Option Translations
  getTourOptionTranslations: (optionId: string) =>
    api<TourOptionTranslation[]>(`/catalog/tour-options/${optionId}/translations`),
  
  upsertTourOptionTranslation: (optionId: string, data: { languageCode: string; title: string; description?: string }) =>
    api<TourOptionTranslation>(`/catalog/tour-options/${optionId}/translations`, { method: 'POST', body: data }),
  
  deleteTourOptionTranslation: (optionId: string, languageCode: string) =>
    api(`/catalog/tour-options/${optionId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Tour Categories & Tags
  setTourCategories: (tourId: string, categoryIds: string[]) =>
    api(`/catalog/tours/${tourId}/categories`, { method: 'PATCH', body: { categoryIds } }),

  setTourTags: (tourId: string, tagIds: string[]) =>
    api(`/catalog/tours/${tourId}/tags`, { method: 'PATCH', body: { tagIds } }),

  // Tour Options
  createTourOption: (tourId: string, data: CreateTourOptionData) =>
    api<TourOption>(`/catalog/tours/${tourId}/options`, { method: 'POST', body: data }),

  updateTourOption: (optionId: string, data: UpdateTourOptionData) =>
    api<TourOption>(`/catalog/tour-options/${optionId}`, { method: 'PATCH', body: data }),

  // Departure Slots
  listDepartureSlots: (optionId: string) =>
    api<DepartureSlot[]>(`/catalog/tour-options/${optionId}/departures`),

  bulkGenerateDepartures: (optionId: string, data: BulkGenerateDeparturesData) =>
    api<{ created: number; skipped: number }>(`/catalog/tour-options/${optionId}/departures/generate`, { method: 'POST', body: data }),

  createDepartureSlot: (optionId: string, data: CreateDepartureSlotData) =>
    api<DepartureSlot>(`/catalog/tour-options/${optionId}/departures`, { method: 'POST', body: data }),

  updateDepartureSlot: (departureId: string, data: UpdateDepartureSlotData) =>
    api<DepartureSlot>(`/catalog/departures/${departureId}`, { method: 'PATCH', body: data }),

  deleteDepartureSlot: (departureId: string) =>
    api(`/catalog/departures/${departureId}`, { method: 'DELETE' }),

  // Tour Media
  addTourMedia: (tourId: string, data: CreateTourMediaData) =>
    api(`/catalog/tours/${tourId}/media`, { method: 'POST', body: data }),

  updateTourMedia: (mediaId: string, data: UpdateTourMediaData) =>
    api(`/catalog/tour-media/${mediaId}`, { method: 'PATCH', body: data }),

  deleteTourMedia: (mediaId: string) =>
    api(`/catalog/tour-media/${mediaId}`, { method: 'DELETE' }),

  // Tour Itinerary
  getTourItinerary: (tourId: string) =>
    api<TourItineraryStop[]>(`/catalog/tours/${tourId}/itinerary`),

  createItineraryStop: (tourId: string, data: { stopOrder: number; title: string; description?: string; durationMinutes?: number; transportMode?: string; transportDurationMinutes?: number; latitude?: number; longitude?: number }) =>
    api<TourItineraryStop>(`/catalog/tours/${tourId}/itinerary`, { method: 'POST', body: data }),

  updateItineraryStop: (stopId: string, data: { stopOrder?: number; title?: string; description?: string; durationMinutes?: number; transportMode?: string; transportDurationMinutes?: number }) =>
    api<TourItineraryStop>(`/catalog/itinerary-stops/${stopId}`, { method: 'PATCH', body: data }),

  deleteItineraryStop: (stopId: string) =>
    api(`/catalog/itinerary-stops/${stopId}`, { method: 'DELETE' }),

  // Tour Search (public)
  searchTours: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<{ page: number; pageSize: number; total: number; totalPages: number; items: Tour[] }>(`/catalog/tours/search${query}`);
  },
};

// Cart APIs
export const cartApi = {
  getMyCart: () => api<CartData | null>('/cart'),

  addItem: (data: { departureSlotId: string; quantity: number; currencyCode: string; languageCode?: string; travelerMix?: Array<Record<string, unknown>> }) =>
    api<CartData>('/cart/items', { method: 'POST', body: data }),

  updateItem: (itemId: string, data: { quantity: number }) =>
    api<CartData>(`/cart/items/${itemId}`, { method: 'PATCH', body: data }),

  removeItem: (itemId: string) =>
    api<void>(`/cart/items/${itemId}`, { method: 'DELETE' }),

  clearCart: () =>
    api<void>('/cart/items', { method: 'DELETE' }),

  checkout: (data: { promotionCode?: string }) =>
    api<unknown>('/cart/checkout', { method: 'POST', body: data }),

  guestCheckout: (data: {
    items: Array<{ departureSlotId: string; quantity: number; languageCode?: string; travelerMix?: Array<Record<string, unknown>> }>;
    currencyCode: string;
    contactEmail: string;
    contactPhoneE164?: string;
    notes?: string;
  }) => api<unknown>('/cart/guest-checkout', { method: 'POST', body: data }),
};

// Bookings APIs
export const bookingsApi = {
  listBookings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Booking>>(`/bookings/me${query}`);
  },

  listSupplierBookings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Booking>>(`/bookings/supplier${query}`);
  },

  listAllBookings: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Booking>>(`/bookings/admin${query}`);
  },
  
  getBookingById: (id: string) => api<Booking>(`/bookings/${id}`),

  getGuestBookingById: (id: string) => api<Booking>(`/bookings/guest/${id}`),

  cancelBooking: (id: string, reason?: string) =>
    api(`/bookings/${id}/cancel`, { method: 'POST', body: { reason } }),
};

// Reviews APIs (public + authenticated)
export interface ReviewListResponse {
  data: Review[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    averageRating: number;
    averageRatingGuide: number | null;
    averageRatingTransport: number | null;
    averageRatingValue: number | null;
    publishedCount: number;
  };
}

export const reviewsApi = {
  listMyReviews: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Review & { tour?: { id: string; slug: string } }>>(`/reviews/me${query}`);
  },

  listTourReviews: (tourId: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<ReviewListResponse>(`/reviews/tours/${tourId}${query}`);
  },

  createReview: (data: { tourId: string; bookingId?: string; rating: number; ratingGuide?: number; ratingTransport?: number; ratingValue?: number; title?: string; body?: string }) =>
    api<Review>('/reviews', { method: 'POST', body: data }),

  updateReview: (id: string, data: { rating?: number; ratingGuide?: number; ratingTransport?: number; ratingValue?: number; title?: string; body?: string }) =>
    api<Review>(`/reviews/${id}`, { method: 'PATCH', body: data }),

  deleteReview: (id: string) =>
    api(`/reviews/${id}`, { method: 'DELETE' }),

  voteHelpful: (id: string, isHelpful: boolean) =>
    api<Review>(`/reviews/${id}/vote`, { method: 'POST', body: { isHelpful } }),

  reportReview: (id: string, data: { reason: string; details?: string }) =>
    api(`/reviews/${id}/report`, { method: 'POST', body: data }),

  // Admin methods
  listReviews: (tourId: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Review>>(`/reviews/tours/${tourId}${query}`);
  },

  moderateReview: (id: string, status: ReviewStatus) =>
    api(`/reviews/${id}/moderate`, { method: 'PATCH', body: { status } }),

  // Review reports (admin)
  listPendingReports: () =>
    api<ReviewReport[]>('/reviews/reports/pending'),

  resolveReport: (id: string, action: 'DISMISS' | 'HIDE_REVIEW' | 'REJECT_REVIEW') =>
    api(`/reviews/reports/${id}/resolve`, { method: 'PATCH', body: { action } }),
};

// Payments APIs
export interface PaymentOption {
  method: string;
  label: string;
  enabled: boolean;
}

export interface PaymentInitResult {
  paymentUrl: string;
  transactionRef?: string;
}

export const paymentsApi = {
  getOptions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaymentOption[]>(`/payments/options${query}`);
  },

  initiateVnpay: (data: { bookingId: string; returnUrl?: string; locale?: string }) =>
    api<PaymentInitResult>('/payments/vnpay/create', { method: 'POST', body: data }),

  initiateMomo: (data: { bookingId: string; returnUrl?: string; locale?: string }) =>
    api<PaymentInitResult>('/payments/momo/create', { method: 'POST', body: data }),

  /* Admin */
  getSettings: () => api<PaymentSettings>('/payments/admin/settings'),

  updateSettings: (data: PaymentSettings) =>
    api<PaymentSettings>('/payments/admin/settings', { method: 'PUT', body: data }),
};

// Promotions APIs
export const promotionsApi = {
  listPromotions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Promotion>>(`/promotions/admin${query}`);
  },
  
  getPromotionById: (id: string) => api<Promotion>(`/promotions/admin/${id}`),
  
  createPromotion: (data: CreatePromotionData) =>
    api<Promotion>('/promotions/admin', { method: 'POST', body: data }),
  
  updatePromotion: (id: string, data: UpdatePromotionData) =>
    api<Promotion>(`/promotions/admin/${id}`, { method: 'PATCH', body: data }),
};

// Blog Public APIs
export const blogPublicApi = {
  listPosts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogPost>>(`/blog/posts${query}`);
  },

  getPostBySlug: (slug: string) => api<BlogPost>(`/blog/posts/${slug}`),

  listCategories: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogCategory>>(`/blog/categories${query}`);
  },

  listTags: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogTag>>(`/blog/tags${query}`);
  },
};

// Blog Admin APIs
export const blogApi = {
  listPosts: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogPost>>(`/blog/admin/posts${query}`);
  },
  
  getPostById: (id: string) => api<BlogPost>(`/blog/admin/posts/${id}`),
  
  createPost: (data: CreateBlogPostData) =>
    api<BlogPost>('/blog/admin/posts', { method: 'POST', body: data }),
  
  updatePost: (id: string, data: UpdateBlogPostData) =>
    api<BlogPost>(`/blog/admin/posts/${id}`, { method: 'PATCH', body: data }),

  deletePost: (id: string) =>
    api<void>(`/blog/admin/posts/${id}`, { method: 'DELETE' }),
  
  listCategories: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogCategory>>(`/blog/categories${query}`);
  },
  
  createCategory: (data: { name: string; slug: string }) =>
    api<BlogCategory>('/blog/admin/categories', { method: 'POST', body: data }),
  
  updateCategory: (id: string, data: { name?: string; slug?: string; isActive?: boolean }) =>
    api<BlogCategory>(`/blog/admin/categories/${id}`, { method: 'PATCH', body: data }),

  // Blog Category Translations
  getCategoryTranslations: (categoryId: string) =>
    api<BlogCategoryTranslation[]>(`/blog/categories/${categoryId}/translations`),
  
  upsertCategoryTranslation: (categoryId: string, data: UpsertTranslationData) =>
    api<BlogCategoryTranslation>(`/blog/admin/categories/${categoryId}/translations`, { method: 'POST', body: data }),
  
  deleteCategoryTranslation: (categoryId: string, languageCode: string) =>
    api(`/blog/admin/categories/${categoryId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Blog Tags
  listTags: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<BlogTag>>(`/blog/tags${query}`);
  },

  // Blog Tag Translations
  getTagTranslations: (tagId: string) =>
    api<BlogTagTranslation[]>(`/blog/tags/${tagId}/translations`),
  
  upsertTagTranslation: (tagId: string, data: UpsertTranslationData) =>
    api<BlogTagTranslation>(`/blog/admin/tags/${tagId}/translations`, { method: 'POST', body: data }),
  
  deleteTagTranslation: (tagId: string, languageCode: string) =>
    api(`/blog/admin/tags/${tagId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Blog Post Translations
  getPostTranslations: (postId: string) =>
    api<BlogPostTranslation[]>(`/blog/admin/posts/${postId}/translations`),
  
  upsertPostTranslation: (postId: string, data: UpsertBlogPostTranslationData) =>
    api<BlogPostTranslation>(`/blog/admin/posts/${postId}/translations`, { method: 'POST', body: data }),
  
  deletePostTranslation: (postId: string, languageCode: string) =>
    api(`/blog/admin/posts/${postId}/translations/${languageCode}`, { method: 'DELETE' }),
};

// Notifications APIs
export const notificationsApi = {
  /* ── User-facing ── */
  listMyNotifications: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Notification>>(`/notifications/me${query}`);
  },

  /* ── Admin ── */
  listNotifications: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Notification>>(`/notifications/admin${query}`);
  },
  
  sendNotification: (data: SendNotificationData) =>
    api('/notifications/admin/send', { method: 'POST', body: data }),
  
  listTemplates: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<NotificationTemplate>>(`/notifications/admin/templates${query}`);
  },
  
  createTemplate: (data: CreateNotificationTemplateData) =>
    api<NotificationTemplate>('/notifications/admin/templates', { method: 'POST', body: data }),
  
  updateTemplate: (id: string, data: UpdateNotificationTemplateData) =>
    api<NotificationTemplate>(`/notifications/admin/templates/${id}`, { method: 'PATCH', body: data }),
};

// Audit Logs APIs
export const auditLogsApi = {
  listLogs: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<AuditLog>>(`/audit-logs/admin${query}`);
  },
  
  getLogById: (id: string) => api<AuditLog>(`/audit-logs/${id}`),
};

// Uploads API
export interface PresignedUploadResponse {
  uploadUrl: string;
  expiresIn: number;
  key: string;
  cdnUrl: string;
}

export interface CreatePresignedUploadData {
  fileName: string;
  contentType: string;
  folder?: 'tour-media' | 'blog-media' | 'avatar' | 'reference-data';
}

export const uploadsApi = {
  createPresignedUpload: (data: CreatePresignedUploadData) =>
    api<PresignedUploadResponse>('/uploads/presign', { method: 'POST', body: data }),

  /** Utility: get presigned URL, PUT the file, return the CDN url */
  uploadFile: async (file: File, folder: CreatePresignedUploadData['folder'] = 'reference-data'): Promise<string> => {
    const { uploadUrl, cdnUrl } = await uploadsApi.createPresignedUpload({
      fileName: file.name,
      contentType: file.type,
      folder,
    });
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    });
    return cdnUrl;
  },
};

// Reference Data APIs
export const referenceDataApi = {
  listCountries: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Country>>(`/reference-data/countries${query}`);
  },

  listCities: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<City>>(`/reference-data/cities${query}`);
  },

  listLanguages: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Language>>(`/reference-data/languages${query}`);
  },

  listCurrencies: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Currency>>(`/reference-data/currencies${query}`);
  },

  createCountry: (data: CreateCountryData) =>
    api<Country>('/reference-data/countries', { method: 'POST', body: data }),

  updateCountry: (id: string, data: UpdateCountryData) =>
    api<Country>(`/reference-data/countries/${id}`, { method: 'PATCH', body: data }),

  deleteCountry: (id: string) =>
    api(`/reference-data/countries/${id}`, { method: 'DELETE' }),

  createCity: (data: CreateCityData) =>
    api<City>('/reference-data/cities', { method: 'POST', body: data }),

  updateCity: (id: string, data: UpdateCityData) =>
    api<City>(`/reference-data/cities/${id}`, { method: 'PATCH', body: data }),

  deleteCity: (id: string) =>
    api(`/reference-data/cities/${id}`, { method: 'DELETE' }),

  // Country Translations
  getCountryTranslations: (countryId: string) =>
    api<CountryTranslation[]>(`/reference-data/countries/${countryId}/translations`),
  
  upsertCountryTranslation: (countryId: string, data: UpsertTranslationData) =>
    api<CountryTranslation>(`/reference-data/countries/${countryId}/translations`, { method: 'POST', body: data }),
  
  deleteCountryTranslation: (countryId: string, languageCode: string) =>
    api(`/reference-data/countries/${countryId}/translations/${languageCode}`, { method: 'DELETE' }),

  // City Translations
  getCityTranslations: (cityId: string) =>
    api<CityTranslation[]>(`/reference-data/cities/${cityId}/translations`),
  
  upsertCityTranslation: (cityId: string, data: UpsertTranslationData) =>
    api<CityTranslation>(`/reference-data/cities/${cityId}/translations`, { method: 'POST', body: data }),
  
  deleteCityTranslation: (cityId: string, languageCode: string) =>
    api(`/reference-data/cities/${cityId}/translations/${languageCode}`, { method: 'DELETE' }),

  // FAQ Categories
  listFaqCategories: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<FaqCategory>>(`/reference-data/faq-categories${query}`);
  },

  createFaqCategory: (data: CreateFaqCategoryData) =>
    api<FaqCategory>('/reference-data/faq-categories', { method: 'POST', body: data }),

  updateFaqCategory: (id: string, data: UpdateFaqCategoryData) =>
    api<FaqCategory>(`/reference-data/faq-categories/${id}`, { method: 'PATCH', body: data }),

  deleteFaqCategory: (id: string) =>
    api(`/reference-data/faq-categories/${id}`, { method: 'DELETE' }),

  // FAQ Items
  listFaqItems: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<FaqItem>>(`/reference-data/faq-items${query}`);
  },

  createFaqItem: (data: CreateFaqItemData) =>
    api<FaqItem>('/reference-data/faq-items', { method: 'POST', body: data }),

  updateFaqItem: (id: string, data: UpdateFaqItemData) =>
    api<FaqItem>(`/reference-data/faq-items/${id}`, { method: 'PATCH', body: data }),

  deleteFaqItem: (id: string) =>
    api(`/reference-data/faq-items/${id}`, { method: 'DELETE' }),

  // Language CRUD
  createLanguage: (data: CreateLanguageData) =>
    api<Language>('/reference-data/languages', { method: 'POST', body: data }),

  updateLanguage: (code: string, data: UpdateLanguageData) =>
    api<Language>(`/reference-data/languages/${code}`, { method: 'PATCH', body: data }),

  deleteLanguage: (code: string) =>
    api(`/reference-data/languages/${code}`, { method: 'DELETE' }),

  // Currency CRUD
  createCurrency: (data: CreateCurrencyData) =>
    api<Currency>('/reference-data/currencies', { method: 'POST', body: data }),

  updateCurrency: (code: string, data: UpdateCurrencyData) =>
    api<Currency>(`/reference-data/currencies/${code}`, { method: 'PATCH', body: data }),

  deleteCurrency: (code: string) =>
    api(`/reference-data/currencies/${code}`, { method: 'DELETE' }),

  // FAQ Category Translations
  getFaqCategoryTranslations: (categoryId: string) =>
    api<FaqCategoryTranslation[]>(`/reference-data/faq-categories/${categoryId}/translations`),
  
  upsertFaqCategoryTranslation: (categoryId: string, data: UpsertTranslationData) =>
    api<FaqCategoryTranslation>(`/reference-data/faq-categories/${categoryId}/translations`, { method: 'POST', body: data }),
  
  deleteFaqCategoryTranslation: (categoryId: string, languageCode: string) =>
    api(`/reference-data/faq-categories/${categoryId}/translations/${languageCode}`, { method: 'DELETE' }),

  // FAQ Item Translations
  getFaqItemTranslations: (itemId: string) =>
    api<FaqItemTranslation[]>(`/reference-data/faq-items/${itemId}/translations`),
  
  upsertFaqItemTranslation: (itemId: string, data: UpsertFaqItemTranslationData) =>
    api<FaqItemTranslation>(`/reference-data/faq-items/${itemId}/translations`, { method: 'POST', body: data }),
  
  deleteFaqItemTranslation: (itemId: string, languageCode: string) =>
    api(`/reference-data/faq-items/${itemId}/translations/${languageCode}`, { method: 'DELETE' }),

  // Exchange Rates
  listExchangeRates: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<ExchangeRate>>(`/reference-data/exchange-rates${query}`);
  },

  createExchangeRate: (data: CreateExchangeRateData) =>
    api<ExchangeRate>('/reference-data/exchange-rates', { method: 'POST', body: data }),

  deleteExchangeRate: (id: string) =>
    api(`/reference-data/exchange-rates/${id}`, { method: 'DELETE' }),
};

// API Keys APIs
export const apiKeysApi = {
  listApiKeys: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<ApiKey>>(`/api-keys${query}`);
  },

  getApiKeyById: (id: string) => api<ApiKey>(`/api-keys/${id}`),

  createApiKey: (data: CreateApiKeyData) =>
    api<ApiKey>('/api-keys', { method: 'POST', body: data }),

  updateApiKey: (id: string, data: UpdateApiKeyData) =>
    api<ApiKey>(`/api-keys/${id}`, { method: 'PATCH', body: data }),

  revokeApiKey: (id: string) =>
    api(`/api-keys/${id}/revoke`, { method: 'POST' }),
};

// Messages / Conversations APIs
export const messagesApi = {
  listConversations: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Conversation>>(`/messages/conversations${query}`);
  },

  getConversationById: (id: string) =>
    api<Conversation>(`/messages/conversations/${id}`),

  createConversation: (data: { type: string; subject?: string; participantUserIds?: string[]; supplierId?: string; bookingId?: string }) =>
    api<Conversation>('/messages/conversations', { method: 'POST', body: data }),

  updateConversationStatus: (id: string, status: string) =>
    api(`/messages/conversations/${id}/status`, { method: 'PATCH', body: { status } }),

  listMessages: (conversationId: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<Message>>(`/messages/conversations/${conversationId}/messages${query}`);
  },

  sendMessage: (conversationId: string, data: { body: string; messageType?: string }) =>
    api<Message>(`/messages/conversations/${conversationId}/messages`, { method: 'POST', body: data }),

  markConversationRead: (id: string) =>
    api(`/messages/conversations/${id}/read`, { method: 'POST' }),

  getUnreadSummary: () =>
    api<{ totalUnread: number }>('/messages/conversations/unread-summary'),
};

// Newsletter APIs (public)
export const newsletterApi = {
  subscribe: (email: string) =>
    api<{ message: string; subscriptionId?: string }>('/newsletter/subscribe', { method: 'POST', body: { email } }),
  unsubscribe: (email: string) =>
    api<{ message: string }>('/newsletter/unsubscribe', { method: 'POST', body: { email } }),
};

// Favorites APIs
export const favoritesApi = {
  listMyFavorites: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return api<PaginatedResponse<{ userId: string; tourId: string; createdAt: string; tour?: Tour }>>(`/favorites/tours${query}`);
  },

  addFavorite: (tourId: string) =>
    api(`/favorites/tours/${tourId}`, { method: 'POST' }),

  removeFavorite: (tourId: string) =>
    api(`/favorites/tours/${tourId}`, { method: 'DELETE' }),
};

// Profile APIs
export const profileApi = {
  getProfile: () => api<User>('/auth/me'),

  updateProfile: (data: UpdateProfileData) =>
    api<User>('/auth/profile', { method: 'PATCH', body: data }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api<void>('/auth/change-password', { method: 'POST', body: data }),
};

// Types
export type UserRole = 'CUSTOMER' | 'SUPPLIER_ADMIN' | 'SUPPLIER_STAFF' | 'OPERATOR' | 'ADMIN';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type TourStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'ARCHIVED';
export type BookingStatus = 'INITIATED' | 'PENDING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'CANCELLED_BY_CUSTOMER' | 'CANCELLED_BY_OPERATOR' | 'EXPIRED' | 'REFUNDED_PARTIAL' | 'REFUNDED_FULL';
export type ReviewStatus = 'PENDING' | 'PUBLISHED' | 'HIDDEN' | 'REJECTED';
export type BlogPostStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';
export type PromoType = 'PERCENT' | 'FIXED_AMOUNT';
export type PromoScope = 'GLOBAL' | 'SUPPLIER' | 'TOUR' | 'OPTION';

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneE164?: string;
  countryId?: string;
  displayCountry?: string;
  status: UserStatus;
  roles: (UserRole | { role: UserRole })[];
  emailVerifiedAt?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type SupplierStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED';

export interface SupplierMembership {
  id: string;
  legalName: string;
  displayName: string;
  slug: string;
  status: SupplierStatus;
  role: UserRole;
}

export interface TourOption {
  id: string;
  tourId: string;
  code?: string;
  title: string;
  name?: string;
  description?: string;
  isDefault?: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  durationMinutes?: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface Tour {
  id: string;
  supplierId: string;
  cityId: string;
  slug: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  meetingPoint?: string;
  latitude?: number;
  longitude?: number;
  status: TourStatus;
  durationMinutes?: number;
  maxGroupSize?: number;
  ratingAvg?: number;
  ratingCount: number;
  ratingGuideAvg?: number;
  ratingTransportAvg?: number;
  ratingValueAvg?: number;
  bookingCount: number;
  whatToBring?: string[];
  importantInfo?: string[];
  availableLanguages?: string[];
  isFeatured?: boolean;
  badgeText?: string;
  allowPayLater?: boolean;
  defaultLanguageCode?: string;
  highlights?: string[];
  includedItems?: string[];
  excludedItems?: string[];
  cancellationPolicy?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  // Joined relations from getTourById
  categories?: { tourId: string; categoryId: string }[];
  tags?: { tourId: string; tagId: string }[];
  media?: TourMedia[];
  itinerary?: TourItineraryStop[];
  options?: TourOptionDetail[];
}

export interface TourMedia {
  id: string;
  tourId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url: string;
  altText?: string;
  sortOrder: number;
  isCover: boolean;
  createdAt: string;
}

export interface TourItineraryStop {
  id: string;
  tourId: string;
  stopOrder: number;
  title: string;
  description?: string;
  durationMinutes?: number;
  transportMode?: string;
  transportDurationMinutes?: number;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TourOptionDetail extends TourOption {
  departures?: DepartureSlot[];
  pricingRules?: PricingRule[];
}

export interface DepartureSlot {
  id: string;
  tourOptionId: string;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  status: string;
  inventory?: InventorySlot | null;
}

export interface InventorySlot {
  id: string;
  departureSlotId: string;
  totalCapacity: number;
  heldCapacity: number;
  bookedCapacity: number;
}

export interface PricingRule {
  id: string;
  tourOptionId: string;
  componentType: string;
  travelerType: string;
  currencyCode: string;
  amount: number;
  validFrom: string;
  validTo?: string;
  daysOfWeek?: number[];
  minQuantity: number;
}

export interface Category {
  id: string;
  parentId?: string;
  slug: string;
  name: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Tag {
  id: string;
  slug: string;
  name: string;
}

export interface BookingItem {
  id: string;
  bookingId: string;
  tourId: string;
  tourOptionId: string;
  departureSlotId: string;
  titleSnapshot: string;
  optionSnapshot?: string;
  startsAtSnapshot: string;
  languageCode?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  userId?: string;
  supplierId?: string;
  status: BookingStatus;
  currencyCode: string;
  subtotalAmount?: number;
  discountAmount?: number;
  feeAmount?: number;
  taxAmount?: number;
  totalAmount: number;
  contactEmail?: string;
  contactPhoneE164?: string;
  notes?: string;
  cancellationReason?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  createdAt: string;
  items?: BookingItem[];
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface CartItem {
  id: string;
  cartId: string;
  departureSlotId: string;
  optionId: string;
  optionTitle: string;
  tourId: string;
  tourTitle: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  currencyCode: string;
  startsAt: string;
  addedAt: string;
  languageCode?: string;
}

export interface CartData {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  items: CartItem[];
}

export interface GatewayConfig {
  enabled: boolean;
  displayName: string;
  domesticOnly: boolean;
  countries: string[];
  currencies: string[];
  channels: string[];
}

export interface PaymentSettings {
  mode: 'sandbox' | 'live';
  gateways: Record<string, GatewayConfig>;
}

export interface Promotion {
  id: string;
  code: string;
  name: string;
  promoType: PromoType;
  promoScope: PromoScope;
  value: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimitTotal?: number;
  usageLimitPerUser?: number;
  startsAt: string;
  endsAt?: string;
  isActive: boolean;
}

export interface BlogPost {
  id: string;
  authorUserId?: string;
  categoryId?: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  status: BlogPostStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  readTimeMinutes?: number;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
}

export interface BlogCategory {
  id: string;
  parentId?: string;
  slug: string;
  name: string;
  isActive: boolean;
}

export interface Review {
  id: string;
  tourId: string;
  userId?: string;
  rating: number;
  ratingGuide?: number;
  ratingTransport?: number;
  ratingValue?: number;
  title?: string;
  body?: string;
  status: ReviewStatus;
  verifiedBooking: boolean;
  helpfulCount: number;
  createdAt: string;
  // Enriched by frontend
  user?: { firstName?: string; lastName?: string; displayCountry?: string };
}

export interface ReviewReport {
  id: string;
  reviewId: string;
  userId: string;
  reason: string;
  details?: string;
  status: 'PENDING' | 'RESOLVED';
  resolvedAction?: string;
  resolvedAt?: string;
  createdAt: string;
  review?: Review;
  user?: { firstName?: string; lastName?: string };
}

export interface Notification {
  id: string;
  userId?: string;
  channel: string;
  recipient: string;
  eventKey: string;
  status: string;
  sentAt?: string;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  eventKey: string;
  channel: string;
  languageCode?: string;
  subject?: string;
  body: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  actorUserId?: string;
  actorRole?: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// Reference Data Types
export interface Country {
  id: string;
  iso2: string;
  iso3: string;
  name: string;
  currencyCode: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  normalizedName: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface Currency {
  code: string;
  name: string;
  symbol?: string;
  decimals: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Create/Update Types
export interface CreateUserData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  roles?: UserRole[];
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phoneE164?: string;
  roles?: UserRole[];
}

export interface CreateTourData {
  supplierId: string;
  cityId: string;
  slug: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  meetingPoint?: string;
  durationMinutes?: number;
  maxGroupSize?: number;
  inventoryMode?: 'SHARED' | 'PER_OPTION' | 'PER_DEPARTURE';
  status?: TourStatus;
  whatToBring?: string[];
  importantInfo?: string[];
  availableLanguages?: string[];
  isFeatured?: boolean;
  badgeText?: string;
  allowPayLater?: boolean;
  defaultLanguageCode?: string;
  cancellationPolicy?: Record<string, unknown>;
}

export interface UpdateTourData {
  cityId?: string;
  slug?: string;
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  meetingPoint?: string;
  durationMinutes?: number;
  maxGroupSize?: number;
  inventoryMode?: 'SHARED' | 'PER_OPTION' | 'PER_DEPARTURE';
  status?: TourStatus;
  whatToBring?: string[];
  importantInfo?: string[];
  availableLanguages?: string[];
  isFeatured?: boolean;
  badgeText?: string;
  allowPayLater?: boolean;
  defaultLanguageCode?: string;
  cancellationPolicy?: Record<string, unknown>;
}

// Tour Option Types
export interface CreateTourOptionData {
  code: string;
  title: string;
  description?: string;
  isDefault?: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  durationMinutes?: number;
  isActive?: boolean;
}

export interface UpdateTourOptionData {
  code?: string;
  title?: string;
  description?: string;
  isDefault?: boolean;
  minParticipants?: number;
  maxParticipants?: number;
  durationMinutes?: number;
  isActive?: boolean;
}

// Tour Media Types
export interface CreateTourMediaData {
  url: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  altText?: string;
  sortOrder?: number;
  isCover?: boolean;
}

export interface UpdateTourMediaData {
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  url?: string;
  altText?: string;
  sortOrder?: number;
  isCover?: boolean;
}

// Departure Slot Types
export interface BulkGenerateDeparturesData {
  startDate: string;
  endDate: string;
  times: string[];
  totalCapacity: number;
  durationMinutes?: number;
}

export interface CreateDepartureSlotData {
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  status?: string;
  totalCapacity: number;
  oversellLimit?: number;
}

export interface UpdateDepartureSlotData {
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
  status?: string;
  totalCapacity?: number;
  oversellLimit?: number;
}

// Tour Translation Types
export interface UpsertTourTranslationData {
  languageCode: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
}

export interface CreatePromotionData {
  code: string;
  name: string;
  promoType: PromoType;
  promoScope: PromoScope;
  value: number;
  startsAt: string;
  endsAt?: string;
}

export interface UpdatePromotionData {
  name?: string;
  value?: number;
  isActive?: boolean;
  endsAt?: string;
}

export interface CreateBlogPostData {
  slug: string;
  title: string;
  content: string;
  excerpt?: string;
  categoryId?: string;
  coverImageUrl?: string;
  status?: BlogPostStatus;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  readTimeMinutes?: number;
  publishedAt?: string;
}

export interface UpdateBlogPostData {
  slug?: string;
  title?: string;
  content?: string;
  excerpt?: string;
  categoryId?: string;
  coverImageUrl?: string;
  status?: BlogPostStatus;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  canonicalUrl?: string;
  noindex?: boolean;
  readTimeMinutes?: number;
  publishedAt?: string;
}

export interface SendNotificationData {
  userId?: string;
  channel: string;
  recipient: string;
  eventKey: string;
  payload?: Record<string, unknown>;
}

export interface CreateNotificationTemplateData {
  eventKey: string;
  channel: string;
  languageCode?: string;
  subject?: string;
  body: string;
}

export interface UpdateNotificationTemplateData {
  subject?: string;
  body?: string;
  isActive?: boolean;
}

// Reference Data Create/Update Types
export interface CreateCountryData {
  iso2: string;
  iso3: string;
  name: string;
  currencyCode: string;
  imageUrl?: string;
}

export interface UpdateCountryData {
  iso2?: string;
  iso3?: string;
  name?: string;
  currencyCode?: string;
  imageUrl?: string;
}

export interface CreateCityData {
  countryId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  imageUrl?: string;
}

export interface UpdateCityData {
  countryId?: string;
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  imageUrl?: string;
}

export interface CreateLanguageData {
  code: string;
  name: string;
}

export interface UpdateLanguageData {
  code?: string;
  name?: string;
}

export interface CreateCurrencyData {
  code: string;
  name: string;
  symbol?: string;
  decimals?: number;
}

export interface UpdateCurrencyData {
  code?: string;
  name?: string;
  symbol?: string;
  decimals?: number;
}

export interface CreateFaqCategoryData {
  slug: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFaqCategoryData {
  slug?: string;
  name?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateFaqItemData {
  categoryId?: string;
  slug: string;
  question: string;
  answer: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface UpdateFaqItemData {
  categoryId?: string;
  slug?: string;
  question?: string;
  answer?: string;
  sortOrder?: number;
  isActive?: boolean;
}

// Translation Types
export interface Translation {
  languageCode: string;
  name?: string;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryTranslation extends Translation {
  categoryId: string;
  name: string;
  description?: string;
}

export interface TagTranslation extends Translation {
  tagId: string;
  name: string;
}

export interface TourTranslation {
  tourId: string;
  languageCode: string;
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  includedItems?: string[];
  excludedItems?: string[];
  highlights?: string[];
  whatToBring?: string[];
  importantInfo?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface TourOptionTranslation {
  tourOptionId: string;
  languageCode: string;
  title: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BlogCategoryTranslation extends Translation {
  categoryId: string;
  name: string;
  description?: string;
}

export interface BlogTagTranslation extends Translation {
  tagId: string;
  name: string;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPostTranslation {
  postId: string;
  languageCode: string;
  title: string;
  excerpt?: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertBlogPostTranslationData {
  languageCode: string;
  title: string;
  excerpt?: string;
  content: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface CountryTranslation {
  countryId: string;
  languageCode: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CityTranslation {
  cityId: string;
  languageCode: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqCategory {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  categoryId?: string;
  slug: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaqCategoryTranslation {
  categoryId: string;
  languageCode: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaqItemTranslation {
  itemId: string;
  languageCode: string;
  question: string;
  answer: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertFaqItemTranslationData {
  languageCode: string;
  question: string;
  answer: string;
}

export interface UpsertTranslationData {
  languageCode: string;
  name?: string;
  title?: string;
  description?: string;
}

// Exchange Rate Types
export interface ExchangeRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  effectiveAt: string;
  createdAt: string;
}

export interface CreateExchangeRateData {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  effectiveAt: string;
}

// API Key Types
export interface ApiKey {
  id: string;
  ownerType: string;
  ownerId: string;
  keyPrefix: string;
  name: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt?: string;
  expiresAt?: string;
  createdAt: string;
  rawKey?: string; // Only returned on creation
}

export interface CreateApiKeyData {
  ownerType: string;
  ownerId: string;
  name: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface UpdateApiKeyData {
  name?: string;
  scopes?: string[];
  isActive?: boolean;
}

// Conversation / Message Types
export type ConversationStatus = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED' | 'SPAM';
export type ConversationType = 'SUPPORT' | 'BOOKING' | 'SUPPLIER_CUSTOMER' | 'SYSTEM';

export interface Conversation {
  id: string;
  type: ConversationType;
  status: ConversationStatus;
  subject?: string;
  createdByUserId?: string;
  supplierId?: string;
  bookingId?: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
  participants?: ConversationParticipant[];
  _count?: { messages: number };
}

export interface ConversationParticipant {
  conversationId: string;
  userId: string;
  participantRole?: string;
  joinedAt: string;
  lastReadAt?: string;
  muted: boolean;
  user?: { firstName?: string; lastName?: string; email?: string };
}

export interface Message {
  id: string;
  conversationId: string;
  senderUserId?: string;
  messageType: 'TEXT' | 'SYSTEM' | 'IMAGE' | 'FILE';
  body?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  editedAt?: string;
  deletedAt?: string;
  sender?: { firstName?: string; lastName?: string; email?: string };
}

// Profile Update Types
export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  phoneE164?: string;
  countryId?: string;
}
