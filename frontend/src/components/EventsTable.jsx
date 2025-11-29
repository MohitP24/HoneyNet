import React from 'react';

const EventsTable = ({ events, loading }) => {
    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'HIGH':
                return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'MEDIUM':
                return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'LOW':
                return 'bg-green-500/20 text-green-400 border-green-500/30';
            default:
                return 'bg-slate-500/20  text-slate-400 border-slate-500/30';
        }
    };

    if (loading) {
        return (
            <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Events</h2>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-slate-700/50 rounded animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="glass rounded-xl p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Recent Events</h2>
                <span className="text-xs text-slate-400">{events.length} events</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {events.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No events recorded yet</p>
                        <p className="text-sm mt-2">Waiting for honeypot activity...</p>
                    </div>
                ) : (
                    events.map((event, index) => (
                        <div
                            key={event.id || index}
                            className="glass-hover rounded-lg p-4 border border-slate-700/50"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded border ${getSeverityColor(event.severity)}`}>
                                            {event.severity || 'UNKNOWN'}
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                    <p className="text-sm text-white font-medium">{event.event_type}</p>
                                </div>
                            </div>

                            <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-500">IP:</span>
                                    <span className="text-slate-300 font-mono">{event.source_ip}</span>
                                </div>
                                {event.message && (
                                    <div className="flex items-start gap-2">
                                        <span className="text-slate-500">Msg:</span>
                                        <span className="text-slate-400 truncate">{event.message}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventsTable;
