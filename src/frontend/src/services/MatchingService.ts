import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/matching/matching.did';

export interface Match {
    id: string;
    user1: Principal;
    user2: Principal;
    timestamp: bigint;
    status: { pending: null } | { matched: null } | { expired: null };
}

export type SwipeDirection = { left: null } | { right: null };

class MatchingService {
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
            canisterId: process.env.MATCHING_CANISTER_ID,
        });
    }

    async swipe(targetUser: Principal, direction: 'left' | 'right'): Promise<boolean> {
        try {
            const swipeDirection: SwipeDirection = direction === 'right' ? { right: null } : { left: null };
            const result = await this.actor.swipe(targetUser, swipeDirection);
            
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

    async getMatches(): Promise<Match[]> {
        try {
            return await this.actor.getMatches();
        } catch (error) {
            console.error('Error fetching matches:', error);
            throw error;
        }
    }

    async getMatch(matchId: string): Promise<Match | null> {
        try {
            const result = await this.actor.getMatch(matchId);
            return result[0] || null;
        } catch (error) {
            console.error('Error fetching match:', error);
            throw error;
        }
    }

    async unmatch(matchId: string): Promise<boolean> {
        try {
            const result = await this.actor.unmatch(matchId);
            
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error unmatching:', error);
            throw error;
        }
    }
}

export const matchingService = new MatchingService(); 