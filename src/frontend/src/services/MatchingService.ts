import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/matching/matching.did';
import { _SERVICE as MatchingService } from '../../../declarations/matching/matching.did.d';

declare global {
    interface Window {
        ic: {
            agent: HttpAgent;
        };
    }
}

export interface Profile {
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
}

export interface Match {
    id: string;
    user1: Principal;
    user2: Principal;
    timestamp: bigint;
    status: 'Pending' | 'Matched' | 'Rejected';
}

class MatchingServiceClient {
    private actor: Actor;
    private service: MatchingService;

    constructor(canisterId: string, agent: HttpAgent) {
        this.actor = Actor.createActor<MatchingService>(idlFactory, {
            agent,
            canisterId,
        });
        this.service = this.actor;
    }

    async getPotentialMatches(userProfile: Profile, hasPriorityMatching: boolean): Promise<Profile[]> {
        try {
            return await this.service.getPotentialMatches(userProfile, hasPriorityMatching);
        } catch (error) {
            console.error('Error getting potential matches:', error);
            throw error;
        }
    }

    async swipe(targetId: Principal, direction: boolean): Promise<Match> {
        try {
            const result = await this.service.swipe(targetId, direction);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error swiping:', error);
            throw error;
        }
    }

    async getMatches(userId: Principal): Promise<Match[]> {
        try {
            return await this.service.getMatches(userId);
        } catch (error) {
            console.error('Error getting matches:', error);
            throw error;
        }
    }

    async getDailySwipesRemaining(userId: Principal): Promise<number> {
        try {
            return await this.service.getDailySwipesRemaining(userId);
        } catch (error) {
            console.error('Error getting daily swipes remaining:', error);
            throw error;
        }
    }
}

export default MatchingServiceClient; 