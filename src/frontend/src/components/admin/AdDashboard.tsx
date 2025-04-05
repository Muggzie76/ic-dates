import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Actor } from '@dfinity/agent';

// TODO: Generate these types from the Candid interface
interface AdContent {
    title: string;
    description: string;
    imageUrl: [] | [string];
    targetUrl: string;
    callToAction: string;
}

interface AdResponse {
    ok: Ad;
    err: string;
}

interface Ad {
    id: string;
    content: {
        title: string;
        description: string;
        imageUrl?: string;
        targetUrl: string;
        callToAction: string;
    };
    startTime: bigint;
    endTime: bigint;
    status: 'active' | 'paused' | 'ended';
    targetAudience?: {
        minAge?: number;
        maxAge?: number;
        gender?: string;
        interests?: string[];
    };
    metrics: {
        impressions: number;
        clicks: number;
        lastImpressionTime: bigint;
    };
    createdAt: bigint;
    updatedAt: bigint;
}

interface AdPlacement {
    id: string;
    name: string;
    description: string;
    size: { width: number; height: number };
    position: string;
    allowedAdTypes: string[];
}

type AdStatus = { active: null } | { paused: null } | { ended: null };

interface AdvertisingService {
    createAd: (content: AdContent, startTime: bigint, endTime: bigint, targetAudience: [] | [{
        minAge: [] | [number];
        maxAge: [] | [number];
        gender: [] | [string];
        interests: string[];
    }]) => Promise<{ ok: Ad } | { err: string }>;
    updateAdStatus: (adId: string, status: AdStatus) => Promise<{ ok: Ad } | { err: string }>;
    // TODO: Add other service methods
}

const AdDashboard: React.FC = () => {
    const { user } = useAuth();
    const [ads, setAds] = useState<Ad[]>([]);
    const [placements, setPlacements] = useState<AdPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const [newAd, setNewAd] = useState({
        title: '',
        description: '',
        imageUrl: '',
        targetUrl: '',
        callToAction: '',
        startTime: new Date(),
        endTime: new Date(),
        targetAudience: {
            minAge: undefined as number | undefined,
            maxAge: undefined as number | undefined,
            gender: '',
            interests: [] as string[]
        }
    });

    // TODO: Replace with actual canister ID and generated interface
    const advertisingActor = Actor.createActor<AdvertisingService>((window as any).advertisingIdlFactory, {
        agent: (window as any).ic.agent,
        canisterId: process.env.ADVERTISING_CANISTER_ID!
    });

    useEffect(() => {
        fetchAds();
        fetchPlacements();
    }, []);

    const fetchAds = async () => {
        try {
            setLoading(true);
            // TODO: Implement fetch all ads endpoint
            // const response = await advertisingActor.getAllAds();
            // setAds(response);
        } catch (err) {
            setError('Failed to fetch ads');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchPlacements = async () => {
        try {
            // TODO: Implement fetch all placements endpoint
            // const response = await advertisingActor.getAllPlacements();
            // setPlacements(response);
        } catch (err) {
            setError('Failed to fetch placements');
            console.error(err);
        }
    };

    const handleCreateAd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await advertisingActor.createAd(
                {
                    title: newAd.title,
                    description: newAd.description,
                    imageUrl: newAd.imageUrl ? [newAd.imageUrl] : [],
                    targetUrl: newAd.targetUrl,
                    callToAction: newAd.callToAction
                },
                BigInt(newAd.startTime.getTime()),
                BigInt(newAd.endTime.getTime()),
                newAd.targetAudience.minAge || newAd.targetAudience.maxAge || newAd.targetAudience.gender || newAd.targetAudience.interests.length > 0
                    ? [{
                        minAge: newAd.targetAudience.minAge ? [newAd.targetAudience.minAge] : [],
                        maxAge: newAd.targetAudience.maxAge ? [newAd.targetAudience.maxAge] : [],
                        gender: newAd.targetAudience.gender ? [newAd.targetAudience.gender] : [],
                        interests: newAd.targetAudience.interests
                    }]
                    : []
            );

            if ('ok' in response) {
                await fetchAds();
                setIsCreating(false);
                setNewAd({
                    title: '',
                    description: '',
                    imageUrl: '',
                    targetUrl: '',
                    callToAction: '',
                    startTime: new Date(),
                    endTime: new Date(),
                    targetAudience: {
                        minAge: undefined,
                        maxAge: undefined,
                        gender: '',
                        interests: []
                    }
                });
            } else {
                setError(response.err);
            }
        } catch (err) {
            setError('Failed to create ad');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateAdStatus = async (adId: string, status: 'active' | 'paused' | 'ended') => {
        try {
            setLoading(true);
            const statusUpdate: AdStatus = { [status]: null } as AdStatus;
            const response = await advertisingActor.updateAdStatus(adId, statusUpdate);
            if ('ok' in response) {
                await fetchAds();
            } else {
                setError(response.err);
            }
        } catch (err) {
            setError('Failed to update ad status');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Ad Management Dashboard</h1>
                <button
                    onClick={() => setIsCreating(true)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
                >
                    Create New Ad
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {isCreating && (
                <div className="bg-white shadow-md rounded px-8 py-6 mb-8">
                    <h2 className="text-2xl font-bold mb-4">Create New Ad</h2>
                    <form onSubmit={handleCreateAd}>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="title" className="block mb-2">Title</label>
                                <input
                                    id="title"
                                    type="text"
                                    value={newAd.title}
                                    onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    placeholder="Enter ad title"
                                    aria-label="Ad title"
                                />
                            </div>
                            <div>
                                <label htmlFor="description" className="block mb-2">Description</label>
                                <textarea
                                    id="description"
                                    value={newAd.description}
                                    onChange={(e) => setNewAd({ ...newAd, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    placeholder="Enter ad description"
                                    aria-label="Ad description"
                                />
                            </div>
                            <div>
                                <label htmlFor="imageUrl" className="block mb-2">Image URL</label>
                                <input
                                    id="imageUrl"
                                    type="url"
                                    value={newAd.imageUrl}
                                    onChange={(e) => setNewAd({ ...newAd, imageUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    placeholder="Enter image URL"
                                    aria-label="Ad image URL"
                                />
                            </div>
                            <div>
                                <label htmlFor="targetUrl" className="block mb-2">Target URL</label>
                                <input
                                    id="targetUrl"
                                    type="url"
                                    value={newAd.targetUrl}
                                    onChange={(e) => setNewAd({ ...newAd, targetUrl: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    placeholder="Enter target URL"
                                    aria-label="Ad target URL"
                                />
                            </div>
                            <div>
                                <label htmlFor="callToAction" className="block mb-2">Call to Action</label>
                                <input
                                    id="callToAction"
                                    type="text"
                                    value={newAd.callToAction}
                                    onChange={(e) => setNewAd({ ...newAd, callToAction: e.target.value })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    placeholder="Enter call to action text"
                                    aria-label="Ad call to action"
                                />
                            </div>
                            <div>
                                <label htmlFor="startTime" className="block mb-2">Start Time</label>
                                <input
                                    id="startTime"
                                    type="datetime-local"
                                    value={newAd.startTime.toISOString().slice(0, 16)}
                                    onChange={(e) => setNewAd({ ...newAd, startTime: new Date(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    aria-label="Ad start time"
                                />
                            </div>
                            <div>
                                <label htmlFor="endTime" className="block mb-2">End Time</label>
                                <input
                                    id="endTime"
                                    type="datetime-local"
                                    value={newAd.endTime.toISOString().slice(0, 16)}
                                    onChange={(e) => setNewAd({ ...newAd, endTime: new Date(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded"
                                    required
                                    aria-label="Ad end time"
                                />
                            </div>
                        </div>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4">Target Audience</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="minAge" className="block mb-2">Min Age</label>
                                    <input
                                        id="minAge"
                                        type="number"
                                        value={newAd.targetAudience.minAge || ''}
                                        onChange={(e) => setNewAd({
                                            ...newAd,
                                            targetAudience: {
                                                ...newAd.targetAudience,
                                                minAge: e.target.value ? parseInt(e.target.value) : undefined
                                            }
                                        })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="Enter minimum age"
                                        aria-label="Minimum age for target audience"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="maxAge" className="block mb-2">Max Age</label>
                                    <input
                                        id="maxAge"
                                        type="number"
                                        value={newAd.targetAudience.maxAge || ''}
                                        onChange={(e) => setNewAd({
                                            ...newAd,
                                            targetAudience: {
                                                ...newAd.targetAudience,
                                                maxAge: e.target.value ? parseInt(e.target.value) : undefined
                                            }
                                        })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="Enter maximum age"
                                        aria-label="Maximum age for target audience"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="gender" className="block mb-2">Gender</label>
                                    <select
                                        id="gender"
                                        value={newAd.targetAudience.gender}
                                        onChange={(e) => setNewAd({
                                            ...newAd,
                                            targetAudience: {
                                                ...newAd.targetAudience,
                                                gender: e.target.value
                                            }
                                        })}
                                        className="w-full px-3 py-2 border rounded"
                                        aria-label="Target audience gender"
                                    >
                                        <option value="">Any</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="interests" className="block mb-2">Interests (comma-separated)</label>
                                    <input
                                        id="interests"
                                        type="text"
                                        value={newAd.targetAudience.interests.join(', ')}
                                        onChange={(e) => setNewAd({
                                            ...newAd,
                                            targetAudience: {
                                                ...newAd.targetAudience,
                                                interests: e.target.value.split(',').map(i => i.trim()).filter(i => i)
                                            }
                                        })}
                                        className="w-full px-3 py-2 border rounded"
                                        placeholder="Enter interests separated by commas"
                                        aria-label="Target audience interests"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            >
                                {loading ? 'Creating...' : 'Create Ad'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ads.map((ad) => (
                    <div key={ad.id} className="bg-white shadow-md rounded-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold">{ad.content.title}</h3>
                            <div className="flex space-x-2">
                                <button
                                    onClick={() => handleUpdateAdStatus(ad.id, 'active')}
                                    className={`px-3 py-1 rounded ${
                                        ad.status === 'active'
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => handleUpdateAdStatus(ad.id, 'paused')}
                                    className={`px-3 py-1 rounded ${
                                        ad.status === 'paused'
                                            ? 'bg-yellow-500 text-white'
                                            : 'bg-gray-200 text-gray-700'
                                    }`}
                                >
                                    Paused
                                </button>
                            </div>
                        </div>

                        <p className="text-gray-600 mb-4">{ad.content.description}</p>

                        {ad.content.imageUrl && (
                            <img
                                src={ad.content.imageUrl}
                                alt={ad.content.title}
                                className="w-full h-40 object-cover rounded mb-4"
                            />
                        )}

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="font-semibold">Impressions</p>
                                <p>{ad.metrics.impressions}</p>
                            </div>
                            <div>
                                <p className="font-semibold">Clicks</p>
                                <p>{ad.metrics.clicks}</p>
                            </div>
                            <div>
                                <p className="font-semibold">CTR</p>
                                <p>
                                    {ad.metrics.impressions > 0
                                        ? ((ad.metrics.clicks / ad.metrics.impressions) * 100).toFixed(2)
                                        : '0'}
                                    %
                                </p>
                            </div>
                            <div>
                                <p className="font-semibold">Status</p>
                                <p className="capitalize">{ad.status}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdDashboard; 