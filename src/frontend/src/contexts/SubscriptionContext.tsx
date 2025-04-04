import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import SubscriptionServiceClient from '../services/SubscriptionService';
import { HttpAgent } from '@dfinity/agent';

declare global {
    interface Window {
        ic: {
            agent: HttpAgent;
        };
    }
}

export interface SubscriptionContextType {
    hasPremium: boolean;
    loading: boolean;
    error: string | null;
    subscribe: (plan: string) => Promise<void>;
    unsubscribe: () => Promise<void>;
    checkSubscriptionStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [hasPremium, setHasPremium] = useState(false);
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
            setHasPremium(false);
            setLoading(false);
        }
    }, [user]);

    const checkSubscriptionStatus = async () => {
        if (!user) return;
        try {
            setLoading(true);
            const status = await subscriptionService.checkSubscription(user.id);
            setHasPremium(status.active && status.plan === 'premium');
            setError(null);
        } catch (err) {
            setError('Failed to check subscription status');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const subscribe = async (plan: string) => {
        if (!user) return;
        try {
            setLoading(true);
            await subscriptionService.subscribe(user.id, plan);
            await checkSubscriptionStatus();
            setError(null);
        } catch (err) {
            setError('Failed to subscribe');
            console.error(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const unsubscribe = async () => {
        if (!user) return;
        try {
            setLoading(true);
            await subscriptionService.unsubscribe(user.id);
            await checkSubscriptionStatus();
            setError(null);
        } catch (err) {
            setError('Failed to unsubscribe');
            console.error(err);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return (
        <SubscriptionContext.Provider
            value={{
                hasPremium,
                loading,
                error,
                subscribe,
                unsubscribe,
                checkSubscriptionStatus,
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