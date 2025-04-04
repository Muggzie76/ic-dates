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

actor Matching {
    // Types
    type UserId = Principal;
    type MatchId = Text;
    type SwipeDirection = {
        #left;
        #right;
    };

    type Match = {
        id: MatchId;
        user1: UserId;
        user2: UserId;
        timestamp: Time.Time;
        status: MatchStatus;
    };

    type MatchStatus = {
        #pending;  // When only one user has swiped right
        #matched;  // When both users have swiped right
        #expired;  // When match is no longer active
    };

    type SwipeAction = {
        swiper: UserId;
        swiped: UserId;
        direction: SwipeDirection;
        timestamp: Time.Time;
    };

    // Stable storage
    private stable var matchEntries: [(MatchId, Match)] = [];
    private stable var swipeEntries: [(UserId, [SwipeAction])] = [];

    // Runtime storage
    private var matches = HashMap.HashMap<MatchId, Match>(0, Text.equal, Text.hash);
    private var swipes = HashMap.HashMap<UserId, Buffer.Buffer<SwipeAction>>(0, Principal.equal, Principal.hash);

    // System functions
    system func preupgrade() {
        matchEntries := Iter.toArray(matches.entries());
        
        // Convert Buffer to Array for stable storage
        swipeEntries := Array.map<(UserId, Buffer.Buffer<SwipeAction>), (UserId, [SwipeAction])>(
            Iter.toArray(swipes.entries()),
            func((id, buffer): (UserId, Buffer.Buffer<SwipeAction>)): (UserId, [SwipeAction]) {
                (id, Buffer.toArray(buffer))
            }
        );
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
            status = #matched;
        }
    };

    // Public functions
    public shared(msg) func swipe(targetUser: UserId, direction: SwipeDirection): async Result.Result<Bool, Text> {
        let currentUser = msg.caller;
        
        if (Principal.equal(currentUser, targetUser)) {
            return #err("Cannot swipe on yourself");
        };

        let swipeAction: SwipeAction = {
            swiper = currentUser;
            swiped = targetUser;
            direction = direction;
            timestamp = Time.now();
        };

        // Store the swipe action
        switch (swipes.get(currentUser)) {
            case null {
                let buffer = Buffer.Buffer<SwipeAction>(1);
                buffer.add(swipeAction);
                swipes.put(currentUser, buffer);
            };
            case (?buffer) {
                buffer.add(swipeAction);
            };
        };

        // If right swipe, check for mutual match
        switch (direction) {
            case (#right) {
                switch (swipes.get(targetUser)) {
                    case null { return #ok(false) };
                    case (?targetSwipes) {
                        for (action in targetSwipes.vals()) {
                            if (Principal.equal(action.swiped, currentUser) and action.direction == #right) {
                                // Create new match
                                let match = createMatch(currentUser, targetUser);
                                matches.put(match.id, match);
                                return #ok(true);
                            };
                        };
                    };
                };
            };
            case (#left) { };
        };

        #ok(false)
    };

    public query(msg) func getMatches(): async [Match] {
        let currentUser = msg.caller;
        let userMatches = Buffer.Buffer<Match>(0);

        for (match in matches.vals()) {
            if (Principal.equal(match.user1, currentUser) or Principal.equal(match.user2, currentUser)) {
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
}; 