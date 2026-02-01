// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export type UserRole = 'customer' | 'admin' | 'driver' | 'cashier' | 'tailor' | 'investor';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// PRODUCT TYPES
// ============================================================================

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  cost_per_item: number | null;
  category_id: string | null;
  category?: Category | null;
  images: string[];
  featured_image: string | null;
  sku: string;
  barcode: string | null;
  inventory_count: number;
  track_inventory: boolean;
  low_stock_threshold: number;
  weight: number | null;
  weight_unit: string;
  vendor: string | null;
  tags: string[];
  is_active: boolean;
  is_featured: boolean;
  seo_title: string | null;
  seo_description: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  sku: string;
  price: number;
  compare_at_price: number | null;
  inventory_count: number;
  image_url: string | null;
  options: Record<string, any>;
  is_active: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive?: boolean;
  productCount?: number;
  children?: Category[];
  parent?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// ============================================================================
// ORDER TYPES
// ============================================================================

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'card' | 'cash' | 'mobile_payment';
export type ShippingMethod = 'standard' | 'express' | 'overnight' | 'in_store';

export interface Address {
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface SavedAddress extends Address {
  id: string;
  user_id: string;
  is_default: boolean;
  label: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string | null;
  guest_email: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  shipping_method: ShippingMethod;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  shipping_address: Address | null;
  billing_address: Address | null;
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | null;
  customer_notes: string | null;
  admin_notes: string | null;
  coupon_code: string | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  pickup_deadline?: string | null;
  order_items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variant_id: string | null;
  product_name: string;
  product_sku: string;
  product_image: string | null;
  variant_options: Record<string, any>;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

// ============================================================================
// CART TYPES
// ============================================================================

export interface CartItem {
  id: string;
  user_id: string;
  product_id: string;
  variant_id: string | null;
  quantity: number;
  created_at: string;
  updated_at: string;
  product?: Product;
  variant?: ProductVariant;
}

export interface CartItemService {
  id: string;
  user_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  customer_notes: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

// ============================================================================
// REVIEW TYPES
// ============================================================================

export interface Review {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string | null;
  rating: number;
  title: string;
  content: string;
  images: string[];
  verified_purchase: boolean;
  is_approved: boolean;
  helpful_count: number;
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================================================
// WISHLIST TYPES
// ============================================================================

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
  product?: Product;
}

// ============================================================================
// SHIPPING & TRACKING TYPES
// ============================================================================

export type TrackingStatus =
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface ShippingTracking {
  id: string;
  order_id: string;
  driver_id: string | null;
  status: TrackingStatus;
  current_location: GeoPoint | null;
  pickup_location: GeoPoint | null;
  delivery_location: GeoPoint | null;
  estimated_delivery_time: string | null;
  actual_delivery_time: string | null;
  notes: string | null;
  signature_url: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
  driver?: Driver;
  history?: TrackingHistory[];
}

export interface TrackingHistory {
  id: string;
  tracking_id: string;
  status: TrackingStatus;
  location: string | null;
  notes: string | null;
  recorded_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  photo_url: string | null;
  vehicle_type: string | null;
  vehicle_number: string | null;
  license_number: string | null;
  is_active: boolean;
  is_available: boolean;
  rating: number;
  total_deliveries: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SERVICE TYPES
// ============================================================================

export type ServiceDuration =
  | 'half_hour'
  | 'one_hour'
  | 'two_hours'
  | 'half_day'
  | 'full_day'
  | 'custom';

export type BookingStatus =
  | 'pending'
  | 'quote_pending'
  | 'quote_sent'
  | 'quote_approved'
  | 'quote_rejected'
  | 'awaiting_payment'
  | 'payment_partial'
  | 'confirmed'
  | 'in_progress'
  | 'awaiting_collection'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export type ServiceType = 'onsite' | 'custom_production' | 'collect_repair';
export type CollectionMethod = 'customer_brings' | 'admin_collects';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired';
export type ProgressStatus =
  | 'pending'
  | 'material_ordered'
  | 'material_received'
  | 'in_production'
  | 'quality_check'
  | 'ready_for_collection'
  | 'completed';

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  _count?: {
    services: number;
  };
}

export interface Service {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string;
  category?: ServiceCategory;
  images: string[];
  featured_image: string | null;
  duration: ServiceDuration;
  custom_duration: number | null;
  buffer_time: number;
  max_bookings_per_day: number | null;
  supports_onsite: boolean;
  supports_custom_production: boolean;
  supports_collect_repair: boolean;
  is_active: boolean;
  is_featured: boolean;
  tags: string[];
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface Material {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  stockQuantity: number;
  unit: string;
  specifications: Record<string, any> | null;
  images: string[];
  isActive: boolean;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface ServiceBooking {
  id: string;
  booking_number: string;
  service_id: string;
  user_id: string | null;
  order_id: string | null;
  status: BookingStatus;
  service_type: ServiceType;
  collection_method: CollectionMethod | null;
  scheduled_date: string | null;
  scheduled_time: string | null;
  end_time: string | null;
  duration: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_notes: string | null;
  requirement_photos: string[];
  desired_outcome: string | null;
  admin_notes: string | null;
  price: number;
  final_price: number | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
  quote?: Quote;
  progress_updates?: BookingProgress[];
  payments?: BookingPayment[];
}

export interface Quote {
  id: string;
  booking_id: string;
  material_cost: number;
  labor_cost: number;
  labor_hours: number;
  total_cost: number;
  down_payment_amount: number;
  notes: string | null;
  status: QuoteStatus;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingProgress {
  id: string;
  booking_id: string;
  status: ProgressStatus;
  description: string;
  photos: string[];
  created_by: string;
  created_at: string;
}

export interface BookingPayment {
  id: string;
  booking_id: string;
  amount: number;
  payment_type: 'down_payment' | 'partial_payment' | 'final_payment' | 'refund';
  payment_method: string;
  status: string;
  stripe_payment_id: string | null;
  notes: string | null;
  created_at: string;
}

// ============================================================================
// INVESTOR TYPES
// ============================================================================

export type InvestorStatus = 'pending_verification' | 'active' | 'suspended' | 'exited';
export type KycStatus = 'not_started' | 'pending' | 'approved' | 'rejected';
export type WithdrawalType = 'cash' | 'profit' | 'product' | 'equipment_share';
export type WithdrawalStatus = 'pending' | 'approved' | 'awaiting_investor_confirmation' | 'processing' | 'completed' | 'confirmed' | 'rejected' | 'cancelled' | 'disputed';
export type TransactionType =
  | 'deposit'
  | 'withdrawal_cash'
  | 'withdrawal_profit'
  | 'withdrawal_product'
  | 'withdrawal_equipment'
  | 'allocation_product'
  | 'allocation_equipment'
  | 'profit_credit'
  | 'refund';
export type DepositConfirmationStatus = 'pending_confirmation' | 'confirmed' | 'disputed';

export interface Investor {
  id: string;
  user_id: string;
  investor_number: string;
  full_name: string;
  email: string;
  phone: string;
  id_type: string | null;
  id_number: string | null;
  id_document_url: string | null;
  id_document_back_url: string | null;
  selfie_url: string | null;
  kyc_status: KycStatus;
  kyc_submitted_at: string | null;
  kyc_rejection_reason: string | null;
  is_verified: boolean;
  verified_at: string | null;
  cash_balance: string;
  profit_balance: string;
  total_invested: string;
  total_profit: string;
  total_withdrawn: string;
  agreement_accepted: boolean;
  agreement_accepted_at: string | null;
  status: InvestorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
  deposits?: InvestorDeposit[];
  transactions?: InvestorTransaction[];
  product_allocations?: InvestorProductAllocation[];
  equipment_allocations?: InvestorEquipmentAllocation[];
  profit_distributions?: ProfitDistribution[];
  withdrawal_requests?: WithdrawalRequest[];
}

export interface InvestorDeposit {
  id: string;
  investor_id: string;
  deposit_number: string;
  gross_amount: string;
  admin_fee_percentage: string;
  admin_fee_amount: string;
  net_amount: string;
  charges: string;
  amount: string;
  payment_method: string;
  reference_number: string | null;
  receipt_url: string | null;
  receipt_image: string | null;
  notes: string | null;
  confirmation_status: DepositConfirmationStatus;
  confirmed_at: string | null;
  investor_notes: string | null;
  investor_feedback: string | null;
  deposited_at: string;
  created_at: string;
}

export interface InvestorTransaction {
  id: string;
  investor_id: string;
  type: TransactionType;
  amount: string;
  balance_after: string;
  profit_after: string;
  product_id: string | null;
  equipment_id: string | null;
  withdrawal_id: string | null;
  order_id: string | null;
  description: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface InvestorProductAllocation {
  id: string;
  investor_id: string;
  product_id: string;
  variant_id: string | null;
  amount_allocated: string;
  quantity: number;
  purchase_price: string;
  total_investment: string;
  quantity_sold: number;
  quantity_remaining: number;
  profit_generated: string;
  capital_returned: string;
  notes: string | null;
  allocated_at: string;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
    featured_image: string | null;
    sku: string;
    price: string;
  };
  variant?: {
    name: string;
    sku: string;
    image_url: string | null;
  };
}

export interface Equipment {
  id: string;
  name: string;
  equipment_number: string;
  description: string | null;
  purchase_price: string;
  current_value: string;
  purchase_date: string;
  category: string | null;
  location: string | null;
  specifications: Record<string, any> | null;
  photos: string[];
  status: 'active' | 'maintenance' | 'retired';
  maintenance_cost: string;
  total_revenue: string;
  total_profit: string;
  retired_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestorEquipmentAllocation {
  id: string;
  investor_id: string;
  equipment_id: string;
  amount_allocated: string;
  investment_percentage: string;
  profit_share: string;
  total_profit_received: string;
  has_exited: boolean;
  exit_amount: string | null;
  exited_at: string | null;
  notes: string | null;
  allocated_at: string;
  created_at: string;
  updated_at: string;
  equipment?: Equipment;
}

export interface ProfitDistribution {
  id: string;
  investor_id: string;
  order_id: string | null;
  equipment_id: string | null;
  product_id: string | null;
  sale_revenue: string;
  sale_cost: string;
  gross_profit: string;
  company_share: string;
  investor_share: string;
  capital_returned: string;
  description: string;
  distributed_at: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  investor_id: string;
  request_number: string;
  type: WithdrawalType;
  status: WithdrawalStatus;
  amount: string;
  approved_amount: string | null;
  product_id: string | null;
  variant_id: string | null;
  equipment_id: string | null;
  quantity: number | null;
  request_reason: string | null;
  investor_notes: string | null;
  admin_notes: string | null;
  rejection_reason: string | null;
  // Investor payment details (where to send money)
  momo_number: string | null;
  momo_name: string | null;
  momo_provider: string | null;
  // Admin payment proof
  admin_receipt_url: string | null;
  // Investor confirmation
  investor_confirmed_at: string | null;
  investor_feedback: string | null;
  requested_by: string;
  reviewed_by: string | null;
  processed_by: string | null;
  requested_at: string;
  reviewed_at: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// TAILOR TYPES
// ============================================================================

export interface Tailor {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  photo_url: string | null;
  employee_id: string | null;
  specialties: string[];
  is_active: boolean;
  total_orders: number;
  average_rating: string | null;
  created_at: string;
  updated_at: string;
}

export type FittingStatus =
  | 'scheduled'
  | 'customer_called'
  | 'completed'
  | 'no_show'
  | 'rescheduled'
  | 'cancelled';

export interface FittingAppointment {
  id: string;
  booking_id: string;
  tailor_id: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  customer_called: boolean;
  called_at: string | null;
  called_by: string | null;
  attended: boolean | null;
  attended_at: string | null;
  notes: string | null;
  fitting_number: number;
  status: FittingStatus;
  created_at: string;
  updated_at: string;
  booking?: ServiceBooking;
  tailor?: Tailor;
}

export interface CreateProgressUpdateData {
  status: ProgressStatus;
  description: string;
  photos?: string[];
}

export interface CreateFittingData {
  bookingId: string;
  scheduledDate: string;
  scheduledTime: string;
  durationMinutes?: number;
  notes?: string;
}

export interface TailorStats {
  todayFittings: number;
  activeBookings: number;
  totalMeasurements: number;
  completedFittings: number;
}

// ============================================================================
// HERO BANNER TYPES
// ============================================================================

export type BannerType =
  | 'advertisement'
  | 'new_product'
  | 'new_service'
  | 'promotion'
  | 'announcement'
  | 'upcoming';

export interface HeroBanner {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  type: BannerType;
  image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_link: string | null;
  cta_style: string | null;
  background_color: string | null;
  text_color: string | null;
  order: number;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API & UTILITY TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  onSale?: boolean;
  featured?: boolean;
  search?: string;
}

export interface ServiceFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  duration?: ServiceDuration;
  featured?: boolean;
  search?: string;
}

export interface BookingFilters {
  status?: BookingStatus;
  startDate?: string;
  endDate?: string;
  serviceId?: string;
  service_type?: ServiceType;
  upcoming?: boolean;
}

export interface OrderFilters {
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}

// ============================================================================
// UPCOMING SERVICE TYPES
// ============================================================================

export interface UpcomingService {
  id: string;
  title: string;
  description: string | null;
  short_description: string | null;
  image_url: string;
  service_date: string;
  service_id: string | null;
  cta_text: string | null;
  location: string | null;
  price: string | null;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service?: {
    id: string;
    name: string;
    slug: string;
    featured_image: string | null;
  } | null;
}
