import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

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

export const idlFactory = ({ IDL }: { IDL: typeof IDL }) => {
    const SubscriptionState = IDL.Record({
        active: IDL.Bool,
        plan: IDL.Text,
        startDate: IDL.Nat64,
        endDate: IDL.Nat64
    });

    const PlanDetails = IDL.Record({
        id: IDL.Text,
        name: IDL.Text,
        price: IDL.Nat64,
        features: IDL.Vec(IDL.Text),
        maxSwipes: IDL.Nat32,
        priorityMatching: IDL.Bool
    });

    return IDL.Service({
        checkSubscription: IDL.Func([IDL.Principal], [SubscriptionState], ['query']),
        subscribe: IDL.Func([IDL.Principal, IDL.Text], [], []),
        unsubscribe: IDL.Func([IDL.Principal], [], []),
        getSubscriptionState: IDL.Func([IDL.Principal], [SubscriptionState], ['query']),
        getAvailablePlans: IDL.Func([], [IDL.Vec(PlanDetails)], ['query'])
    });
}; 