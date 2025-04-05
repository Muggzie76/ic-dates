import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSubscription } from './SubscriptionContext';

type AdContextType = {
    showAds: boolean;
    adPositions: string[];
    refreshAds: () => void;
};

const AdContext = createContext<AdContextType>({
    showAds: true,
    adPositions: [],
    refreshAds: () => {}
});

export const useAds = () => useContext(AdContext);

export const AdProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showAds, setShowAds] = useState(true);
    const { checkFeatureAccess } = useSubscription();
    const [adPositions] = useState<string[]>([
        'header',
        'sidebar',
        'feed',
        'profile',
        'messages'
    ]);

    useEffect(() => {
        const checkAdStatus = async () => {
            const hideAds = await checkFeatureAccess('hideAds');
            setShowAds(!hideAds);
        };
        checkAdStatus();
    }, [checkFeatureAccess]);

    const refreshAds = () => {
        // Implement ad refresh logic here
        // This could involve refreshing ad units or rotating ad content
        if (showAds) {
            console.log('Refreshing ads...');
            // Add actual ad refresh implementation
        }
    };

    return (
        <AdContext.Provider
            value={{
                showAds,
                adPositions,
                refreshAds
            }}
        >
            {children}
        </AdContext.Provider>
    );
}; 