import React from 'react';
import { useQuery } from '@tanstack/react-query';

const ServiceStatusGrid = () => {
    const { data: services } = useQuery({
        queryKey: ['services'],
        queryFn: async () => {
            const response = await fetch('http://localhost:3000/api/services');
            return response.json();
        },
        refetchInterval: 5000,
    });

    const getStatusColor = (isActive) => {
        return isActive 
            ? 'bg-green-500/20 border-green-500/50 text-green-400'
            : 'bg-red-500/20 border-red-500/50 text-red-400';
    };

    const serviceIcons = {
        'Cowrie SSH': '🔐',
        'HTTP': '🌐',
        'FTP': '📁'
    };

    return (
        <div className="glass rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">
                🍯 Honeynet Services Status
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {services?.services?.map((service) => (
                    <div
                        key={service.id}
                        className={`border-2 rounded-lg p-4 ${getStatusColor(service.is_active)}`}
                    >
                        <div className="text-3xl text-center mb-2">
                            {serviceIcons[service.service_name] || '🔧'}
                        </div>
                        <div className="text-center">
                            <p className="text-sm font-semibold">{service.service_name}</p>
                            <p className="text-xs opacity-70">Port {service.port}</p>
                            <p className="text-xs mt-2">
                                {service.total_events || 0} events
                            </p>
                        </div>
                        <div className="mt-2 text-center">
                            <span className={`text-xs px-2 py-1 rounded ${
                                service.is_active ? 'bg-green-500/30' : 'bg-red-500/30'
                            }`}>
                                {service.is_active ? '● ACTIVE' : '○ OFFLINE'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServiceStatusGrid;
