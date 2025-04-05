import React, { useState, useEffect } from 'react';
import { Actor } from '@dfinity/agent';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ChartOptions
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface SystemMetrics {
    timestamp: bigint;
    cpuUsage: number;
    memoryUsage: number;
    networkLatency: number;
    activeConnections: number;
    errorRate: number;
    requestsPerSecond: number;
}

interface ServiceStatus {
    name: string;
    status: 'healthy' | 'degraded' | 'down';
    lastChecked: bigint;
    message: string;
    metrics: {
        uptime: number;
        responseTime: number;
        errorRate: number;
    };
}

interface HealthService {
    getSystemMetrics: (timeRange: { startTime: bigint; endTime: bigint }) => Promise<SystemMetrics[]>;
    getServiceStatuses: () => Promise<ServiceStatus[]>;
}

const SystemHealthMonitor: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<SystemMetrics[]>([]);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

    // TODO: Replace with actual canister ID
    const healthActor = Actor.createActor<HealthService>((window as any).healthIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.HEALTH_CANISTER_ID!
    });

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, [selectedTimeRange]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const now = BigInt(Date.now() * 1000000);
            const startTime = getStartTime(now);
            
            const [metricsData, servicesData] = await Promise.all([
                healthActor.getSystemMetrics({ startTime, endTime: now }),
                healthActor.getServiceStatuses()
            ]);

            setMetrics(metricsData);
            setServices(servicesData);
            setError(null);
        } catch (err) {
            setError('Failed to fetch system health data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const getStartTime = (now: bigint): bigint => {
        const msInHour = 3600n * 1000000000n;
        switch (selectedTimeRange) {
            case '1h': return now - msInHour;
            case '24h': return now - (24n * msInHour);
            case '7d': return now - (7n * 24n * msInHour);
            case '30d': return now - (30n * 24n * msInHour);
            default: return now - (24n * msInHour);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy': return 'bg-green-100 text-green-800';
            case 'degraded': return 'bg-yellow-100 text-yellow-800';
            case 'down': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatMetricsData = (data: SystemMetrics[]) => {
        const labels = data.map(m => new Date(Number(m.timestamp) / 1000000).toLocaleTimeString());
        return {
            labels,
            datasets: [
                {
                    label: 'CPU Usage (%)',
                    data: data.map(m => m.cpuUsage),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                },
                {
                    label: 'Memory Usage (%)',
                    data: data.map(m => m.memoryUsage),
                    borderColor: 'rgb(153, 102, 255)',
                    tension: 0.1
                },
                {
                    label: 'Network Latency (ms)',
                    data: data.map(m => m.networkLatency),
                    borderColor: 'rgb(255, 159, 64)',
                    tension: 0.1
                }
            ]
        };
    };

    const chartOptions: ChartOptions<'line'> = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'System Metrics Over Time'
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    if (loading && !metrics.length) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">System Health Monitor</h1>
                <select
                    value={selectedTimeRange}
                    onChange={(e) => setSelectedTimeRange(e.target.value as any)}
                    className="px-4 py-2 border rounded-md"
                    aria-label="Select Time Range"
                >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                </select>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* System Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">CPU Usage</h3>
                    <p className="text-3xl font-bold">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].cpuUsage.toFixed(1)}%` : 'N/A'}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">Memory Usage</h3>
                    <p className="text-3xl font-bold">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].memoryUsage.toFixed(1)}%` : 'N/A'}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">Network Latency</h3>
                    <p className="text-3xl font-bold">
                        {metrics.length > 0 ? `${metrics[metrics.length - 1].networkLatency.toFixed(0)}ms` : 'N/A'}
                    </p>
                </div>
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h3 className="text-lg font-semibold mb-2">Requests/sec</h3>
                    <p className="text-3xl font-bold">
                        {metrics.length > 0 ? metrics[metrics.length - 1].requestsPerSecond.toFixed(1) : 'N/A'}
                    </p>
                </div>
            </div>

            {/* Metrics Chart */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-8">
                <Line options={chartOptions} data={formatMetricsData(metrics)} />
            </div>

            {/* Service Status */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b">
                    <h2 className="text-xl font-semibold">Service Status</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uptime</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Checked</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {services.map((service) => (
                                <tr key={service.name}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {service.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(service.status)}`}>
                                            {service.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {service.metrics.uptime.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {service.metrics.responseTime}ms
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {service.metrics.errorRate.toFixed(2)}%
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(Number(service.lastChecked) / 1000000).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default SystemHealthMonitor; 