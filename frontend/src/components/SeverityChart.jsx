import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SeverityChart = ({ stats, loading }) => {
    if (loading) {
        return (
            <div className="glass rounded-xl p-6">
                <div className="h-4 bg-slate-700 rounded w-1/3 mb-4 animate-pulse"></div>
                <div className="h-64 bg-slate-700/50 rounded animate-pulse"></div>
            </div>
        );
    }

    const severityData = [
        { 
            name: 'High', 
            value: parseInt(stats?.severity_distribution?.find(s => s.severity === 'HIGH')?.count) || 0, 
            color: '#ef4444' 
        },
        { 
            name: 'Medium', 
            value: parseInt(stats?.severity_distribution?.find(s => s.severity === 'MEDIUM')?.count) || 0, 
            color: '#f59e0b' 
        },
        { 
            name: 'Low', 
            value: parseInt(stats?.severity_distribution?.find(s => s.severity === 'LOW')?.count) || 0, 
            color: '#10b981' 
        },
        { 
            name: 'Unknown', 
            value: parseInt(stats?.severity_distribution?.find(s => s.severity === 'UNKNOWN')?.count) || 0, 
            color: '#64748b' 
        },
    ];

    const eventTypeData = (stats?.event_type_distribution || []).map(item => ({
        name: item.event_type.replace('cowrie.', ''),
        value: parseInt(item.count),
    }));

    return (
        <div className="glass rounded-xl p-6 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6">Threat Analysis</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Severity Distribution Pie Chart */}
                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Severity Distribution</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={severityData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {severityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px'
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Event Type Distribution Bar Chart */}
                <div>
                    <h3 className="text-sm font-medium text-slate-400 mb-3">Event Types</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={eventTypeData.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis
                                dataKey="name"
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #475569',
                                    borderRadius: '8px'
                                }}
                            />
                            <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SeverityChart;
