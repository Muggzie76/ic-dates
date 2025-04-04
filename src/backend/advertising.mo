import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Time "mo:base/Time";
import Float "mo:base/Float";
import Order "mo:base/Order";

actor AdvertisingCanister {
    // Types
    type AdId = Text;
    type PlacementId = Text;

    type AdContent = {
        title: Text;
        description: Text;
        imageUrl: ?Text;
        targetUrl: Text;
        callToAction: Text;
    };

    type AdPlacement = {
        id: PlacementId;
        name: Text;
        description: Text;
        size: {width: Nat; height: Nat};
        position: Text;
        allowedAdTypes: [Text];
    };

    type AdMetrics = {
        impressions: Nat;
        clicks: Nat;
        lastImpressionTime: Int;
    };

    type Ad = {
        id: AdId;
        content: AdContent;
        startTime: Int;
        endTime: Int;
        status: {#active; #paused; #ended};
        targetAudience: ?{
            minAge: ?Nat;
            maxAge: ?Nat;
            gender: ?Text;
            interests: ?[Text];
        };
        metrics: AdMetrics;
        createdAt: Int;
        updatedAt: Int;
    };

    // Stable storage
    private stable var adEntries: [(AdId, Ad)] = [];
    private stable var placementEntries: [(PlacementId, AdPlacement)] = [];

    // Runtime storage
    private var ads = HashMap.HashMap<AdId, Ad>(0, Text.equal, Text.hash);
    private var placements = HashMap.HashMap<PlacementId, AdPlacement>(0, Text.equal, Text.hash);

    // System functions
    system func preupgrade() {
        adEntries := Iter.toArray(ads.entries());
        placementEntries := Iter.toArray(placements.entries());
    };

    system func postupgrade() {
        ads := HashMap.fromIter<AdId, Ad>(adEntries.vals(), 0, Text.equal, Text.hash);
        placements := HashMap.fromIter<PlacementId, AdPlacement>(placementEntries.vals(), 0, Text.equal, Text.hash);
        adEntries := [];
        placementEntries := [];
    };

    // Admin functions
    public shared(msg) func createAd(content: AdContent, startTime: Int, endTime: Int, targetAudience: ?{
        minAge: ?Nat;
        maxAge: ?Nat;
        gender: ?Text;
        interests: ?[Text];
    }) : async Result.Result<Ad, Text> {
        // Only admin can create ads
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admin can create ads");
        };

        let adId = _generateId();
        let now = Time.now();
        
        let newAd: Ad = {
            id = adId;
            content;
            startTime;
            endTime;
            status = #active;
            targetAudience;
            metrics = {
                impressions = 0;
                clicks = 0;
                lastImpressionTime = now;
            };
            createdAt = now;
            updatedAt = now;
        };

        ads.put(adId, newAd);
        #ok(newAd)
    };

    public shared(msg) func createPlacement(placement: AdPlacement) : async Result.Result<AdPlacement, Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admin can create placements");
        };

        placements.put(placement.id, placement);
        #ok(placement)
    };

    public shared(msg) func updateAdStatus(adId: AdId, status: {#active; #paused; #ended}) : async Result.Result<Ad, Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admin can update ad status");
        };

        switch (ads.get(adId)) {
            case (null) { #err("Ad not found") };
            case (?ad) {
                let updatedAd = {
                    ad with
                    status = status;
                    updatedAt = Time.now();
                };
                ads.put(adId, updatedAd);
                #ok(updatedAd)
            };
        }
    };

    // Public query functions
    public query func getAd(adId: AdId) : async Result.Result<Ad, Text> {
        switch (ads.get(adId)) {
            case (null) { #err("Ad not found") };
            case (?ad) { #ok(ad) };
        }
    };

    public query func getPlacement(placementId: PlacementId) : async Result.Result<AdPlacement, Text> {
        switch (placements.get(placementId)) {
            case (null) { #err("Placement not found") };
            case (?placement) { #ok(placement) };
        }
    };

    public query func getActiveAdsForPlacement(placementId: PlacementId) : async [Ad] {
        let now = Time.now();
        let activePlacements = Buffer.Buffer<Ad>(0);

        for ((_, ad) in ads.entries()) {
            if (ad.status == #active and ad.startTime <= now and ad.endTime >= now) {
                activePlacements.add(ad);
            };
        };

        Buffer.toArray(activePlacements)
    };

    // Targeting functions
    public query func getTargetedAdsForUser(userProfile: {
        age: ?Nat;
        gender: ?Text;
        interests: [Text];
    }, placementId: PlacementId) : async [Ad] {
        let now = Time.now();
        let matchingAds = Buffer.Buffer<Ad>(0);

        for ((_, ad) in ads.entries()) {
            if (ad.status == #active and ad.startTime <= now and ad.endTime >= now) {
                // Check if ad matches user profile
                let isMatch = switch (ad.targetAudience) {
                    case (null) true; // No targeting criteria means show to all
                    case (?targeting) {
                        var matches = true;
                        
                        // Check age constraints
                        switch (userProfile.age) {
                            case (null) (); // Skip age check if user age unknown
                            case (?age) {
                                switch (targeting.minAge) {
                                    case (null) ();
                                    case (?min) if (age < min) matches := false;
                                };
                                switch (targeting.maxAge) {
                                    case (null) ();
                                    case (?max) if (age > max) matches := false;
                                };
                            };
                        };

                        // Check gender
                        switch (targeting.gender, userProfile.gender) {
                            case (null, _) (); // No gender targeting
                            case (?targetGender, ?userGender) {
                                if (not Text.equal(targetGender, userGender)) {
                                    matches := false;
                                };
                            };
                            case (_, _) (); // Skip if either is null
                        };

                        // Check interests (match if user has any of the targeted interests)
                        switch (targeting.interests) {
                            case (null) ();
                            case (?targetInterests) {
                                if (targetInterests.size() > 0) {
                                    var hasMatchingInterest = false;
                                    for (userInterest in userProfile.interests.vals()) {
                                        for (targetInterest in targetInterests.vals()) {
                                            if (Text.equal(userInterest, targetInterest)) {
                                                hasMatchingInterest := true;
                                            };
                                        };
                                    };
                                    if (not hasMatchingInterest) {
                                        matches := false;
                                    };
                                };
                            };
                        };
                        
                        matches
                    };
                };

                if (isMatch) {
                    matchingAds.add(ad);
                };
            };
        };

        Buffer.toArray(matchingAds)
    };

    // Score-based targeting
    public query func getRankedAdsForUser(userProfile: {
        age: ?Nat;
        gender: ?Text;
        interests: [Text];
    }, placementId: PlacementId) : async [Ad] {
        let now = Time.now();
        let scoredAds = Buffer.Buffer<(Ad, Float)>(0);

        for ((_, ad) in ads.entries()) {
            if (ad.status == #active and ad.startTime <= now and ad.endTime >= now) {
                var score : Float = 1.0;

                switch (ad.targetAudience) {
                    case (null) score := 0.5; // Generic ads get base score
                    case (?targeting) {
                        // Age match score
                        switch (userProfile.age) {
                            case (?age) {
                                switch (targeting.minAge, targeting.maxAge) {
                                    case (?min, ?max) {
                                        if (age >= min and age <= max) {
                                            score := score * 1.5;
                                        };
                                    };
                                    case (_, _) ();
                                };
                            };
                            case (null) ();
                        };

                        // Gender match score
                        switch (targeting.gender, userProfile.gender) {
                            case (?targetGender, ?userGender) {
                                if (Text.equal(targetGender, userGender)) {
                                    score := score * 1.3;
                                };
                            };
                            case (_, _) ();
                        };

                        // Interest match score
                        switch (targeting.interests) {
                            case (?targetInterests) {
                                var matchingInterests = 0;
                                for (userInterest in userProfile.interests.vals()) {
                                    for (targetInterest in targetInterests.vals()) {
                                        if (Text.equal(userInterest, targetInterest)) {
                                            matchingInterests += 1;
                                        };
                                    };
                                };
                                if (matchingInterests > 0) {
                                    score := score * (1.0 + (Float.fromInt(matchingInterests) * 0.2));
                                };
                            };
                            case (null) ();
                        };
                    };
                };

                // Factor in performance metrics
                if (ad.metrics.impressions > 0) {
                    let ctr = Float.fromInt(ad.metrics.clicks) / Float.fromInt(ad.metrics.impressions);
                    score := score * (1.0 + ctr);
                };

                scoredAds.add((ad, score));
            };
        };

        // Sort ads by score in descending order
        let sortedAds = Buffer.toArray(scoredAds);
        Array.sort(sortedAds, func(a: (Ad, Float), b: (Ad, Float)) : Order {
            if (a.1 > b.1) #less
            else if (a.1 < b.1) #greater
            else #equal
        });

        Array.map(sortedAds, func(item: (Ad, Float)) : Ad { item.0 })
    };

    // Metrics tracking
    public shared(msg) func recordImpression(adId: AdId) : async Result.Result<(), Text> {
        switch (ads.get(adId)) {
            case (null) { #err("Ad not found") };
            case (?ad) {
                let updatedMetrics = {
                    impressions = ad.metrics.impressions + 1;
                    clicks = ad.metrics.clicks;
                    lastImpressionTime = Time.now();
                };
                
                let updatedAd = {
                    ad with
                    metrics = updatedMetrics;
                };
                
                ads.put(adId, updatedAd);
                #ok(())
            };
        }
    };

    public shared(msg) func recordClick(adId: AdId) : async Result.Result<(), Text> {
        switch (ads.get(adId)) {
            case (null) { #err("Ad not found") };
            case (?ad) {
                let updatedMetrics = {
                    impressions = ad.metrics.impressions;
                    clicks = ad.metrics.clicks + 1;
                    lastImpressionTime = ad.metrics.lastImpressionTime;
                };
                
                let updatedAd = {
                    ad with
                    metrics = updatedMetrics;
                };
                
                ads.put(adId, updatedAd);
                #ok(())
            };
        }
    };

    // Helper functions
    private func _isAdmin(caller: Principal) : Bool {
        // TODO: Implement proper admin check
        // For now, hardcode admin principal for testing
        let adminPrincipal = Principal.fromText("aaaaa-aa");
        Principal.equal(caller, adminPrincipal)
    };

    private func _generateId() : Text {
        // Simple implementation - in production use a more robust ID generation
        let now = Int.toText(Time.now());
        let random = Int.toText(Time.now() / 1_000_000);
        now # "-" # random
    };
}; 