import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import SubscriptionServiceClient from '../services/SubscriptionService';
import { HttpAgent, Actor } from '@dfinity/agent';

declare global {
    interface Window {
        ic: {
            agent: HttpAgent;
        };
    }
}

type SubscriptionTier = 'Free' | 'Basic' | 'Premium' | 'VIP';

type SubscriptionState = {
    tier: SubscriptionTier;
    startTime: bigint;
    endTime: bigint;
    autoRenew: boolean;
    features: {
        maxSwipesPerDay: number;
        maxMessagesPerDay: number;
        canSeeWhoLikedYou: boolean;
        priorityMatching: boolean;
        profileBoosts: number;
        hideAds: boolean;
        verifiedBadge: boolean;
        customTheme: boolean;
    };
};

type SubscriptionContextType = {
    subscription: SubscriptionState | null;
    loading: boolean;
    error: string | null;
    checkFeatureAccess: (feature: string) => Promise<boolean>;
    updateSubscription: (tier: SubscriptionTier) => Promise<void>;
};

const defaultState: SubscriptionState = {
    tier: 'Free',
    startTime: BigInt(0),
    endTime: BigInt(0),
    autoRenew: false,
    features: {
        maxSwipesPerDay: 10,
        maxMessagesPerDay: 5,
        canSeeWhoLikedYou: false,
        priorityMatching: false,
        profileBoosts: 0,
        hideAds: false,
        verifiedBadge: false,
        customTheme: false
    }
};

const SubscriptionContext = createContext<SubscriptionContextType>({
    subscription: defaultState,
    loading: false,
    error: null,
    checkFeatureAccess: async () => false,
    updateSubscription: async () => {}
});

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [subscription, setSubscription] = useState<SubscriptionState | null>(defaultState);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const subscriptionService = new SubscriptionServiceClient(
        process.env.SUBSCRIPTION_CANISTER_ID || '',
        window.ic.agent
    );

    useEffect(() => {
        if (user) {
            checkSubscriptionStatus();
        } else {
            setSubscription(null);
            setLoading(false);
        }
    }, [user]);

    const checkSubscriptionStatus = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const status = await subscriptionService.checkSubscription(user.id);
            setSubscription({
                tier: status.plan as SubscriptionTier,
                startTime: BigInt(status.startTime),
                endTime: BigInt(status.endTime),
                autoRenew: status.autoRenew,
                features: {
                    maxSwipesPerDay: status.features.maxSwipesPerDay,
                    maxMessagesPerDay: status.features.maxMessagesPerDay,
                    canSeeWhoLikedYou: status.features.canSeeWhoLikedYou,
                    priorityMatching: status.features.priorityMatching,
                    profileBoosts: status.features.profileBoosts,
                    hideAds: status.features.hideAds,
                    verifiedBadge: status.features.verifiedBadge,
                    customTheme: status.features.customTheme
                }
            });
            setError(null);
        } catch (err) {
            setError('Failed to check subscription status');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const checkFeatureAccess = async (feature: string): Promise<boolean> => {
        if (!subscription) return false;
        
        try {
            const result = await subscriptionService.checkFeatureAccess(user.id, feature);
            return result;
        } catch (err) {
            console.error('Feature access check error:', err);
            return false;
        }
    };

    const updateSubscription = async (tier: SubscriptionTier): Promise<void> => {
        if (!user) return;
        try {
            setLoading(true);
            await subscriptionService.updateSubscription(user.id, tier);
            await checkSubscriptionStatus();
            setError(null);
        } catch (err) {
            setError('Failed to update subscription');
            console.error('Subscription update error:', err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return (
        <SubscriptionContext.Provider
            value={{
                subscription,
                loading,
                error,
                checkFeatureAccess,
                updateSubscription
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};

export const useSubscription = () => {
    const context = useContext(SubscriptionContext);
    if (context === undefined) {
        throw new Error('useSubscription must be used within a SubscriptionProvider');
    }
    return context;
};

export default SubscriptionContext; 