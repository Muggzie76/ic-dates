import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/profile/profile.did';

export interface Location {
    latitude: number;
    longitude: number;
    city: string;
    country: string;
}

export interface Profile {
    id: Principal;
    name: string;
    age: number;
    gender: string;
    bio: string;
    photos: string[];
    interests: string[];
    location: Location;
    preferences: {
        minAge: number;
        maxAge: number;
        genderPreference: string;
        maxDistance: number;
    };
    createdAt: bigint;
    updatedAt: bigint;
    isVerified: boolean;
    tokenBalance: number;
}

export interface SearchCriteria {
    minAge?: number;
    maxAge?: number;
    gender?: string;
    interests?: string[];
    maxDistance?: number;
}

class ProfileService {
    private actor: any;
    private agent: HttpAgent;

    constructor() {
        this.agent = new HttpAgent({
            host: process.env.DFX_NETWORK || 'http://localhost:4943',
        });

        // Only in development, skip certificate verification
        if (process.env.NODE_ENV !== 'production') {
            this.agent.fetchRootKey().catch(err => {
                console.warn('Unable to fetch root key. Check to ensure that your local replica is running');
                console.error(err);
            });
        }

        this.actor = Actor.createActor(idlFactory, {
            agent: this.agent,
            canisterId: process.env.CANISTER_ID_PROFILE,
        });
    }

    async createProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt' | 'isVerified' | 'tokenBalance'>): Promise<Profile> {
        try {
            const result = await this.actor.createProfile(profile);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error creating profile:', error);
            throw error;
        }
    }

    async updateProfile(profile: Partial<Profile>): Promise<Profile> {
        try {
            const result = await this.actor.updateProfile(profile);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            throw error;
        }
    }

    async getProfile(userId: Principal): Promise<Profile> {
        try {
            const result = await this.actor.getProfile(userId);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            throw error;
        }
    }

    async searchProfiles(criteria: SearchCriteria): Promise<Profile[]> {
        try {
            return await this.actor.searchProfiles(criteria);
        } catch (error) {
            console.error('Error searching profiles:', error);
            throw error;
        }
    }

    async verifyProfile(): Promise<Profile> {
        try {
            const result = await this.actor.verifyProfile();
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error verifying profile:', error);
            throw error;
        }
    }
}

export const profileService = new ProfileService(); 