import React from 'react';

const AdaptationsLog = ({ adaptations, loading }) => {
    const getActionIcon = (action) => {
        if (action.includes('banner')) return '🚩';
        if (action.includes('AWS')) return '☁️';
        if (action.includes('database')) return '🗄️';
        if (action.includes('SSH')) return '🔑';
        if (action.includes('restart')) return '🔄';
        return '⚙️';
    };

    if (loading) {
        return (
            <div className="glass rounded-xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Recent Adaptations</h2>
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
            <h2 className="text-xl font-bold text-white mb-4">Recent Adaptations</h2>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
                {adaptations.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <p>No adaptations triggered yet</p>
                        <p className="text-sm mt-2">System will adapt to HIGH severity threats</p>
                    </div>
                ) : (
                    adaptations.map((adaptation, index) => (
                        <div
                            key={adaptation.id || index}
                            className="glass-hover rounded-lg p-4 border border-slate-700/50"
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-start gap-2">
                                    <span className="text-xl">{getActionIcon(adaptation.action_type)}</span>
                                    <div>
                                        <p className="text-sm text-white font-medium">{adaptation.action_type}</p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {new Date(adaptation.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    Automated
                                </span>
                            </div>

                            {adaptation.details && (
                                <div className="mt-2 p-2 bg-slate-800/50 rounded text-xs">
                                    <span className="text-slate-500">Details:</span>
                                    <pre className="text-slate-300 mt-1 whitespace-pre-wrap">
                                        {JSON.stringify(adaptation.details, null, 2)}
                                    </pre>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AdaptationsLog;
