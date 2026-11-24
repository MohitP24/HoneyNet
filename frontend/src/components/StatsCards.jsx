import React from 'react';

const StatsCards = ({ stats, loading }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass rounded-xl p-6 animate-pulse">
                        <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
                        <div className="h-8 bg-slate-700 rounded w-3/4"></div>
                    </div>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Total Events',
            value: parseInt(stats?.counts?.total_events) || 0,
            icon: '📊',
            color: 'from-blue-500 to-cyan-500',
        },
        {
            title: 'Active Sessions',
            value: parseInt(stats?.counts?.active_sessions) || 0,
            icon: '🔄',
            color: 'from-green-500 to-emerald-500',
        },
        {
            title: 'Unique Attackers',
            value: parseInt(stats?.counts?.total_attackers) || 0,
            icon: '👤',
            color: 'from-purple-500 to-pink-500',
        },
        {
            title: 'High Severity',
            value: parseInt(stats?.severity_distribution?.find(s => s.severity === 'HIGH')?.count) || 0,
            icon: '⚠️',
            color: 'from-red-500 to-orange-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {cards.map((card, index) => (
                <div
                    key={index}
                    className="glass glass-hover rounded-xl p-6 animate-fade-in cursor-pointer"
                    style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-2xl">{card.icon}</span>
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} opacity-20`}></div>
                    </div>
                    <h3 className="text-slate-400 text-sm font-medium mb-1">{card.title}</h3>
                    <p className="text-3xl font-bold text-white">{card.value.toLocaleString()}</p>
                </div>
            ))}
        </div>
    );
};

export default StatsCards;
