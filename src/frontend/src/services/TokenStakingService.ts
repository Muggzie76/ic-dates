import { Actor, HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { idlFactory } from "../../../declarations/token/token.did";

export interface StakeInfo {
    amount: bigint;
    startTime: bigint;
    duration: bigint;
    claimed: boolean;
}

export interface StakingConfig {
    minStake: bigint;
    maxStake: bigint;
    durations: bigint[];
    aprRates: bigint[];
}

export class TokenStakingService {
    private actor: any;
    private agent: HttpAgent;

    constructor(host?: string) {
        this.agent = new HttpAgent({ host: host || undefined });
        
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

    async stake(amount: bigint, durationIndex: number): Promise<void> {
        try {
            const result = await this.actor.stake(amount, durationIndex);
            if ('err' in result) {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error staking tokens:', error);
            throw error;
        }
    }

    async unstake(stakeIndex: number): Promise<bigint> {
        try {
            const result = await this.actor.unstake(stakeIndex);
            if ('ok' in result) {
                return result.ok;
            } else {
                throw new Error(result.err);
            }
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            throw error;
        }
    }

    async getStakes(user: Principal): Promise<StakeInfo[]> {
        try {
            return await this.actor.getStakes(user);
        } catch (error) {
            console.error('Error getting stakes:', error);
            throw error;
        }
    }

    async getStakingConfig(): Promise<StakingConfig> {
        try {
            return await this.actor.getStakingConfig();
        } catch (error) {
            console.error('Error getting staking config:', error);
            throw error;
        }
    }
} 