import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Debug "mo:base/Debug";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";

actor Profile {
    // Types
    public type ProfileId = Principal;
    
    public type Location = {
        latitude: Float;
        longitude: Float;
        city: Text;
        country: Text;
    };

    public type Profile = {
        id: ProfileId;
        name: Text;
        age: Nat;
        gender: Text;
        bio: Text;
        photos: [Text]; // IPFS hashes
        interests: [Text];
        location: Location;
        preferences: {
            minAge: Nat;
            maxAge: Nat;
            genderPreference: Text;
            maxDistance: Nat; // in kilometers
        };
        createdAt: Int;
        updatedAt: Int;
        isVerified: Bool;
        tokenBalance: Nat;
    };

    // Stable storage
    private stable var profileEntries : [(ProfileId, Profile)] = [];
    private var profiles = HashMap.HashMap<ProfileId, Profile>(0, Principal.equal, Principal.hash);

    // System functions
    system func preupgrade() {
        profileEntries := Iter.toArray(profiles.entries());
    };

    system func postupgrade() {
        profiles := HashMap.fromIter<ProfileId, Profile>(profileEntries.vals(), 0, Principal.equal, Principal.hash);
        profileEntries := [];
    };

    // Profile Management Functions
    public shared(msg) func createProfile(profile: Profile) : async Result.Result<Profile, Text> {
        let caller = msg.caller;
        
        // Validation
        if (Option.isSome(profiles.get(caller))) {
            return #err("Profile already exists");
        };
        
        if (profile.age < 18) {
            return #err("Must be 18 or older");
        };
        
        let newProfile = {
            id = caller;
            name = profile.name;
            age = profile.age;
            gender = profile.gender;
            bio = profile.bio;
            photos = profile.photos;
            interests = profile.interests;
            location = profile.location;
            preferences = profile.preferences;
            createdAt = Time.now();
            updatedAt = Time.now();
            isVerified = false;
            tokenBalance = 0;
        };

        profiles.put(caller, newProfile);
        #ok(newProfile)
    };

    public shared(msg) func updateProfile(profile: Profile) : async Result.Result<Profile, Text> {
        let caller = msg.caller;
        
        switch (profiles.get(caller)) {
            case (null) {
                #err("Profile not found");
            };
            case (?existingProfile) {
                let updatedProfile = {
                    id = caller;
                    name = profile.name;
                    age = profile.age;
                    gender = profile.gender;
                    bio = profile.bio;
                    photos = profile.photos;
                    interests = profile.interests;
                    location = profile.location;
                    preferences = profile.preferences;
                    createdAt = existingProfile.createdAt;
                    updatedAt = Time.now();
                    isVerified = existingProfile.isVerified;
                    tokenBalance = existingProfile.tokenBalance;
                };
                
                profiles.put(caller, updatedProfile);
                #ok(updatedProfile)
            };
        }
    };

    public query func getProfile(userId: ProfileId) : async Result.Result<Profile, Text> {
        switch (profiles.get(userId)) {
            case (null) { #err("Profile not found") };
            case (?profile) { #ok(profile) };
        }
    };

    public query func searchProfiles(criteria: {
        minAge: ?Nat;
        maxAge: ?Nat;
        gender: ?Text;
        interests: ?[Text];
        maxDistance: ?Nat;
    }) : async [Profile] {
        let results = Buffer.Buffer<Profile>(0);
        
        for ((_, profile) in profiles.entries()) {
            if (meetsSearchCriteria(profile, criteria)) {
                results.add(profile);
            };
        };
        
        Buffer.toArray(results)
    };

    // Helper Functions
    private func meetsSearchCriteria(profile: Profile, criteria: {
        minAge: ?Nat;
        maxAge: ?Nat;
        gender: ?Text;
        interests: ?[Text];
        maxDistance: ?Nat;
    }) : Bool {
        switch(criteria.minAge) {
            case (?min) if (profile.age < min) return false;
            case (null) {};
        };
        
        switch(criteria.maxAge) {
            case (?max) if (profile.age > max) return false;
            case (null) {};
        };
        
        switch(criteria.gender) {
            case (?g) if (profile.gender != g) return false;
            case (null) {};
        };
        
        switch(criteria.interests) {
            case (?interests) {
                let hasCommonInterest = Array.find<Text>(interests, func(interest) {
                    Array.find<Text>(profile.interests, func(profileInterest) {
                        interest == profileInterest
                    }) != null
                }) != null;
                if (not hasCommonInterest) return false;
            };
            case (null) {};
        };
        
        true
    };

    // Verification Functions
    public shared(msg) func verifyProfile() : async Result.Result<Profile, Text> {
        let caller = msg.caller;
        
        switch (profiles.get(caller)) {
            case (null) {
                #err("Profile not found");
            };
            case (?profile) {
                let verifiedProfile = {
                    profile with
                    isVerified = true;
                    updatedAt = Time.now();
                };
                
                profiles.put(caller, verifiedProfile);
                #ok(verifiedProfile)
            };
        }
    };
}; 