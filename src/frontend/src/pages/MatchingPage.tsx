import React, { useState, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { useMatching } from '../contexts/MatchingContext';
import SwipeCard from '../components/SwipeCard';
import { Profile } from '../services/ProfileService';

const MatchingPage: React.FC = () => {
    const { matches } = useMatching();
    const { loading: profileLoading, error: profileError } = useProfile();
    const [potentialMatches, setPotentialMatches] = useState<Profile[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // In a real app, this would fetch from the backend
    // For now, we'll use mock data
    useEffect(() => {
        const fetchPotentialMatches = async () => {
            try {
                setLoading(true);
                // TODO: Replace with actual API call
                const mockProfiles: Profile[] = [
                    {
                        id: 'user1',
                        name: 'Alice',
                        age: 25,
                        gender: 'female',
                        bio: 'Love hiking and photography',
                        photos: ['/mock/alice.jpg'],
                        interests: ['hiking', 'photography', 'travel'],
                        location: {
                            latitude: 0,
                            longitude: 0,
                            city: 'San Francisco',
                            country: 'USA'
                        },
                        preferences: {
                            minAge: 23,
                            maxAge: 30,
                            genderPreference: 'male',
                            maxDistance: 50
                        }
                    },
                    // Add more mock profiles as needed
                ];
                setPotentialMatches(mockProfiles);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to fetch potential matches');
            } finally {
                setLoading(false);
            }
        };

        fetchPotentialMatches();
    }, []);

    const handleSwipeComplete = () => {
        setCurrentIndex(prev => prev + 1);
    };

    if (profileLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (profileError || error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600">
                    {profileError || error}
                </div>
            </div>
        );
    }

    if (currentIndex >= potentialMatches.length) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        No More Profiles
                    </h2>
                    <p className="text-gray-600">
                        Check back later for more potential matches!
                    </p>
                </div>

                {matches.length > 0 && (
                    <div className="mt-8">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                            Your Matches ({matches.length})
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {matches.map(match => (
                                <div
                                    key={match.id}
                                    className="bg-white rounded-lg shadow overflow-hidden"
                                >
                                    {/* TODO: Replace with actual match profile data */}
                                    <div className="aspect-w-1 aspect-h-1">
                                        <img
                                            src="/default-profile.jpg"
                                            alt="Match"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="p-2">
                                        <p className="text-sm font-medium text-gray-900 truncate">
                                            Match
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl mx-auto">
                    <SwipeCard
                        profile={potentialMatches[currentIndex]}
                        onSwipeComplete={handleSwipeComplete}
                    />
                </div>
            </div>
        </div>
    );
};

export default MatchingPage; 