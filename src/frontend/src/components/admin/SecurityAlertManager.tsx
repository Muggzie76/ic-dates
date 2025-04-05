import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';

interface Alert {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    type: string;
    message: string;
    timestamp: bigint;
    status: 'active' | 'acknowledged' | 'resolved';
    metadata: {
        source: string;
        affectedSystem: string;
        [key: string]: string;
    };
}

interface AlertFilter {
    severity?: 'critical' | 'warning' | 'info';
    status?: 'active' | 'acknowledged' | 'resolved';
    timeRange?: {
        startTime: bigint;
        endTime: bigint;
    };
}

interface AlertService {
    getAlerts: (filter: AlertFilter) => Promise<Alert[]>;
    updateAlertStatus: (alertId: string, status: 'acknowledged' | 'resolved') => Promise<void>;
    getAlertStats: () => Promise<{
        total: number;
        critical: number;
        warning: number;
        info: number;
        active: number;
        acknowledged: number;
        resolved: number;
    }>;
}

const SecurityAlertManager: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [stats, setStats] = useState<{
        total: number;
        critical: number;
        warning: number;
        info: number;
        active: number;
        acknowledged: number;
        resolved: number;
    } | null>(null);
    const [filters, setFilters] = useState<AlertFilter>({});
    const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);

    // TODO: Replace with actual canister ID
    const alertActor = Actor.createActor<AlertService>((window as any).alertIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.ALERT_CANISTER_ID!
    });

    useEffect(() => {
        fetchAlerts();
        fetchStats();
    }, [filters]);

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const alertList = await alertActor.getAlerts(filters);
            setAlerts(alertList);
            setError(null);
        } catch (err) {
            setError('Failed to fetch alerts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const alertStats = await alertActor.getAlertStats();
            setStats(alertStats);
        } catch (err) {
            console.error('Failed to fetch alert stats:', err);
        }
    };

    const handleUpdateStatus = async (alertId: string, status: 'acknowledged' | 'resolved') => {
        try {
            await alertActor.updateAlertStatus(alertId, status);
            await fetchAlerts();
            await fetchStats();
            if (selectedAlert?.id === alertId) {
                setSelectedAlert(null);
            }
        } catch (err) {
            setError('Failed to update alert status');
            console.error(err);
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800';
            case 'warning': return 'bg-yellow-100 text-yellow-800';
            case 'info': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-red-100 text-red-800';
            case 'acknowledged': return 'bg-yellow-100 text-yellow-800';
            case 'resolved': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading && !alerts.length) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Security Alert Manager</h1>
                <div className="flex space-x-4">
                    <select
                        value={filters.severity || ''}
                        onChange={(e) => setFilters({ ...filters, severity: e.target.value as any || undefined })}
                        className="px-4 py-2 border rounded-md"
                        aria-label="Filter by Severity"
                    >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="warning">Warning</option>
                        <option value="info">Info</option>
                    </select>
                    <select
                        value={filters.status || ''}
                        onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                        className="px-4 py-2 border rounded-md"
                        aria-label="Filter by Status"
                    >
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="acknowledged">Acknowledged</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Total Alerts</h3>
                        <p className="text-3xl font-bold">{stats.total}</p>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                            <div className="text-center">
                                <p className="text-sm text-red-600">{stats.critical}</p>
                                <p className="text-xs text-gray-500">Critical</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-yellow-600">{stats.warning}</p>
                                <p className="text-xs text-gray-500">Warning</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-blue-600">{stats.info}</p>
                                <p className="text-xs text-gray-500">Info</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Active Alerts</h3>
                        <p className="text-3xl font-bold text-red-600">{stats.active}</p>
                    </div>
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Acknowledged</h3>
                        <p className="text-3xl font-bold text-yellow-600">{stats.acknowledged}</p>
                    </div>
                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Resolved</h3>
                        <p className="text-3xl font-bold text-green-600">{stats.resolved}</p>
                    </div>
                </div>
            )}

            {/* Alert List */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Message</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {alerts.map((alert) => (
                                <tr
                                    key={alert.id}
                                    className={alert.status === 'active' ? 'bg-red-50' : ''}
                                    onClick={() => setSelectedAlert(alert)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(Number(alert.timestamp) / 1000000).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                                            {alert.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{alert.type}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{alert.message}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                                            {alert.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        {alert.status === 'active' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(alert.id, 'acknowledged');
                                                }}
                                                className="text-blue-600 hover:text-blue-900 mr-4"
                                                aria-label="Acknowledge Alert"
                                            >
                                                Acknowledge
                                            </button>
                                        )}
                                        {alert.status !== 'resolved' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateStatus(alert.id, 'resolved');
                                                }}
                                                className="text-green-600 hover:text-green-900"
                                                aria-label="Resolve Alert"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Alert Details Modal */}
            {selectedAlert && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-2xl font-bold">Alert Details</h2>
                            <button
                                onClick={() => setSelectedAlert(null)}
                                className="text-gray-500 hover:text-gray-700"
                                aria-label="Close Alert Details"
                            >
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Alert ID</h3>
                                <p className="mt-1">{selectedAlert.id}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
                                <p className="mt-1">{new Date(Number(selectedAlert.timestamp) / 1000000).toLocaleString()}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Type</h3>
                                <p className="mt-1">{selectedAlert.type}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Message</h3>
                                <p className="mt-1">{selectedAlert.message}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Metadata</h3>
                                <div className="mt-1 space-y-2">
                                    {Object.entries(selectedAlert.metadata).map(([key, value]) => (
                                        <div key={key} className="flex">
                                            <span className="font-medium w-32">{key}:</span>
                                            <span>{value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-4 mt-6">
                                {selectedAlert.status === 'active' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedAlert.id, 'acknowledged')}
                                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                        aria-label="Acknowledge Alert"
                                    >
                                        Acknowledge
                                    </button>
                                )}
                                {selectedAlert.status !== 'resolved' && (
                                    <button
                                        onClick={() => handleUpdateStatus(selectedAlert.id, 'resolved')}
                                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                                        aria-label="Resolve Alert"
                                    >
                                        Resolve
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityAlertManager; 