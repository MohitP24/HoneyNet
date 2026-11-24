import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import StatsCards from './StatsCards';
import EventsTable from './EventsTable';
import SeverityChart from './SeverityChart';
import AttackersTable from './AttackersTable';
import AdaptationsLog from './AdaptationsLog';
import ServiceStatusGrid from './ServiceStatusGrid';

const Dashboard = () => {
    const [selectedAttacker, setSelectedAttacker] = React.useState(null);

    // Fetch stats data with auto-refresh every 5 seconds
    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['stats'],
        queryFn: api.getStats,
        refetchInterval: 5000,
        retry: 2,
    });

    // Fetch recent events
    const { data: events, isLoading: eventsLoading } = useQuery({
        queryKey: ['events', selectedAttacker],
        queryFn: () => api.getEvents({ 
            limit: 20, 
            page: 1,
            ...(selectedAttacker && { source_ip: selectedAttacker })
        }),
        refetchInterval: 5000,
        retry: 2,
    });

    // Fetch top attackers
    const { data: attackers, isLoading: attackersLoading } = useQuery({
        queryKey: ['attackers'],
        queryFn: () => api.getAttackers({ limit: 10, page: 1 }),
        refetchInterval: 10000,
        retry: 2,
    });

    // Fetch recent adaptations
    const { data: adaptations, isLoading: adaptationsLoading } = useQuery({
        queryKey: ['adaptations'],
        queryFn: () => api.getAdaptations({ limit: 10, page: 1 }),
        refetchInterval: 10000,
        retry: 2,
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            {/* Header */}
            <header className="mb-8 animate-fade-in">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            🍯 AI-HONEYNET Dashboard
                        </h1>
                        <p className="text-slate-400">
                            Real-time threat monitoring and adaptive defense system
                        </p>
                    </div>
                    <div className="flex items-center gap-2 glass px-4 py-2 rounded-lg">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-slate-300">Live Monitoring</span>
                    </div>
                </div>
            </header>

            {/* Service Status Grid */}
            <div className="mb-8">
                <ServiceStatusGrid />
            </div>

            {/* Stats Cards */}
            <div className="mb-8">
                <StatsCards stats={stats} loading={statsLoading} />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Severity Distribution Chart */}
                <div className="lg:col-span-2">
                    <SeverityChart stats={stats} loading={statsLoading} />
                </div>

                {/* Top Attackers */}
                <div>
                    <AttackersTable
                        attackers={attackers?.attackers || []}
                        loading={attackersLoading}
                        onAttackerClick={(ip) => setSelectedAttacker(ip === selectedAttacker ? null : ip)}
                    />
                </div>
            </div>

            {/* Events and Adaptations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Events */}
                <div>
                    {selectedAttacker && (
                        <div className="mb-3 flex items-center justify-between glass rounded-lg px-4 py-2">
                            <span className="text-sm text-slate-300">
                                Filtering events from: <span className="font-mono text-blue-400">{selectedAttacker}</span>
                            </span>
                            <button
                                onClick={() => setSelectedAttacker(null)}
                                className="text-xs px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                            >
                                Clear Filter
                            </button>
                        </div>
                    )}
                    <EventsTable
                        events={events?.events || []}
                        loading={eventsLoading}
                    />
                </div>

                {/* Recent Adaptations */}
                <div>
                    <AdaptationsLog
                        adaptations={adaptations?.adaptations || []}
                        loading={adaptationsLoading}
                    />
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 text-center text-slate-500 text-sm">
                <p>AI-HONEYNET v1.0 | Powered by Machine Learning</p>
            </footer>
        </div>
    );
};

export default Dashboard;
