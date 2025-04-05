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
import Int "mo:base/Int";

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
        verificationDetails: ?VerificationDetails;
        tokenBalance: Nat;
        boostExpiry: ?Int; // New field for profile boost expiry timestamp
    };

    public type VerificationDetails = {
        verifiedAt: Int;
        verificationLevel: VerificationLevel;
        verificationProof: Text; // Hash of verification documents
        expiresAt: ?Int;
    };

    public type VerificationLevel = {
        #Basic;     // Email verification
        #Advanced; // ID verification
        #Premium;  // Video verification
    };

    // Stable storage
    private stable var profileEntries : [(ProfileId, Profile)] = [];
    private var profiles = HashMap.HashMap<ProfileId, Profile>(0, Principal.equal, Principal.hash);

    // Add subscription canister interface
    private let subscriptionCanister = actor "SUBSCRIPTION_CANISTER_ID" : actor {
        checkFeatureAccess : shared (Principal, Text) -> async Bool;
    };

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
            verificationDetails = null;
            tokenBalance = 0;
            boostExpiry = null;
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
                    verificationDetails = existingProfile.verificationDetails;
                    tokenBalance = existingProfile.tokenBalance;
                    boostExpiry = existingProfile.boostExpiry;
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
        verifiedOnly: ?Bool;
    }) : async [Profile] {
        let results = Buffer.Buffer<Profile>(0);
        let boostedResults = Buffer.Buffer<Profile>(0);
        
        for ((_, profile) in profiles.entries()) {
            if (meetsSearchCriteria(profile, criteria)) {
                // Filter by verification status if requested
                switch (criteria.verifiedOnly) {
                    case (?true) {
                        if (profile.isVerified) {
                            switch (profile.boostExpiry) {
                                case (?expiry) {
                                    if (expiry > Time.now()) {
                                        boostedResults.add(profile);
                                    } else {
                                        results.add(profile);
                                    };
                                };
                                case (null) {
                                    results.add(profile);
                                };
                            };
                        };
                    };
                    case (_) {
                        switch (profile.boostExpiry) {
                            case (?expiry) {
                                if (expiry > Time.now()) {
                                    boostedResults.add(profile);
                                } else {
                                    results.add(profile);
                                };
                            };
                            case (null) {
                                results.add(profile);
                            };
                        };
                    };
                };
            };
        };
        
        // Combine results with boosted profiles first
        for (profile in results.vals()) {
            boostedResults.add(profile);
        };
        Buffer.toArray(boostedResults)
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
    public shared(msg) func requestVerification(level: VerificationLevel, proofHash: Text) : async Result.Result<Profile, Text> {
        let caller = msg.caller;
        
        // Check if user has verification badge feature
        let canVerify = await subscriptionCanister.checkFeatureAccess(caller, "verifiedBadge");
        if (not canVerify) {
            return #err("Verification badge feature not available in your subscription plan");
        };

        switch (profiles.get(caller)) {
            case (null) {
                #err("Profile not found");
            };
            case (?profile) {
                let verificationDetails = {
                    verifiedAt = Time.now();
                    verificationLevel = level;
                    verificationProof = proofHash;
                    expiresAt = switch(level) {
                        case (#Basic) ?Int.add(Time.now(), 365 * 24 * 60 * 60 * 1000000000); // 1 year
                        case (#Advanced) ?Int.add(Time.now(), 2 * 365 * 24 * 60 * 60 * 1000000000); // 2 years
                        case (#Premium) null; // Never expires
                    };
                };

                let verifiedProfile = {
                    profile with
                    isVerified = true;
                    verificationDetails = ?verificationDetails;
                    updatedAt = Time.now();
                };
                
                profiles.put(caller, verifiedProfile);
                #ok(verifiedProfile)
            };
        }
    };

    public query func getVerificationDetails(userId: ProfileId) : async Result.Result<VerificationDetails, Text> {
        switch (profiles.get(userId)) {
            case (null) { #err("Profile not found") };
            case (?profile) {
                switch (profile.verificationDetails) {
                    case (null) { #err("Profile not verified") };
                    case (?details) {
                        // Check if verification has expired
                        switch (details.expiresAt) {
                            case (null) { #ok(details) }; // Never expires
                            case (?expiry) {
                                if (expiry > Time.now()) {
                                    #ok(details)
                                } else {
                                    #err("Verification has expired")
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    // Profile boost functionality
    public shared(msg) func boostProfile() : async Result.Result<Profile, Text> {
        let caller = msg.caller;
        
        // Check if user has profile boost feature
        let canBoost = await subscriptionCanister.checkFeatureAccess(caller, "profileBoosts");
        if (not canBoost) {
            return #err("Profile boost feature not available in your subscription plan");
        };

        switch (profiles.get(caller)) {
            case (null) {
                #err("Profile not found");
            };
            case (?profile) {
                // Set boost expiry to 24 hours from now
                let boostedProfile = {
                    profile with
                    boostExpiry = ?Int.add(Time.now(), 24 * 60 * 60 * 1000000000);
                    updatedAt = Time.now();
                };
                
                profiles.put(caller, boostedProfile);
                #ok(boostedProfile)
            };
        }
    };

    public query func isProfileBoosted(userId: ProfileId) : async Bool {
        switch (profiles.get(userId)) {
            case (null) { false };
            case (?profile) {
                switch (profile.boostExpiry) {
                    case (null) { false };
                    case (?expiry) { expiry > Time.now() };
                }
            };
        }
    };
}; 