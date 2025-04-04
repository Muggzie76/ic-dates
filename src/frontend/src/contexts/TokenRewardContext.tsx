import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { TokenRewardService, RewardState, RewardType } from '../services/TokenRewardService';
import { useAuth } from './AuthContext';

interface TokenRewardContextType {
    balance: bigint;
    rewardState: RewardState | null;
    distributeReward: (user: Principal, rewardType: RewardType) => Promise<void>;
    transfer: (to: Principal, amount: bigint) => Promise<void>;
    refreshBalance: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

const TokenRewardContext = createContext<TokenRewardContextType | undefined>(undefined);

export const useTokenReward = () => {
    const context = useContext(TokenRewardContext);
    if (!context) {
        throw new Error('useTokenReward must be used within a TokenRewardProvider');
    }
    return context;
};

export const TokenRewardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [balance, setBalance] = useState<bigint>(BigInt(0));
    const [rewardState, setRewardState] = useState<RewardState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { principal, isAuthenticated } = useAuth();

    const tokenRewardService = new TokenRewardService();

    const refreshBalance = useCallback(async () => {
        if (!principal) return;

        try {
            setLoading(true);
            setError(null);
            const newBalance = await tokenRewardService.getBalance(principal);
            setBalance(newBalance);
            
            const state = await tokenRewardService.getRewardState(principal);
            setRewardState(state);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    }, [principal]);

    const distributeReward = useCallback(async (user: Principal, rewardType: RewardType) => {
        try {
            setLoading(true);
            setError(null);
            await tokenRewardService.distributeReward(user, rewardType);
            await refreshBalance();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to distribute reward');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [refreshBalance]);

    const transfer = useCallback(async (to: Principal, amount: bigint) => {
        try {
            setLoading(true);
            setError(null);
            await tokenRewardService.transfer(to, amount);
            await refreshBalance();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to transfer tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [refreshBalance]);

    useEffect(() => {
        if (isAuthenticated && principal) {
            refreshBalance();
        }
    }, [isAuthenticated, principal, refreshBalance]);

    const value = {
        balance,
        rewardState,
        distributeReward,
        transfer,
        refreshBalance,
        loading,
        error
    };

    return (
        <TokenRewardContext.Provider value={value}>
            {children}
        </TokenRewardContext.Provider>
    );
}; 