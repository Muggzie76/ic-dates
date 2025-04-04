import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { profileService, Profile } from '../services/ProfileService';

interface ProfileContextType {
    profile: Profile | null;
    loading: boolean;
    error: string | null;
    updateProfile: (profile: Profile) => Promise<void>;
    createProfile: (profile: Profile) => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { principal } = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshProfile = async () => {
        if (!principal) {
            setProfile(null);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const fetchedProfile = await profileService.getProfile(principal);
            setProfile(fetchedProfile);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch profile');
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshProfile();
    }, [principal]);

    const updateProfile = async (updatedProfile: Profile) => {
        try {
            setLoading(true);
            await profileService.updateProfile(updatedProfile);
            setProfile(updatedProfile);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const createProfile = async (newProfile: Profile) => {
        try {
            setLoading(true);
            await profileService.createProfile(newProfile);
            setProfile(newProfile);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create profile');
            throw err;
        } finally {
            setLoading(false);
        }
    };

    const value = {
        profile,
        loading,
        error,
        updateProfile,
        createProfile,
        refreshProfile,
    };

    return (
        <ProfileContext.Provider value={value}>
            {children}
        </ProfileContext.Provider>
    );
};

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (context === undefined) {
        throw new Error('useProfile must be used within a ProfileProvider');
    }
    return context;
};

export default ProfileContext; 