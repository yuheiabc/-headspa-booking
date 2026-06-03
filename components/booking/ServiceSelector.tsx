'use client';

import type { Service } from '@/types';

interface ServiceSelectorProps {
  services: Service[];
  primaryColor: string;
}

export default function ServiceSelector({ services, primaryColor }: ServiceSelectorProps) {
  const handleSelect = (service: Service) => {
    const params = new URLSearchParams({
      service_id: service.id,
      service_name: service.name,
      duration: String(service.duration),
      price: String(service.price),
    });
    window.location.href = `/booking?${params.toString()}`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {services.map((service) => (
        <button
          key={service.id}
          onClick={() => handleSelect(service)}
          className="text-left bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5 group"
        >
          {/* Image */}
          {service.image_url ? (
            <div className="relative h-36 w-full overflow-hidden bg-gray-100">
              <img
                src={service.image_url}
                alt={service.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {/* Duration badge on image */}
              <span
                className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full text-white shadow-sm backdrop-blur-sm"
                style={{ backgroundColor: `${primaryColor}dd` }}
              >
                {service.duration}分
              </span>
            </div>
          ) : (
            <div
              className="relative h-24 w-full flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${primaryColor}08)` }}
            >
              <svg className="w-10 h-10 opacity-20" fill="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span
                className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {service.duration}分
              </span>
            </div>
          )}

          {/* Content */}
          <div className="p-5">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-80 transition-colors mb-1">
              {service.name}
            </h3>

            {service.description && (
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{service.description}</p>
            )}

            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                  ¥{service.price.toLocaleString()}
                </span>
                <span className="text-xs text-gray-400 ml-1">税込</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>所要時間 {service.duration}分</span>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
