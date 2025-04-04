import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '../../../declarations/subscription/subscription.did';
import { _SERVICE as SubscriptionService } from '../../../declarations/subscription/subscription.did.d';

export interface SubscriptionState {
    active: boolean;
    plan: string;
    startDate: bigint;
    endDate: bigint;
}

export interface PlanDetails {
    id: string;
    name: string;
    price: number;
    features: string[];
    maxSwipes: number;
    priorityMatching: boolean;
}

class SubscriptionServiceClient {
    private actor: Actor;
    private service: SubscriptionService;

    constructor(canisterId: string, agent: HttpAgent) {
        this.actor = Actor.createActor<SubscriptionService>(idlFactory, {
            agent,
            canisterId,
        });
        this.service = this.actor;
    }

    async checkSubscription(userId: string): Promise<SubscriptionState> {
        try {
            const result = await this.service.checkSubscription(Principal.fromText(userId));
            return {
                active: result.active,
                plan: result.plan,
                startDate: result.startDate,
                endDate: result.endDate
            };
        } catch (error) {
            console.error('Error checking subscription:', error);
            throw error;
        }
    }

    async subscribe(userId: string, plan: string): Promise<void> {
        try {
            await this.service.subscribe(Principal.fromText(userId), plan);
        } catch (error) {
            console.error('Error subscribing:', error);
            throw error;
        }
    }

    async unsubscribe(userId: string): Promise<void> {
        try {
            await this.service.unsubscribe(Principal.fromText(userId));
        } catch (error) {
            console.error('Error unsubscribing:', error);
            throw error;
        }
    }

    async getSubscriptionState(userId: string): Promise<SubscriptionState> {
        try {
            const result = await this.service.getSubscriptionState(Principal.fromText(userId));
            return {
                active: result.active,
                plan: result.plan,
                startDate: result.startDate,
                endDate: result.endDate
            };
        } catch (error) {
            console.error('Error getting subscription state:', error);
            throw error;
        }
    }

    async getAvailablePlans(): Promise<PlanDetails[]> {
        try {
            const plans = await this.service.getAvailablePlans();
            return plans.map(plan => ({
                id: plan.id,
                name: plan.name,
                price: Number(plan.price),
                features: plan.features,
                maxSwipes: Number(plan.maxSwipes),
                priorityMatching: plan.priorityMatching
            }));
        } catch (error) {
            console.error('Error getting available plans:', error);
            throw error;
        }
    }
}

export default SubscriptionServiceClient; 