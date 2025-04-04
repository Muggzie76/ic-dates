import React, { createContext, useContext, useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useAuth } from './AuthContext';
import { matchingService, Match } from '../services/MatchingService';

interface MatchingContextType {
    matches: Match[];
    loading: boolean;
    error: string | null;
    swipe: (targetUser: Principal, direction: 'left' | 'right') => Promise<boolean>;
    unmatch: (matchId: string) => Promise<boolean>;
    refreshMatches: () => Promise<void>;
}

const MatchingContext = createContext<MatchingContextType | undefined>(undefined);

export const MatchingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { principal } = useAuth();
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshMatches = async () => {
        if (!principal) {
            setMatches([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const userMatches = await matchingService.getMatches();
            setMatches(userMatches);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch matches');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshMatches();
    }, [principal]);

    const swipe = async (targetUser: Principal, direction: 'left' | 'right'): Promise<boolean> => {
        try {
            setLoading(true);
            const isMatch = await matchingService.swipe(targetUser, direction);
            if (isMatch) {
                await refreshMatches();
            }
            return isMatch;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to swipe');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const unmatch = async (matchId: string): Promise<boolean> => {
        try {
            setLoading(true);
            const success = await matchingService.unmatch(matchId);
            if (success) {
                await refreshMatches();
            }
            return success;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unmatch');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        matches,
        loading,
        error,
        swipe,
        unmatch,
        refreshMatches,
    };

    return (
        <MatchingContext.Provider value={value}>
            {children}
        </MatchingContext.Provider>
    );
};

export const useMatching = () => {
    const context = useContext(MatchingContext);
    if (context === undefined) {
        throw new Error('useMatching must be used within a MatchingProvider');
    }
    return context;
};

export default MatchingContext; 