import { getSalonSettings, getActiveServices, getBookingRules } from '@/lib/settings';
import ServiceSelector from '@/components/booking/ServiceSelector';
import type { SalonSettings, Service, BookingRules } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const salon: SalonSettings = await getSalonSettings();
  const services: Service[] = await getActiveServices();
  const rules: BookingRules = await getBookingRules();

  if (!rules.booking_open) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ color: salon.primary_color }}>
            {salon.logo_text}
          </h1>
          <p className="text-gray-600 mt-6">{rules.booking_closed_message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header
        className="py-16 px-4 text-center text-white"
        style={{ backgroundColor: salon.hero_color }}
      >
        <p className="text-sm tracking-widest uppercase opacity-80 mb-2">{salon.salon_name_sub}</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">{salon.salon_name}</h1>
        <p className="text-lg opacity-90">{salon.catch_copy}</p>
        <p className="mt-4 text-sm opacity-70 max-w-md mx-auto">{salon.description}</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10">
        <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">メニューを選択</h2>
        <ServiceSelector services={services} primaryColor={salon.primary_color} />
      </main>

      <footer className="text-center py-8 text-sm text-gray-400">
        <p>&copy; {salon.salon_name}</p>
      </footer>
    </div>
  );
}
