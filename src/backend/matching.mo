import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Debug "mo:base/Debug";
import Order "mo:base/Order";
import Int "mo:base/Int";
import Float "mo:base/Float";

actor Matching {
    // Types
    type UserId = Principal;
    type MatchId = Text;
    type SwipeDirection = {
        #left;
        #right;
    };

    type Profile = {
        id: Principal;
        name: Text;
        age: Nat;
        gender: Text;
        bio: Text;
        photos: [Text];
        interests: [Text];
        location: Text;
        preferences: {
            minAge: Nat;
            maxAge: Nat;
            gender: Text;
            maxDistance: Nat;
        };
        lastActive: Int;
    };

    type Match = {
        id: Text;
        user1: Principal;
        user2: Principal;
        timestamp: Int;
        status: MatchStatus;
    };

    type MatchStatus = {
        #Pending;
        #Matched;
        #Rejected;
    };

    type SwipeAction = {
        swiper: UserId;
        swiped: UserId;
        direction: SwipeDirection;
        timestamp: Time.Time;
    };

    type MatchScore = {
        profile: Profile;
        score: Float;
    };

    // Stable storage
    private stable var matchEntries: [(Text, Match)] = [];
    private stable var swipeEntries: [(UserId, [SwipeAction])] = [];
    private stable var likeEntries : [(UserId, [UserId])] = [];

    // Runtime storage
    private var matches = HashMap.HashMap<Text, Match>(1, Text.equal, Text.hash);
    private var swipes = HashMap.HashMap<UserId, Buffer.Buffer<SwipeAction>>(0, Principal.equal, Principal.hash);
    private var likes = HashMap.HashMap<UserId, Buffer.Buffer<UserId>>(1, Principal.equal, Principal.hash);

    private stable var swipeCounters : [(Principal, Nat)] = [];
    private var dailySwipes = HashMap.HashMap<Principal, Nat>(1, Principal.equal, Principal.hash);

    private let MAX_DAILY_SWIPES_FREE = 10;
    private let MAX_DAILY_SWIPES_PREMIUM = 100;

    // Add subscription canister interface
    private let subscriptionCanister = actor "SUBSCRIPTION_CANISTER_ID" : actor {
        checkFeatureAccess : shared (Principal, Text) -> async Bool;
    };

    // Add profile canister interface
    private let profileCanister = actor "PROFILE_CANISTER_ID" : actor {
        searchProfiles : shared ({
            minAge: ?Nat;
            maxAge: ?Nat;
            gender: ?Text;
            interests: ?[Text];
            maxDistance: ?Nat;
        }) -> async [Profile];
        getProfile : shared (Principal) -> async Result.Result<Profile, Text>;
    };

    // System functions
    system func preupgrade() {
        let matchBuffer = Buffer.Buffer<(Text, Match)>(1);
        for ((t, m) in matches.entries()) {
            matchBuffer.add((t, m));
        };
        matchEntries := Buffer.toArray(matchBuffer);

        let swipeBuffer = Buffer.Buffer<(Principal, Nat)>(1);
        for ((p, n) in dailySwipes.entries()) {
            swipeBuffer.add((p, n));
        };
        swipeCounters := Buffer.toArray(swipeBuffer);
        
        // Convert Buffer to Array for stable storage
        for ((userId, buffer) in swipes.entries()) {
            swipeEntries := Array.append(swipeEntries, [(userId, Buffer.toArray(buffer))]);
        };

        let likeBuffer = Buffer.Buffer<(UserId, [UserId])>(1);
        for ((userId, likesList) in likes.entries()) {
            likeBuffer.add((userId, Buffer.toArray(likesList)));
        };
        likeEntries := Buffer.toArray(likeBuffer);
    };

    system func postupgrade() {
        // Restore matches
        for ((id, match) in matchEntries.vals()) {
            matches.put(id, match);
        };
        matchEntries := [];

        // Restore swipes
        for ((id, actions) in swipeEntries.vals()) {
            let buffer = Buffer.Buffer<SwipeAction>(actions.size());
            for (action in actions.vals()) {
                buffer.add(action);
            };
            swipes.put(id, buffer);
        };
        swipeEntries := [];

        for ((principal, count) in swipeCounters.vals()) {
            dailySwipes.put(principal, count);
        };
        swipeCounters := [];

        for ((userId, userLikes) in likeEntries.vals()) {
            let likeBuffer = Buffer.Buffer<UserId>(userLikes.size());
            for (like in userLikes.vals()) {
                likeBuffer.add(like);
            };
            likes.put(userId, likeBuffer);
        };
        likeEntries := [];
    };

    // Helper functions
    private func generateMatchId(user1: UserId, user2: UserId): MatchId {
        let user1Text = Principal.toText(user1);
        let user2Text = Principal.toText(user2);
        if (user1Text < user2Text) {
            user1Text # "-" # user2Text
        } else {
            user2Text # "-" # user1Text
        }
    };

    private func createMatch(user1: UserId, user2: UserId): Match {
        {
            id = generateMatchId(user1, user2);
            user1 = user1;
            user2 = user2;
            timestamp = Time.now();
            status = #Matched;
        }
    };

    private func _calculateMatchScore(userProfile: Profile, candidateProfile: Profile, hasPriorityMatching: Bool) : Float {
        var score : Float = 0;

        // Age preference match (0-20 points)
        if (candidateProfile.age >= userProfile.preferences.minAge and 
            candidateProfile.age <= userProfile.preferences.maxAge) {
            score += 20;
        } else {
            let ageDiff = if (candidateProfile.age < userProfile.preferences.minAge) {
                Float.fromInt(userProfile.preferences.minAge - candidateProfile.age);
            } else {
                Float.fromInt(candidateProfile.age - userProfile.preferences.maxAge);
            };
            score += Float.max(0, 20 - ageDiff);
        };

        // Gender preference match (0 or 25 points)
        if (candidateProfile.gender == userProfile.preferences.gender) {
            score += 25;
        };

        // Common interests (0-30 points)
        let userInterests = HashMap.HashMap<Text, Bool>(1, Text.equal, Text.hash);
        for (interest in userProfile.interests.vals()) {
            userInterests.put(interest, true);
        };

        var commonInterests = 0;
        for (interest in candidateProfile.interests.vals()) {
            switch (userInterests.get(interest)) {
                case (?_) { commonInterests += 1; };
                case null {};
            };
        };

        score += Float.fromInt(commonInterests) * (30 / Float.fromInt(Array.size(userProfile.interests)));

        // Location proximity (0-15 points)
        if (userProfile.location == candidateProfile.location) {
            score += 15;
        };

        // Activity score (0-10 points)
        let currentTime = Time.now();
        let hoursSinceActive = Float.fromInt(currentTime - candidateProfile.lastActive) / (3600_000_000_000);
        score += Float.max(0, 10 - hoursSinceActive / 24);

        // Priority matching bonus (20% boost)
        if (hasPriorityMatching) {
            score *= 1.2;
        };

        return score;
    };

    private func _getPotentialMatches(userProfile: Profile, hasPriorityMatching: Bool) : [MatchScore] {
        // Get potential matches based on user preferences
        let potentialProfiles = await* profileCanister.searchProfiles({
            minAge = ?userProfile.preferences.minAge;
            maxAge = ?userProfile.preferences.maxAge;
            gender = ?userProfile.preferences.gender;
            interests = null;
            maxDistance = ?userProfile.preferences.maxDistance;
        });

        let scores = Buffer.Buffer<MatchScore>(0);
        for (profile in potentialProfiles.vals()) {
            if (profile.id != userProfile.id) {
                let score = _calculateMatchScore(userProfile, profile, hasPriorityMatching);
                scores.add({
                    profile = profile;
                    score = score;
                });
            };
        };

        let scoresArray = Buffer.toArray(scores);
        Array.sort<MatchScore>(scoresArray, func(a: MatchScore, b: MatchScore) : Order.Order {
            if (a.score > b.score) { #less }
            else if (a.score < b.score) { #greater }
            else { #equal }
        });
        return scoresArray;
    };

    // Update getPotentialMatches to handle async call
    public shared(msg) func getPotentialMatches(userProfile: Profile) : async [Profile] {
        let hasPriorityMatching = await subscriptionCanister.checkFeatureAccess(msg.caller, "priorityMatching");
        let scoredMatches = await* _getPotentialMatches(userProfile, hasPriorityMatching);
        return Array.map(scoredMatches, func(m: MatchScore) : Profile = m.profile);
    };

    // Public functions
    public shared(msg) func swipe(targetId: Principal, direction: Bool) : async Result.Result<Match, Text> {
        let caller = msg.caller;
        
        // Check daily swipe limit based on subscription
        let hasPremium = await subscriptionCanister.checkFeatureAccess(caller, "priorityMatching");
        let maxSwipes = if (hasPremium) { MAX_DAILY_SWIPES_PREMIUM } else { MAX_DAILY_SWIPES_FREE };
        
        let currentSwipes = Option.get(dailySwipes.get(caller), 0);
        if (currentSwipes >= maxSwipes) {
            return #err("Daily swipe limit reached");
        };

        // Update swipe counter
        dailySwipes.put(caller, currentSwipes + 1);

        // Track like if direction is right swipe
        if (direction) {
            switch (likes.get(targetId)) {
                case (null) {
                    let newLikes = Buffer.Buffer<UserId>(1);
                    newLikes.add(caller);
                    likes.put(targetId, newLikes);
                };
                case (?existingLikes) {
                    if (not Buffer.contains<UserId>(existingLikes, caller, Principal.equal)) {
                        existingLikes.add(caller);
                        likes.put(targetId, existingLikes);
                    };
                };
            };
        };

        if (direction) {
            let matchId = Principal.toText(caller) # "_" # Principal.toText(targetId);
            let reverseMatchId = Principal.toText(targetId) # "_" # Principal.toText(caller);

            // Check if the other user has already swiped right
            switch (matches.get(reverseMatchId)) {
                case (?existingMatch) {
                    if (existingMatch.status == #Pending) {
                        let updatedMatch = {
                            id = reverseMatchId;
                            user1 = targetId;
                            user2 = caller;
                            timestamp = Time.now();
                            status = #Matched;
                        };
                        matches.put(reverseMatchId, updatedMatch);
                        return #ok(updatedMatch);
                    };
                };
                case null {
                    let newMatch = {
                        id = matchId;
                        user1 = caller;
                        user2 = targetId;
                        timestamp = Time.now();
                        status = #Pending;
                    };
                    matches.put(matchId, newMatch);
                    return #ok(newMatch);
                };
            };
        };

        #err("No match found")
    };

    public query func getMatches(userId: Principal) : async [Match] {
        let userMatches = Buffer.Buffer<Match>(0);
        for ((_, match) in matches.entries()) {
            if ((match.user1 == userId or match.user2 == userId) and match.status == #Matched) {
                userMatches.add(match);
            };
        };
        Buffer.toArray(userMatches)
    };

    public query func getMatch(matchId: MatchId): async ?Match {
        matches.get(matchId)
    };

    public shared(msg) func unmatch(matchId: MatchId): async Result.Result<Bool, Text> {
        let currentUser = msg.caller;
        
        switch (matches.get(matchId)) {
            case null { #err("Match not found") };
            case (?match) {
                if (not Principal.equal(currentUser, match.user1) and not Principal.equal(currentUser, match.user2)) {
                    return #err("Unauthorized to unmatch");
                };

                matches.delete(matchId);
                #ok(true)
            };
        }
    };

    public shared(msg) func getWhoLikedMe() : async Result.Result<[Profile], Text> {
        let caller = msg.caller;
        
        // Check if user has access to this premium feature
        let canSeeWhoLikedYou = await subscriptionCanister.checkFeatureAccess(caller, "canSeeWhoLikedYou");
        if (not canSeeWhoLikedYou) {
            return #err("This feature is only available for premium users");
        };

        switch (likes.get(caller)) {
            case (null) { #ok([]) };
            case (?userLikes) {
                let likeProfiles = Buffer.Buffer<Profile>(userLikes.size());
                for (userId in userLikes.vals()) {
                    let profile = await profileCanister.getProfile(userId);
                    switch (profile) {
                        case (#ok(p)) { likeProfiles.add(p) };
                        case (#err(_)) {}; // Skip profiles that couldn't be fetched
                    };
                };
                #ok(Buffer.toArray(likeProfiles))
            };
        }
    };

    public query func getLikeCount(userId: Principal) : async Nat {
        switch (likes.get(userId)) {
            case (null) { 0 };
            case (?userLikes) { userLikes.size() };
        }
    };
}; 