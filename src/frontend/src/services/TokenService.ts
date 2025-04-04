import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/token/token.did';

class TokenService {
    private actor: any;
    private agent: HttpAgent;
    private canisterId: string = 'qci3o-6iaaa-aaaam-qcvaa-cai'; // Spare Change contract address

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
            canisterId: this.canisterId,
        });
    }

    async getBalance(principal: Principal): Promise<bigint> {
        try {
            return await this.actor.balanceOf(principal);
        } catch (error) {
            console.error('Error fetching balance:', error);
            throw error;
        }
    }

    async transfer(to: Principal, amount: bigint): Promise<boolean> {
        try {
            return await this.actor.transfer(to, amount);
        } catch (error) {
            console.error('Error transferring tokens:', error);
            throw error;
        }
    }

    async approve(spender: Principal, amount: bigint): Promise<boolean> {
        try {
            return await this.actor.approve(spender, amount);
        } catch (error) {
            console.error('Error approving tokens:', error);
            throw error;
        }
    }

    async getAllowance(owner: Principal, spender: Principal): Promise<bigint> {
        try {
            return await this.actor.allowance(owner, spender);
        } catch (error) {
            console.error('Error getting allowance:', error);
            throw error;
        }
    }

    async getTotalSupply(): Promise<bigint> {
        try {
            return await this.actor.totalSupply();
        } catch (error) {
            console.error('Error getting total supply:', error);
            throw error;
        }
    }

    async getName(): Promise<string> {
        try {
            return await this.actor.name();
        } catch (error) {
            console.error('Error getting token name:', error);
            throw error;
        }
    }

    async getSymbol(): Promise<string> {
        try {
            return await this.actor.symbol();
        } catch (error) {
            console.error('Error getting token symbol:', error);
            throw error;
        }
    }

    async getDecimals(): Promise<number> {
        try {
            return await this.actor.decimals();
        } catch (error) {
            console.error('Error getting token decimals:', error);
            throw error;
        }
    }
}

export const tokenService = new TokenService(); 