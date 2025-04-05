import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Actor } from '@dfinity/agent';

// Types from backend
interface TestResult {
    passed: boolean;
    description: string;
    error: string | null;
}

interface TimeRange {
    startTime: bigint;
    endTime: bigint;
}

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

interface Incident {
    id: string;
    severity: 'high' | 'medium' | 'low';
    incidentType: 'dataBreachAttempt' | 'unauthorized' | 'suspicious';
    description: string;
    timestamp: bigint;
    status: 'open' | 'investigating' | 'resolved';
}

interface SecurityService {
    testSecurityMeasures: () => Promise<TestResult[]>;
    getAuditTrail: (timeRange: TimeRange) => Promise<AuditReport>;
    getActiveIncidents: () => Promise<Incident[]>;
    getSystemHealth: () => Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        metrics: {
            responseTime: number;
            errorRate: number;
            requestVolume: number;
            resourceUtilization: number;
        };
    }>;
}

const SecurityDashboard: React.FC = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [securityTests, setSecurityTests] = useState<TestResult[]>([]);
    const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [systemHealth, setSystemHealth] = useState<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        metrics: {
            responseTime: number;
            errorRate: number;
            requestVolume: number;
            resourceUtilization: number;
        };
    } | null>(null);

    // TODO: Replace with actual canister ID
    const securityActor = Actor.createActor<SecurityService>((window as any).securityIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.SECURITY_CANISTER_ID!
    });

    useEffect(() => {
        fetchSecurityData();
    }, []);

    const fetchSecurityData = async () => {
        try {
            setLoading(true);
            const [testResults, report, activeIncidents, health] = await Promise.all([
                securityActor.testSecurityMeasures(),
                securityActor.getAuditTrail({
                    startTime: BigInt(Date.now() - 24 * 60 * 60 * 1000),
                    endTime: BigInt(Date.now())
                }),
                securityActor.getActiveIncidents(),
                securityActor.getSystemHealth()
            ]);

            setSecurityTests(testResults);
            setAuditReport(report);
            setIncidents(activeIncidents);
            setSystemHealth(health);
        } catch (err) {
            setError('Failed to fetch security data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getHealthStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'text-green-500';
            case 'degraded': return 'text-yellow-500';
            case 'unhealthy': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getIncidentSeverityColor = (severity: string) => {
        switch (severity) {
            case 'high': return 'bg-red-100 text-red-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'low': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Security Dashboard</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* System Health Section */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">System Health</h2>
                {systemHealth && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-4 border rounded">
                            <p className="text-sm text-gray-600">Status</p>
                            <p className={`text-lg font-bold ${getHealthStatusColor(systemHealth.status)}`}>
                                {systemHealth.status.charAt(0).toUpperCase() + systemHealth.status.slice(1)}
                            </p>
                        </div>
                        <div className="p-4 border rounded">
                            <p className="text-sm text-gray-600">Response Time</p>
                            <p className="text-lg font-bold">{systemHealth.metrics.responseTime}ms</p>
                        </div>
                        <div className="p-4 border rounded">
                            <p className="text-sm text-gray-600">Error Rate</p>
                            <p className="text-lg font-bold">{systemHealth.metrics.errorRate}%</p>
                        </div>
                        <div className="p-4 border rounded">
                            <p className="text-sm text-gray-600">Resource Utilization</p>
                            <p className="text-lg font-bold">{systemHealth.metrics.resourceUtilization}%</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Incidents Section */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Active Incidents</h2>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {incidents.map((incident) => (
                                <tr key={incident.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{incident.id}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getIncidentSeverityColor(incident.severity)}`}>
                                            {incident.severity}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incident.incidentType}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{incident.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{incident.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Security Tests Section */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <h2 className="text-2xl font-bold mb-4">Security Tests</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {securityTests.map((test, index) => (
                        <div key={index} className="p-4 border rounded">
                            <div className="flex items-center mb-2">
                                {test.passed ? (
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                )}
                                <p className={`text-sm font-medium ${test.passed ? 'text-green-800' : 'text-red-800'}`}>
                                    {test.description}
                                </p>
                            </div>
                            {test.error && (
                                <p className="text-sm text-red-600 mt-1">{test.error}</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Audit Trail Section */}
            <div className="bg-white shadow-md rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Audit Trail</h2>
                <div className="space-y-6">
                    {auditReport?.systemEvents && (
                        <div>
                            <h3 className="text-lg font-semibold mb-2">System Events</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {auditReport.systemEvents.map((event, index) => (
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
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecurityDashboard; 