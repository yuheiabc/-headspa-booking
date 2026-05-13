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
          className="text-left bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all hover:-translate-y-0.5 group"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:opacity-80 transition-colors">
              {service.name}
            </h3>
            <span
              className="text-sm font-bold px-3 py-1 rounded-full text-white"
              style={{ backgroundColor: primaryColor }}
            >
              {service.duration}分
            </span>
          </div>
          <p className="text-sm text-gray-500 mb-4">{service.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold" style={{ color: primaryColor }}>
              ¥{service.price.toLocaleString()}
            </span>
            <span className="text-xs text-gray-400">税込</span>
          </div>
        </button>
      ))}
    </div>
  );
}
