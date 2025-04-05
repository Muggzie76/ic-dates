import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';

interface ComplianceMetrics {
    granted: number;
    denied: number;
    notSet: number;
}

interface DataRequestMetrics {
    received: number;
    completed: number;
    pending: number;
}

interface IncidentMetrics {
    total: number;
    resolved: number;
    open: number;
}

interface ComplianceReport {
    consentMetrics: ComplianceMetrics | null;
    dataRequests: DataRequestMetrics | null;
    incidents: IncidentMetrics | null;
    timestamp: bigint;
}

interface TimeRange {
    startTime: bigint;
    endTime: bigint;
}

interface ReportRequest {
    timeRange: TimeRange;
    kind: 'gdpr' | 'full' | 'summary';
}

interface ComplianceService {
    generateComplianceReport: (request: ReportRequest) => Promise<ComplianceReport>;
    getConsentSettings: (userId: string) => Promise<{
        advertising: boolean;
        analytics: boolean;
        targeting: boolean;
        timestamp: bigint;
    }>;
    updateConsentSettings: (userId: string, settings: {
        advertising: boolean;
        analytics: boolean;
        targeting: boolean;
    }) => Promise<void>;
}

const ComplianceReporting: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [report, setReport] = useState<ComplianceReport | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>({
        startTime: BigInt(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endTime: BigInt(Date.now())
    });
    const [reportType, setReportType] = useState<'gdpr' | 'full' | 'summary'>('gdpr');

    // TODO: Replace with actual canister ID
    const complianceActor = Actor.createActor<ComplianceService>((window as any).complianceIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.COMPLIANCE_CANISTER_ID!
    });

    useEffect(() => {
        fetchReport();
    }, [timeRange, reportType]);

    const fetchReport = async () => {
        try {
            setLoading(true);
            const request: ReportRequest = {
                timeRange,
                kind: reportType
            };
            const newReport = await complianceActor.generateComplianceReport(request);
            setReport(newReport);
            setError(null);
        } catch (err) {
            setError('Failed to fetch compliance report');
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

    const calculatePercentage = (value: number, total: number): string => {
        if (total === 0) return '0%';
        return `${((value / total) * 100).toFixed(1)}%`;
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
                <h1 className="text-3xl font-bold">Compliance Reporting</h1>
                <div className="flex space-x-4">
                    <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value as 'gdpr' | 'full' | 'summary')}
                        className="px-4 py-2 border rounded-md"
                        aria-label="Report Type"
                    >
                        <option value="gdpr">GDPR Report</option>
                        <option value="full">Full Report</option>
                        <option value="summary">Summary Report</option>
                    </select>
                    <select
                        value={Number(timeRange.endTime - timeRange.startTime) / (24 * 60 * 60 * 1000)}
                        onChange={(e) => handleTimeRangeChange(Number(e.target.value))}
                        className="px-4 py-2 border rounded-md"
                        aria-label="Time Range"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                        <option value={365}>Last year</option>
                    </select>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {report && (
                <div className="space-y-8">
                    {/* Consent Metrics */}
                    {report.consentMetrics && (
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4">Consent Metrics</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Granted</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {report.consentMetrics.granted}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(
                                            report.consentMetrics.granted,
                                            report.consentMetrics.granted + report.consentMetrics.denied + report.consentMetrics.notSet
                                        )}
                                    </p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Denied</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {report.consentMetrics.denied}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(
                                            report.consentMetrics.denied,
                                            report.consentMetrics.granted + report.consentMetrics.denied + report.consentMetrics.notSet
                                        )}
                                    </p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Not Set</p>
                                    <p className="text-2xl font-bold text-gray-600">
                                        {report.consentMetrics.notSet}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(
                                            report.consentMetrics.notSet,
                                            report.consentMetrics.granted + report.consentMetrics.denied + report.consentMetrics.notSet
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Data Request Metrics */}
                    {report.dataRequests && (
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4">Data Requests</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Received</p>
                                    <p className="text-2xl font-bold">{report.dataRequests.received}</p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Completed</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {report.dataRequests.completed}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(report.dataRequests.completed, report.dataRequests.received)}
                                    </p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Pending</p>
                                    <p className="text-2xl font-bold text-yellow-600">
                                        {report.dataRequests.pending}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(report.dataRequests.pending, report.dataRequests.received)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Incident Metrics */}
                    {report.incidents && (
                        <div className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-2xl font-bold mb-4">Incidents</h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Total</p>
                                    <p className="text-2xl font-bold">{report.incidents.total}</p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Resolved</p>
                                    <p className="text-2xl font-bold text-green-600">
                                        {report.incidents.resolved}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(report.incidents.resolved, report.incidents.total)}
                                    </p>
                                </div>
                                <div className="p-4 border rounded">
                                    <p className="text-sm text-gray-600">Open</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        {report.incidents.open}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {calculatePercentage(report.incidents.open, report.incidents.total)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Report Timestamp */}
                    <div className="text-sm text-gray-500 text-right">
                        Report generated: {new Date(Number(report.timestamp) / 1000000).toLocaleString()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceReporting; 