// ── API Response types ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  message?: string;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Domain types ───────────────────────────────────────────────────────────────

export type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "RESERVED";
export type RoomType = "STANDARD" | "DELUXE" | "SUITE" | "PRESIDENTIAL";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "REFUNDED" | "FAILED";
export type LoyaltyTier = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";

export interface Room {
  id: string;
  number: string;
  type: RoomType;
  status: RoomStatus;
  floor: number;
  pricePerNight: number;
  maxGuests: number;
  amenities: string[];
  description?: string | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nationality?: string | null;
  passportNumber?: string | null;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  totalStays: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  bookingRef: string;
  guestId: string;
  guest?: Guest;
  roomId: string;
  room?: Room;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  adults: number;
  children: number;
  totalAmount: number;
  specialRequests?: string | null;
  source: "DIRECT" | "BOOKING_COM" | "AGODA" | "WALK_IN";
  createdAt: string;
  updatedAt: string;
}

export interface Bill {
  id: string;
  bookingId: string;
  booking?: Booking;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  loyaltyDiscount: number;
  total: number;
  lineItems: BillLineItem[];
  issuedAt: string;
}

export interface BillLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}
