import React, { useEffect, useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import VerificationBadge from './VerificationBadge';
import Ad from './Ad';

interface Profile {
    id: string;
    name: string;
    age: number;
    bio: string;
    photos: string[];
    isVerified: boolean;
    verificationDetails?: {
        verifiedAt: bigint;
        verificationLevel: 'Basic' | 'Advanced' | 'Premium';
        verificationProof: string;
        expiresAt: bigint | null;
    };
}

const LikesList: React.FC = () => {
    const [likes, setLikes] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { checkFeatureAccess } = useSubscription();
    const { user } = useAuth();
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

    useEffect(() => {
        const loadLikes = async () => {
            if (!user) return;

            setLoading(true);
            try {
                const canSeeWhoLikedYou = await checkFeatureAccess('canSeeWhoLikedYou');
                if (!canSeeWhoLikedYou) {
                    setShowUpgradePrompt(true);
                    return;
                }

                const response = await fetch(`/api/likes`);
                if (!response.ok) throw new Error('Failed to fetch likes');
                const data = await response.json();
                setLikes(data);
                setError(null);
            } catch (err) {
                setError('Failed to load likes');
                console.error('Error loading likes:', err);
            } finally {
                setLoading(false);
            }
        };

        loadLikes();
    }, [user, checkFeatureAccess]);

    if (loading) {
        return (
            <div className="p-4">
                <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex space-x-4">
                            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                            <div className="flex-1 space-y-2 py-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (showUpgradePrompt) {
        return (
            <div className="p-4 space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center">
                    <h3 className="text-xl font-semibold mb-4">
                        Unlock Who Liked You
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Upgrade to Premium to see everyone who liked your profile!
                    </p>
                    <div className="text-3xl font-bold mb-4">
                        {likes.length} people liked you
                    </div>
                    <button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors">
                        Upgrade Now
                    </button>
                </div>
                <Ad position="likes" size="medium" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 text-center text-red-500">
                {error}
            </div>
        );
    }

    if (likes.length === 0) {
        return (
            <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                No one has liked your profile yet. Keep swiping!
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {likes.map((profile) => (
                <div
                    key={profile.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                >
                    <div className="flex items-center p-4">
                        <div className="relative">
                            <img
                                src={profile.photos[0]}
                                alt={profile.name}
                                className="w-16 h-16 rounded-full object-cover"
                            />
                            {profile.isVerified && (
                                <div className="absolute -top-1 -right-1">
                                    <VerificationBadge
                                        isVerified={profile.isVerified}
                                        details={profile.verificationDetails}
                                        size="sm"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="ml-4 flex-1">
                            <div className="flex items-center">
                                <h3 className="text-lg font-semibold">
                                    {profile.name}, {profile.age}
                                </h3>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                {profile.bio}
                            </p>
                        </div>
                        <button className="ml-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                            View Profile
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LikesList; 