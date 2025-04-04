import { Principal } from '@dfinity/principal';
import { ActorMethod } from '@dfinity/agent';

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
    status: { 'Pending': null } | { 'Matched': null } | { 'Rejected': null };
}

export interface MatchResult {
    ok: Match;
    err: string;
}

export interface _SERVICE {
    getPotentialMatches: ActorMethod<[Profile, boolean], Profile[]>;
    swipe: ActorMethod<[Principal, boolean], MatchResult>;
    getMatches: ActorMethod<[Principal], Match[]>;
    getDailySwipesRemaining: ActorMethod<[Principal], number>;
} 