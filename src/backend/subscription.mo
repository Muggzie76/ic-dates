import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Debug "mo:base/Debug";
import Error "mo:base/Error";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";

actor Subscription {
    // Subscription tiers
    public type SubscriptionTier = {
        #Free;
        #Basic;
        #Premium;
        #VIP;
    };

    // Subscription features
    public type Features = {
        maxSwipesPerDay: Nat;
        maxMessagesPerDay: Nat;
        canSeeWhoLikedYou: Bool;
        priorityMatching: Bool;
        profileBoosts: Nat;
        hideAds: Bool;
        verifiedBadge: Bool;
        customTheme: Bool;
    };

    // Subscription plan details
    public type PlanDetails = {
        tier: SubscriptionTier;
        pricePerMonth: Nat;
        features: Features;
    };

    // Subscription state for a user
    public type SubscriptionState = {
        tier: SubscriptionTier;
        startTime: Int;
        endTime: Int;
        autoRenew: Bool;
        features: Features;
    };

    // Stable storage
    private stable var subscriptionEntries : [(Principal, SubscriptionState)] = [];

    // Runtime storage
    private var subscriptions = HashMap.HashMap<Principal, SubscriptionState>(1, Principal.equal, Principal.hash);

    // Plan configurations
    private let FREE_PLAN : PlanDetails = {
        tier = #Free;
        pricePerMonth = 0;
        features = {
            maxSwipesPerDay = 10;
            maxMessagesPerDay = 5;
            canSeeWhoLikedYou = false;
            priorityMatching = false;
            profileBoosts = 0;
            hideAds = false;
            verifiedBadge = false;
            customTheme = false;
        };
    };

    private let BASIC_PLAN : PlanDetails = {
        tier = #Basic;
        pricePerMonth = 500; // 500 DINNER tokens
        features = {
            maxSwipesPerDay = 50;
            maxMessagesPerDay = 25;
            canSeeWhoLikedYou = false;
            priorityMatching = false;
            profileBoosts = 1;
            hideAds = true;
            verifiedBadge = false;
            customTheme = false;
        };
    };

    private let PREMIUM_PLAN : PlanDetails = {
        tier = #Premium;
        pricePerMonth = 1000; // 1000 DINNER tokens
        features = {
            maxSwipesPerDay = 100;
            maxMessagesPerDay = 100;
            canSeeWhoLikedYou = true;
            priorityMatching = true;
            profileBoosts = 3;
            hideAds = true;
            verifiedBadge = true;
            customTheme = false;
        };
    };

    private let VIP_PLAN : PlanDetails = {
        tier = #VIP;
        pricePerMonth = 2000; // 2000 DINNER tokens
        features = {
            maxSwipesPerDay = 1000;
            maxMessagesPerDay = 1000;
            canSeeWhoLikedYou = true;
            priorityMatching = true;
            profileBoosts = 10;
            hideAds = true;
            verifiedBadge = true;
            customTheme = true;
        };
    };

    // System functions
    system func preupgrade() {
        subscriptionEntries := Iter.toArray(subscriptions.entries());
    };

    system func postupgrade() {
        for ((principal, state) in subscriptionEntries.vals()) {
            subscriptions.put(principal, state);
        };
        subscriptionEntries := [];
    };

    // Helper functions
    private func _getPlanDetails(tier: SubscriptionTier) : PlanDetails {
        switch(tier) {
            case (#Free) FREE_PLAN;
            case (#Basic) BASIC_PLAN;
            case (#Premium) PREMIUM_PLAN;
            case (#VIP) VIP_PLAN;
        }
    };

    private func _isSubscriptionActive(state: SubscriptionState) : Bool {
        let currentTime = Time.now();
        currentTime >= state.startTime and currentTime <= state.endTime
    };

    // Public functions
    public shared(msg) func subscribe(tier: SubscriptionTier, months: Nat) : async Result.Result<SubscriptionState, Text> {
        let caller = msg.caller;
        let plan = _getPlanDetails(tier);
        let currentTime = Time.now();
        
        // Calculate subscription period
        let startTime = currentTime;
        let endTime = currentTime + (months * 30 * 24 * 60 * 60 * 1000000000);

        let newState = {
            tier = tier;
            startTime = startTime;
            endTime = endTime;
            autoRenew = true;
            features = plan.features;
        };

        // TODO: Implement token payment integration
        // For now, just update the subscription state
        subscriptions.put(caller, newState);
        #ok(newState)
    };

    public shared(msg) func cancelSubscription() : async Result.Result<(), Text> {
        let caller = msg.caller;
        switch (subscriptions.get(caller)) {
            case (?state) {
                let updatedState = {
                    tier = state.tier;
                    startTime = state.startTime;
                    endTime = state.endTime;
                    autoRenew = false;
                    features = state.features;
                };
                subscriptions.put(caller, updatedState);
                #ok(())
            };
            case null #err("No active subscription found");
        }
    };

    public query func getSubscriptionState(user: Principal) : async ?SubscriptionState {
        subscriptions.get(user)
    };

    public query func getAvailablePlans() : async [PlanDetails] {
        [FREE_PLAN, BASIC_PLAN, PREMIUM_PLAN, VIP_PLAN]
    };

    public query func checkFeatureAccess(user: Principal, feature: Text) : async Bool {
        switch (subscriptions.get(user)) {
            case (?state) {
                if (not _isSubscriptionActive(state)) {
                    return false;
                };

                switch(feature) {
                    case "maxSwipesPerDay" state.features.maxSwipesPerDay > FREE_PLAN.features.maxSwipesPerDay;
                    case "maxMessagesPerDay" state.features.maxMessagesPerDay > FREE_PLAN.features.maxMessagesPerDay;
                    case "canSeeWhoLikedYou" state.features.canSeeWhoLikedYou;
                    case "priorityMatching" state.features.priorityMatching;
                    case "profileBoosts" state.features.profileBoosts > 0;
                    case "hideAds" state.features.hideAds;
                    case "verifiedBadge" state.features.verifiedBadge;
                    case "customTheme" state.features.customTheme;
                    case _ false;
                }
            };
            case null false;
        }
    };
}; 