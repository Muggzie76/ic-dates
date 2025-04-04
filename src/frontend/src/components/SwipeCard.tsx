import React, { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { Profile } from '../services/ProfileService';
import { useMatching } from '../contexts/MatchingContext';

interface SwipeCardProps {
    profile: Profile;
    onSwipeComplete?: () => void;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ profile, onSwipeComplete }) => {
    const { swipe } = useMatching();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dragDelta, setDragDelta] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const handleSwipe = async (direction: 'left' | 'right') => {
        try {
            setIsLoading(true);
            setError(null);
            await swipe(Principal.fromText(profile.id), direction);
            onSwipeComplete?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to swipe');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(true);
        const point = 'touches' in e ? e.touches[0] : e;
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setDragDelta({
            x: point.clientX - rect.left,
            y: point.clientY - rect.top
        });
    };

    const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging) return;
        
        const point = 'touches' in e ? e.touches[0] : e;
        const element = e.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        
        const x = point.clientX - dragDelta.x;
        const y = point.clientY - dragDelta.y;
        
        element.style.transform = `translate(${x}px, ${y}px) rotate(${x * 0.1}deg)`;
    };

    const handleDragEnd = (e: React.MouseEvent | React.TouchEvent) => {
        setIsDragging(false);
        const element = e.currentTarget as HTMLElement;
        const rect = element.getBoundingClientRect();
        const threshold = window.innerWidth * 0.3;

        if (rect.x > threshold) {
            handleSwipe('right');
        } else if (rect.x < -threshold) {
            handleSwipe('left');
        } else {
            element.style.transform = '';
        }
    };

    return (
        <div
            className={`relative w-full max-w-sm mx-auto bg-white rounded-xl shadow-lg overflow-hidden ${
                isLoading ? 'opacity-50' : ''
            }`}
            onMouseDown={handleDragStart}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={handleDragStart}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
            style={{ touchAction: 'none' }}
        >
            {/* Profile Image */}
            <div className="relative h-96">
                <img
                    src={profile.photos[0] || '/default-profile.jpg'}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h3 className="text-2xl font-bold text-white">
                        {profile.name}, {profile.age}
                    </h3>
                </div>
            </div>

            {/* Profile Info */}
            <div className="p-4">
                <p className="text-gray-600">{profile.bio}</p>
                
                {profile.interests.length > 0 && (
                    <div className="mt-3">
                        <h4 className="text-sm font-medium text-gray-900">Interests</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {profile.interests.map((interest, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                                >
                                    {interest}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mt-3 text-sm text-red-600">
                        {error}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4 p-4 border-t border-gray-200">
                <button
                    onClick={() => handleSwipe('left')}
                    disabled={isLoading}
                    className="p-4 rounded-full bg-red-100 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    title="Dislike"
                    aria-label="Dislike profile"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <button
                    onClick={() => handleSwipe('right')}
                    disabled={isLoading}
                    className="p-4 rounded-full bg-green-100 text-green-600 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    title="Like"
                    aria-label="Like profile"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default SwipeCard; 