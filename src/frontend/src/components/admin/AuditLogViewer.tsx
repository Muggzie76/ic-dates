import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';

interface SystemEvent {
    timestamp: bigint;
    eventType: string;
    details: string;
}

interface UserEvent {
    timestamp: bigint;
    userId: string;
    action: string;
}

interface AdminEvent {
    timestamp: bigint;
    adminId: string;
    action: string;
}

interface AuditReport {
    systemEvents: SystemEvent[] | null;
    userEvents: UserEvent[] | null;
    adminEvents: AdminEvent[] | null;
    timestamp: bigint;
}

interface TimeRange {
    startTime: bigint;
    endTime: bigint;
}

interface AuditService {
    getAuditTrail: (timeRange: TimeRange) => Promise<AuditReport>;
    exportAuditLogs: (timeRange: TimeRange) => Promise<string>; // Returns CSV data
}

const AuditLogViewer: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>({
        startTime: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endTime: BigInt(Date.now())
    });
    const [activeTab, setActiveTab] = useState<'system' | 'user' | 'admin'>('system');
    const [searchTerm, setSearchTerm] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // TODO: Replace with actual canister ID
    const auditActor = Actor.createActor<AuditService>((window as any).auditIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.AUDIT_CANISTER_ID!
    });

    useEffect(() => {
        fetchAuditLogs();
    }, [timeRange]);

    const fetchAuditLogs = async () => {
        try {
            setLoading(true);
            const report = await auditActor.getAuditTrail(timeRange);
            setAuditReport(report);
            setError(null);
        } catch (err) {
            setError('Failed to fetch audit logs');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTimeRangeChange = (days: number) => {
        setTimeRange({
            startTime: BigInt(Date.now() - days * 24 * 60 * 60 * 1000),
            endTime: BigInt(Date.now())
        });
    };

    const handleExport = async () => {
        try {
            setIsExporting(true);
            const csvData = await auditActor.exportAuditLogs(timeRange);
            
            // Create and download CSV file
            const blob = new Blob([csvData], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `audit_logs_${new Date().toISOString()}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Failed to export audit logs');
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const filterEvents = <T extends SystemEvent | UserEvent | AdminEvent>(
        events: T[] | null,
        searchTerm: string
    ): T[] => {
        if (!events) return [];
        return events.filter(event => {
            const searchString = JSON.stringify(event).toLowerCase();
            return searchString.includes(searchTerm.toLowerCase());
        });
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Audit Log Viewer</h1>
                <div className="flex space-x-4">
                    <select
                        value={Number(timeRange.endTime - timeRange.startTime) / (24 * 60 * 60 * 1000)}
                        onChange={(e) => handleTimeRangeChange(Number(e.target.value))}
                        className="px-4 py-2 border rounded-md"
                        aria-label="Time Range"
                    >
                        <option value={1}>Last 24 hours</option>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                        aria-label="Export Logs"
                    >
                        {isExporting ? 'Exporting...' : 'Export Logs'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full px-4 py-2 border rounded-md"
                    aria-label="Search Logs"
                />
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="border-b">
                    <nav className="flex">
                        <button
                            onClick={() => setActiveTab('system')}
                            className={`px-6 py-3 text-sm font-medium ${
                                activeTab === 'system'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="System Events Tab"
                        >
                            System Events
                        </button>
                        <button
                            onClick={() => setActiveTab('user')}
                            className={`px-6 py-3 text-sm font-medium ${
                                activeTab === 'user'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="User Events Tab"
                        >
                            User Events
                        </button>
                        <button
                            onClick={() => setActiveTab('admin')}
                            className={`px-6 py-3 text-sm font-medium ${
                                activeTab === 'admin'
                                    ? 'border-b-2 border-blue-500 text-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                            }`}
                            aria-label="Admin Events Tab"
                        >
                            Admin Events
                        </button>
                    </nav>
                </div>

                <div className="overflow-x-auto">
                    {activeTab === 'system' && auditReport?.systemEvents && (
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filterEvents(auditReport.systemEvents, searchTerm).map((event, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(Number(event.timestamp) / 1000000).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.eventType}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{event.details}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'user' && auditReport?.userEvents && (
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filterEvents(auditReport.userEvents, searchTerm).map((event, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(Number(event.timestamp) / 1000000).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.userId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{event.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}

                    {activeTab === 'admin' && auditReport?.adminEvents && (
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filterEvents(auditReport.adminEvents, searchTerm).map((event, index) => (
                                    <tr key={index}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(Number(event.timestamp) / 1000000).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.adminId}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{event.action}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogViewer; 