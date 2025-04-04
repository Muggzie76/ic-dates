import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../declarations/token/token.did";

export interface RewardState {
    lastRewardTime: bigint;
    dailyRewards: bigint;
    totalRewards: bigint;
}

export type RewardType = {
    Match: null;
} | {
    Message: null;
} | {
    ProfileUpdate: null;
};

export class TokenRewardService {
    private actor: any;
    private agent: HttpAgent;

    constructor(host?: string) {
        this.agent = new HttpAgent({ host: host || undefined });
        
        // Only fetch root key in development
        if (process.env.NODE_ENV !== "production") {
            this.agent.fetchRootKey().catch(err => {
                console.warn("Unable to fetch root key. Check to ensure that your local replica is running");
                console.error(err);
            });
        }

        this.actor = Actor.createActor(idlFactory, {
            agent: this.agent,
            canisterId: process.env.TOKEN_CANISTER_ID!,
        });
    }

    async distributeReward(user: Principal, rewardType: RewardType): Promise<bigint> {
        try {
            const result = await this.actor.distributeReward(user, rewardType);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error distributing reward:', error);
            throw error;
        }
    }

    async getRewardState(user: Principal): Promise<RewardState | null> {
        try {
            const result = await this.actor.getRewardState(user);
            return result || null;
        } catch (error) {
            console.error('Error getting reward state:', error);
            throw error;
        }
    }

    async getBalance(user: Principal): Promise<bigint> {
        try {
            return await this.actor.balanceOf(user);
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    async transfer(to: Principal, amount: bigint): Promise<void> {
        try {
            const result = await this.actor.transfer(to, amount);
            if ('err' in result) {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error transferring tokens:', error);
            throw error;
        }
    }
} 