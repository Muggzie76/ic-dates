import React, { createContext, useContext, useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { useAuth } from './AuthContext';
import { tokenService } from '../services/TokenService';

interface TokenContextType {
    balance: bigint;
    symbol: string;
    name: string;
    decimals: number;
    loading: boolean;
    error: string | null;
    transfer: (to: Principal, amount: bigint) => Promise<boolean>;
    approve: (spender: Principal, amount: bigint) => Promise<boolean>;
    refreshBalance: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

export const TokenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { principal } = useAuth();
    const [balance, setBalance] = useState<bigint>(BigInt(0));
    const [symbol, setSymbol] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [decimals, setDecimals] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTokenInfo = async () => {
        try {
            const [tokenSymbol, tokenName, tokenDecimals] = await Promise.all([
                tokenService.getSymbol(),
                tokenService.getName(),
                tokenService.getDecimals()
            ]);

            setSymbol(tokenSymbol);
            setName(tokenName);
            setDecimals(tokenDecimals);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load token info');
        }
    };

    const refreshBalance = async () => {
        if (!principal) {
            setBalance(BigInt(0));
            return;
        }

        try {
            setLoading(true);
            const newBalance = await tokenService.getBalance(principal);
            setBalance(newBalance);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch balance');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTokenInfo();
    }, []);

    useEffect(() => {
        refreshBalance();
    }, [principal]);

    const transfer = async (to: Principal, amount: bigint): Promise<boolean> => {
        try {
            setLoading(true);
            const success = await tokenService.transfer(to, amount);
            if (success) {
                await refreshBalance();
            }
            return success;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to transfer tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const approve = async (spender: Principal, amount: bigint): Promise<boolean> => {
        try {
            setLoading(true);
            const success = await tokenService.approve(spender, amount);
            return success;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to approve tokens');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        balance,
        symbol,
        name,
        decimals,
        loading,
        error,
        transfer,
        approve,
        refreshBalance,
    };

    return (
        <TokenContext.Provider value={value}>
            {children}
        </TokenContext.Provider>
    );
};

export const useToken = () => {
    const context = useContext(TokenContext);
    if (context === undefined) {
        throw new Error('useToken must be used within a TokenProvider');
    }
    return context;
};

export default TokenContext; 