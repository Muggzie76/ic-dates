import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import MatchingServiceClient, { Profile, Match } from '../services/MatchingService';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';

declare global {
    interface Window {
        ic: {
            agent: HttpAgent;
        };
    }
}

const MatchingPage: React.FC = () => {
    const { user } = useAuth();
    const { hasPremium } = useSubscription();
    const [potentialMatches, setPotentialMatches] = useState<Profile[]>([]);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
    const [swipesRemaining, setSwipesRemaining] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const matchingService = new MatchingServiceClient(
        process.env.MATCHING_CANISTER_ID || '',
        window.ic.agent
    );

    useEffect(() => {
        loadPotentialMatches();
        loadSwipesRemaining();
    }, [user]);

    const loadPotentialMatches = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const matches = await matchingService.getPotentialMatches(user.profile, hasPremium);
            setPotentialMatches(matches);
        } catch (err) {
            setError('Failed to load potential matches');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadSwipesRemaining = async () => {
        if (!user) return;
        try {
            const remaining = await matchingService.getDailySwipesRemaining(Principal.fromText(user.id));
            setSwipesRemaining(remaining);
        } catch (err) {
            console.error('Failed to load swipes remaining:', err);
        }
    };

    const handleSwipe = async (direction: boolean) => {
        if (!user || swipesRemaining === 0) return;
        
        try {
            const currentMatch = potentialMatches[currentMatchIndex];
            if (!currentMatch) return;

            await matchingService.swipe(currentMatch.id, direction);
            setCurrentMatchIndex(prev => prev + 1);
            await loadSwipesRemaining();

            if (currentMatchIndex === potentialMatches.length - 1) {
                await loadPotentialMatches();
                setCurrentMatchIndex(0);
            }
        } catch (err) {
            setError('Failed to process swipe');
            console.error(err);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-500">{error}</div>
            </div>
        );
    }

    const currentMatch = potentialMatches[currentMatchIndex];

    if (!currentMatch) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold mb-4">No more matches available</h2>
                <p className="text-gray-600">Check back later for new potential matches!</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="max-w-lg mx-auto">
                {swipesRemaining !== null && (
                    <div className="mb-4 text-center">
                        <p className="text-gray-600">
                            {swipesRemaining} swipes remaining today
                            {!hasPremium && (
                                <span className="ml-2">
                                    <a href="/subscription" className="text-blue-500 hover:text-blue-600">
                                        Upgrade to Premium for unlimited swipes!
                                    </a>
                                </span>
                            )}
                        </p>
                    </div>
                )}

                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="relative">
                        <img
                            src={currentMatch.photos[0]}
                            alt={currentMatch.name}
                            className="w-full h-96 object-cover"
                        />
                        {hasPremium && (
                            <div className="absolute top-4 right-4">
                                <span className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-semibold">
                                    Priority Match
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="p-6">
                        <h2 className="text-2xl font-bold mb-2">
                            {currentMatch.name}, {currentMatch.age}
                        </h2>
                        <p className="text-gray-600 mb-4">{currentMatch.bio}</p>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {currentMatch.interests.map((interest, index) => (
                                <span
                                    key={index}
                                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                        <div className="flex justify-between">
                            <button
                                onClick={() => handleSwipe(false)}
                                disabled={swipesRemaining === 0}
                                className="bg-red-500 text-white px-6 py-2 rounded-full hover:bg-red-600 disabled:opacity-50"
                            >
                                Pass
                            </button>
                            <button
                                onClick={() => handleSwipe(true)}
                                disabled={swipesRemaining === 0}
                                className="bg-green-500 text-white px-6 py-2 rounded-full hover:bg-green-600 disabled:opacity-50"
                            >
                                Like
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MatchingPage; 