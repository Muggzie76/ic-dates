import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Principal } from '@dfinity/principal';
import { TokenStakingService, StakeInfo, StakingConfig } from '../services/TokenStakingService';
import { useAuth } from './AuthContext';

interface TokenStakingContextType {
    stakes: StakeInfo[];
    stakingConfig: StakingConfig | null;
    stake: (amount: bigint, durationIndex: number) => Promise<void>;
    unstake: (stakeIndex: number) => Promise<bigint>;
    refreshStakes: () => Promise<void>;
    loading: boolean;
    error: string | null;
}

const TokenStakingContext = createContext<TokenStakingContextType | undefined>(undefined);

export const useTokenStaking = () => {
    const context = useContext(TokenStakingContext);
    if (!context) {
        throw new Error('useTokenStaking must be used within a TokenStakingProvider');
    }
    return context;
};

export const TokenStakingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [stakes, setStakes] = useState<StakeInfo[]>([]);
    const [stakingConfig, setStakingConfig] = useState<StakingConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { principal, isAuthenticated } = useAuth();

    const stakingService = new TokenStakingService();

    const refreshStakes = useCallback(async () => {
        if (!principal) return;

        try {
            setLoading(true);
            setError(null);
            const [userStakes, config] = await Promise.all([
                stakingService.getStakes(principal),
                stakingService.getStakingConfig()
            ]);
            setStakes(userStakes);
            setStakingConfig(config);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch stakes');
        } finally {
            setLoading(false);
        }
    }, [principal]);

    const stake = useCallback(async (amount: bigint, durationIndex: number) => {
        try {
            setLoading(true);
            setError(null);
            await stakingService.stake(amount, durationIndex);
            await refreshStakes();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to stake tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [refreshStakes]);

    const unstake = useCallback(async (stakeIndex: number) => {
        try {
            setLoading(true);
            setError(null);
            const amount = await stakingService.unstake(stakeIndex);
            await refreshStakes();
            return amount;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unstake tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    }, [refreshStakes]);

    useEffect(() => {
        if (isAuthenticated && principal) {
            refreshStakes();
        }
    }, [isAuthenticated, principal, refreshStakes]);

    const value = {
        stakes,
        stakingConfig,
        stake,
        unstake,
        refreshStakes,
        loading,
        error
    };

    return (
        <TokenStakingContext.Provider value={value}>
            {children}
        </TokenStakingContext.Provider>
    );
}; 