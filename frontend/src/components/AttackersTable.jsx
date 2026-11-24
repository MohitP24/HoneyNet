import React from 'react';

const AttackersTable = ({ attackers, loading, onAttackerClick }) => {
    if (loading) {
        return (
            <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Top Attackers</h2>
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
            <h2 className="text-xl font-bold text-white mb-4">Top Attackers</h2>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {attackers.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No attackers detected yet</p>
                    </div>
                ) : (
                    attackers.map((attacker, index) => (
                        <div
                            key={attacker.id || index}
                            onClick={() => onAttackerClick && onAttackerClick(attacker.ip_address)}
                            className="glass-hover rounded-lg p-4 border border-slate-700/50 cursor-pointer hover:border-blue-500/50 transition-all"
                            title={`Click to filter events from ${attacker.ip_address}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">🎯</span>
                                    <span className="text-sm font-mono text-white">{attacker.ip_address}</span>
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                    {attacker.total_events || 0} events
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <span className="text-slate-500">First Seen:</span>
                                    <p className="text-slate-300">{new Date(attacker.first_seen).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-slate-500">Last Activity:</span>
                                    <p className="text-slate-300">{new Date(attacker.last_seen).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {attacker.geo_country && (
                                <div className="mt-2 text-xs">
                                    <span className="text-slate-500">Location:</span>
                                    <span className="ml-2 text-slate-300">{attacker.geo_country}</span>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AttackersTable;
