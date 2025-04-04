import { Principal } from '@dfinity/principal';
import { ActorMethod } from '@dfinity/agent';

export interface SubscriptionState {
    active: boolean;
    plan: string;
    startDate: bigint;
    endDate: bigint;
}

export interface PlanDetails {
    id: string;
    name: string;
    price: bigint;
    features: string[];
    maxSwipes: bigint;
    priorityMatching: boolean;
}

export interface _SERVICE {
    checkSubscription: ActorMethod<[Principal], SubscriptionState>;
    subscribe: ActorMethod<[Principal, string], void>;
    unsubscribe: ActorMethod<[Principal], void>;
    getSubscriptionState: ActorMethod<[Principal], SubscriptionState>;
    getAvailablePlans: ActorMethod<[], PlanDetails[]>;
} 