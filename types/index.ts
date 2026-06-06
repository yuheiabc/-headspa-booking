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
  staff_id?: string;
  staff_name?: string;
  customer_id?: string;
  referral_source?: string;
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
  image_url: string;
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

// ---- Staff ----

export interface Staff {
  id: string;
  name: string;
  role: string;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface StaffShift {
  id: number;
  staff_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_off: boolean;
  note: string;
  created_at: string;
}

// ---- Customer (カルテ) ----

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  gender: string;
  birthday: string;
  memo: string;
  referral_source: string;
  visit_count: number;
  last_visit: string;
  created_at: string;
  updated_at: string;
}

export interface CustomerNote {
  id: number;
  customer_id: string;
  booking_id: string;
  staff_id: string;
  staff_name: string;
  date: string;
  service_name: string;
  content: string;
  scalp_condition: string;
  treatment_detail: string;
  created_at: string;
  updated_at: string;
}

// ---- Sales Report ----

export interface DailySales {
  date: string;
  booking_count: number;
  revenue: number;
  cancelled_count: number;
}

export interface MonthlySales {
  month: string;
  booking_count: number;
  revenue: number;
  cancelled_count: number;
  avg_price: number;
}

export interface ServiceSales {
  service_name: string;
  booking_count: number;
  revenue: number;
}

// ---- 回数券 ----

export interface TicketPlan {
  id: string;
  name: string;
  service_id: string;
  service_name: string;
  total_count: number;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerTicket {
  id: number;
  customer_id: string;
  customer_name: string;
  ticket_plan_id: string;
  plan_name: string;
  service_name: string;
  total_count: number;
  used_count: number;
  remaining_count: number;
  purchased_at: string;
  expires_at: string;
  memo: string;
}
