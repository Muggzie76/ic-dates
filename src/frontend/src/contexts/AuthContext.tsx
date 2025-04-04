import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthClient } from '@dfinity/auth-client';
import { HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export interface User {
    id: string;
    profile: {
        id: Principal;
        name: string;
        age: number;
        gender: string;
        bio: string;
        photos: string[];
        interests: string[];
        location: string;
        preferences: {
            minAge: number;
            maxAge: number;
            gender: string;
            maxDistance: number;
        };
        lastActive: bigint;
    };
}

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for existing session
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // TODO: Implement session check with IC
            setLoading(false);
        } catch (err) {
            setError('Failed to check session');
            setLoading(false);
        }
    };

    const login = async (username: string, password: string) => {
        try {
            setLoading(true);
            // TODO: Implement login with IC
            setUser({
                id: 'mock-user-id',
                profile: {
                    id: Principal.fromText('2vxsx-fae'),
                    name: 'John Doe',
                    age: 25,
                    gender: 'male',
                    bio: 'Love hiking and photography',
                    photos: ['/mock/profile.jpg'],
                    interests: ['hiking', 'photography', 'travel'],
                    location: 'San Francisco',
                    preferences: {
                        minAge: 23,
                        maxAge: 30,
                        gender: 'female',
                        maxDistance: 50
                    },
                    lastActive: BigInt(Date.now())
                }
            });
            setError(null);
        } catch (err) {
            setError('Failed to login');
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        try {
            setLoading(true);
            // TODO: Implement logout with IC
            setUser(null);
            setError(null);
        } catch (err) {
            setError('Failed to logout');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, error, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext; 