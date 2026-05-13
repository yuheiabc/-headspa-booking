export interface Booking {
  id: string;
  name: string;
  phone: string;
  email?: string;
  date: string;
  time: string;
  service_id: string;
  service_name: string;
  duration: number;
  price: number;
  status: 'confirmed' | 'cancelled' | 'completed';
  google_event_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  description: string;
  detail: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface SalonSettings {
  id: number;
  salon_name: string;
  salon_name_sub: string;
  catch_copy: string;
  description: string;
  address: string;
  phone: string;
  email: string;
  line_url: string;
  instagram_url: string;
  hero_color: string;
  logo_text: string;
  primary_color: string;
  updated_at: string;
}

export interface BusinessHours {
  id: number;
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

export interface SpecialHoliday {
  id: number;
  date: string;
  reason: string;
  created_at: string;
}

export interface BookingRules {
  id: number;
  slot_interval: number;
  max_bookings_per_slot: number;
  min_advance_hours: number;
  max_advance_days: number;
  cancellation_hours: number;
  booking_open: boolean;
  booking_closed_message: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  remaining: number;
}

export interface AdminStats {
  todayBookings: number;
  weekBookings: number;
  monthRevenue: number;
  pendingBookings: number;
  recentBookings: Booking[];
}
