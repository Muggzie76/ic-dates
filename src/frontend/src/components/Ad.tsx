import React, { useEffect, useState } from 'react';
import { useAds } from '../contexts/AdContext';
import { useSubscription } from '../contexts/SubscriptionContext';

interface AdProps {
    position: string;
    size?: 'small' | 'medium' | 'large';
    className?: string;
}

const Ad: React.FC<AdProps> = ({ position, size = 'medium', className = '' }) => {
    const { showAds, refreshAds } = useAds();
    const [adContent, setAdContent] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const sizeClasses = {
        small: 'h-16 w-full max-w-xs',
        medium: 'h-32 w-full max-w-md',
        large: 'h-64 w-full max-w-lg'
    };

    useEffect(() => {
        const loadAd = async () => {
            if (!showAds) return;

            setIsLoading(true);
            try {
                // Simulate loading ad content
                // In a real implementation, this would fetch from an ad network
                await new Promise(resolve => setTimeout(resolve, 500));
                setAdContent(`Ad content for ${position} position`);
            } catch (error) {
                console.error('Failed to load ad:', error);
                setAdContent(null);
            } finally {
                setIsLoading(false);
            }
        };

        loadAd();
    }, [position, showAds]);

    useEffect(() => {
        // Refresh ads periodically
        if (showAds) {
            const interval = setInterval(refreshAds, 60000); // Refresh every minute
            return () => clearInterval(interval);
        }
    }, [showAds, refreshAds]);

    if (!showAds || !adContent) return null;

    return (
        <div
            className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden ${
                sizeClasses[size]
            } ${className}`}
        >
            {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <div className="animate-pulse flex space-x-4">
                        <div className="rounded-full bg-gray-300 dark:bg-gray-600 h-12 w-12"></div>
                        <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                            <div className="space-y-2">
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">Advertisement</div>
                    <div className="flex items-center justify-center h-full">
                        {/* Replace with actual ad content */}
                        <div className="text-center">
                            <div className="font-medium text-gray-800 dark:text-gray-200">
                                {adContent}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                Upgrade to premium for an ad-free experience!
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Ad; 