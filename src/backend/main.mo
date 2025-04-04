import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Principal "mo:base/Principal";
import Time "mo:base/Time";

actor TinderClone {
    type Profile = {
        id: Principal;
        name: Text;
        age: Nat;
        bio: Text;
        photos: [Blob];
        interests: [Text];
        createdAt: Int;
    };

    type Match = {
        id: Principal;
        user1: Principal;
        user2: Principal;
        timestamp: Int;
        status: Text;
    };

    type Message = {
        id: Principal;
        sender: Principal;
        receiver: Principal;
        content: Text;
        timestamp: Int;
    };

    // Storage
    private var profiles = HashMap.HashMap<Principal, Profile>(0, Principal.equal, Principal.hash);
    private var matches = HashMap.HashMap<Principal, Match>(0, Principal.equal, Principal.hash);
    private var messages = HashMap.HashMap<Principal, Message>(0, Principal.equal, Principal.hash);

    // Profile Management
    public func createProfile(profile: Profile) : async Profile {
        profiles.put(profile.id, profile);
        return profile;
    };

    public func getProfile(id: Principal) : async ?Profile {
        return profiles.get(id);
    };

    public func updateProfile(profile: Profile) : async Profile {
        profiles.put(profile.id, profile);
        return profile;
    };

    // Matching System
    public func findMatches(user: Principal) : async [Match] {
        let userMatches = Buffer.Buffer<Match>(0);
        for ((id, match) in matches.entries()) {
            if (match.user1 == user or match.user2 == user) {
                userMatches.add(match);
            }
        };
        return Buffer.toArray(userMatches);
    };

    public func createMatch(user1: Principal, user2: Principal) : async Match {
        let match = {
            id = Principal.fromText("match-" # Principal.toText(user1) # "-" # Principal.toText(user2));
            user1 = user1;
            user2 = user2;
            timestamp = Time.now();
            status = "pending";
        };
        matches.put(match.id, match);
        return match;
    };

    // Messaging System
    public func sendMessage(message: Message) : async Message {
        messages.put(message.id, message);
        return message;
    };

    public func getConversation(user1: Principal, user2: Principal) : async [Message] {
        let conversation = Buffer.Buffer<Message>(0);
        for ((id, message) in messages.entries()) {
            if ((message.sender == user1 and message.receiver == user2) or 
                (message.sender == user2 and message.receiver == user1)) {
                conversation.add(message);
            }
        };
        return Buffer.toArray(conversation);
    };
}; 