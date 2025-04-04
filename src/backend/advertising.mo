import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import HashMap "mo:base/HashMap";
import Hash "mo:base/Hash";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Nat32 "mo:base/Nat32";
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

    // Analytics types
    type TimeRange = {
        startTime: Int;
        endTime: Int;
    };

    type PerformanceMetrics = {
        impressions: Nat;
        clicks: Nat;
        ctr: Float;
        conversions: Nat;
        conversionRate: Float;
        spend: Float;
        roi: Float;
    };

    type ABTest = {
        id: Text;
        name: Text;
        description: Text;
        variants: [AdContent];
        startTime: Int;
        endTime: Int;
        metrics: [(Text, PerformanceMetrics)];
        winner: ?Text;
        status: {#active; #completed; #cancelled};
    };

    // GDPR and Privacy types
    type ConsentStatus = {
        #granted;
        #denied;
        #notSet;
    };

    type UserConsent = {
        userId: Text;
        advertisingConsent: ConsentStatus;
        analyticsConsent: ConsentStatus;
        personalizationConsent: ConsentStatus;
        lastUpdated: Int;
    };

    type DataRetentionPolicy = {
        metricsRetentionDays: Nat;
        userDataRetentionDays: Nat;
        inactiveAdRetentionDays: Nat;
    };

    // Content Moderation types
    type ContentStatus = {
        #pending;
        #approved;
        #rejected;
        #flagged;
    };

    type ModerationReason = {
        #inappropriate;
        #misleading;
        #offensive;
        #spam;
        #other: Text;
    };

    type ModerationDecision = {
        status: ContentStatus;
        reason: ?ModerationReason;
        moderatorId: Text;
        timestamp: Int;
        notes: ?Text;
    };

    type AdReview = {
        adId: Text;
        content: AdContent;
        status: ContentStatus;
        decisions: [ModerationDecision];
        lastReviewedAt: Int;
    };

    // Fraud Detection types
    type FraudScore = {
        score: Float; // 0.0 to 1.0, higher means more likely to be fraud
        reasons: [Text];
        lastUpdated: Int;
    };

    type ActivityPattern = {
        userId: Text;
        ipAddress: Text;
        userAgent: Text;
        timestamp: Int;
        action: {#impression; #click};
    };

    type FraudThresholds = {
        maxClicksPerHour: Nat;
        maxImpressionsPerHour: Nat;
        maxClickThroughRate: Float;
        minTimeBetweenClicks: Int; // nanoseconds
        suspiciousIpThreshold: Nat;
    };

    // Stable storage
    private stable var adEntries: [(AdId, Ad)] = [];
    private stable var placementEntries: [(PlacementId, AdPlacement)] = [];

    // Runtime storage
    private var ads = HashMap.HashMap<AdId, Ad>(0, Text.equal, Text.hash);
    private var placements = HashMap.HashMap<PlacementId, AdPlacement>(0, Text.equal, Text.hash);

    // Analytics storage
    private var abTests = HashMap.HashMap<Text, ABTest>(0, Text.equal, Text.hash);
    private var hourlyMetrics = HashMap.HashMap<(Text, Int), PerformanceMetrics>(0, func(a: (Text, Int), b: (Text, Int)): Bool {
        Text.equal(a.0, b.0) and a.1 == b.1
    }, func(k: (Text, Int)): Hash.Hash {
        Text.hash(k.0) ^ Nat32.fromNat(Int.abs(k.1))
    });

    // Privacy storage
    private var userConsents = HashMap.HashMap<Text, UserConsent>(0, Text.equal, Text.hash);
    private stable var dataRetentionPolicy: DataRetentionPolicy = {
        metricsRetentionDays = 90;
        userDataRetentionDays = 180;
        inactiveAdRetentionDays = 365;
    };

    // Moderation storage
    private var adReviews = HashMap.HashMap<Text, AdReview>(0, Text.equal, Text.hash);
    private var moderators = HashMap.HashMap<Text, Bool>(0, Text.equal, Text.hash);

    // Fraud detection storage
    private var fraudScores = HashMap.HashMap<Text, FraudScore>(0, Text.equal, Text.hash);
    private var activityLog = HashMap.HashMap<Text, [ActivityPattern]>(0, Text.equal, Text.hash);
    private var blockedIps = HashMap.HashMap<Text, Int>(0, Text.equal, Text.hash);
    private stable var fraudThresholds: FraudThresholds = {
        maxClicksPerHour = 100;
        maxImpressionsPerHour = 1000;
        maxClickThroughRate = 0.5;
        minTimeBetweenClicks = 1_000_000_000; // 1 second
        suspiciousIpThreshold = 5;
    };

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
            status = #paused; // Start as paused until approved
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

        // Automatically submit for review
        let review: AdReview = {
            adId = adId;
            content = content;
            status = #pending;
            decisions = [];
            lastReviewedAt = now;
        };
        adReviews.put(adId, review);

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
        userId: Text;
        age: ?Nat;
        gender: ?Text;
        interests: [Text];
    }, placementId: PlacementId) : async [Ad] {
        let hasConsent = _checkUserConsent(userProfile.userId);
        if (not hasConsent) {
            // Return non-personalized ads only
            let now = Time.now();
            let activePlacements = Buffer.Buffer<Ad>(0);

            for ((_, ad) in ads.entries()) {
                if (ad.status == #active and ad.startTime <= now and ad.endTime >= now) {
                    activePlacements.add(ad);
                };
            };

            return Buffer.toArray(activePlacements);
        };

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
        let mutableArray = Array.thaw<(Ad, Float)>(sortedAds);
        Array.sortInPlace(mutableArray, func(a: (Ad, Float), b: (Ad, Float)) : Order.Order {
            if (a.1 > b.1) #less
            else if (a.1 < b.1) #greater
            else #equal
        });
        let sorted = Array.freeze(mutableArray);

        Array.map<(Ad, Float), Ad>(sorted, func((ad, _): (Ad, Float)): Ad { ad })
    };

    // Metrics tracking
    public shared(msg) func recordImpression(
        adId: AdId,
        ipAddress: Text,
        userAgent: Text
    ) : async Result.Result<(), Text> {
        let userId = Principal.toText(msg.caller);
        
        // Check for fraud
        let shouldBlock = _updateFraudScore(userId, ipAddress, userAgent, #impression);
        if (shouldBlock) {
            return #err("Activity blocked due to suspicious behavior");
        };

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
                updateMetrics(adId, #impression, 0.0);
                #ok(())
            };
        }
    };

    public shared(msg) func recordClick(
        adId: AdId,
        ipAddress: Text,
        userAgent: Text
    ) : async Result.Result<(), Text> {
        let userId = Principal.toText(msg.caller);
        
        // Check for fraud
        let shouldBlock = _updateFraudScore(userId, ipAddress, userAgent, #click);
        if (shouldBlock) {
            return #err("Activity blocked due to suspicious behavior");
        };

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
                updateMetrics(adId, #click, 0.0);
                #ok(())
            };
        }
    };

    // Analytics functions
    public shared(msg) func createABTest(
        name: Text,
        description: Text,
        variants: [AdContent],
        duration: Int
    ) : async Result.Result<Text, Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };

        let testId = _generateId();
        let now = Time.now();
        
        let test: ABTest = {
            id = testId;
            name = name;
            description = description;
            variants = variants;
            startTime = now;
            endTime = now + duration;
            metrics = Array.map<AdContent, (Text, PerformanceMetrics)>(
                variants,
                func(variant: AdContent): (Text, PerformanceMetrics) {
                    let variantId = _generateId();
                    (variantId, {
                        impressions = 0;
                        clicks = 0;
                        ctr = 0.0;
                        conversions = 0;
                        conversionRate = 0.0;
                        spend = 0.0;
                        roi = 0.0;
                    })
                }
            );
            winner = null;
            status = #active;
        };

        abTests.put(testId, test);
        #ok(testId)
    };

    public query func getABTest(testId: Text) : async ?ABTest {
        abTests.get(testId)
    };

    public query func getActiveABTests() : async [ABTest] {
        let activeTests = Buffer.Buffer<ABTest>(0);
        for ((_, test) in abTests.entries()) {
            if (test.status == #active) {
                activeTests.add(test);
            };
        };
        Buffer.toArray(activeTests)
    };

    public shared(msg) func endABTest(testId: Text) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };

        switch (abTests.get(testId)) {
            case (null) #err("Test not found");
            case (?test) {
                if (test.status != #active) {
                    return #err("Test is not active");
                };

                // Find winner based on CTR
                var bestCTR = 0.0;
                var winnerId: ?Text = null;
                
                for ((variantId, metrics) in test.metrics.vals()) {
                    if (metrics.ctr > bestCTR) {
                        bestCTR := metrics.ctr;
                        winnerId := ?variantId;
                    };
                };

                let updatedTest = {
                    test with
                    status = #completed;
                    winner = winnerId;
                    endTime = Time.now();
                };

                abTests.put(testId, updatedTest);
                #ok(())
            };
        }
    };

    // Enhanced metrics tracking
    private func updateMetrics(adId: Text, action: {#impression; #click; #conversion}, amount: Float) {
        let now = Time.now();
        let hourTimestamp = now - (now % 3600000000000);
        
        let key = (adId, hourTimestamp);
        let currentMetrics = switch (hourlyMetrics.get(key)) {
            case (null) {
                {
                    impressions = 0;
                    clicks = 0;
                    ctr = 0.0;
                    conversions = 0;
                    conversionRate = 0.0;
                    spend = 0.0;
                    roi = 0.0;
                }
            };
            case (?metrics) metrics;
        };

        let updatedMetrics = switch(action) {
            case (#impression) {
                {
                    impressions = currentMetrics.impressions + 1;
                    clicks = currentMetrics.clicks;
                    ctr = if (currentMetrics.impressions == 0) 0.0 
                          else Float.fromInt(currentMetrics.clicks) / Float.fromInt(currentMetrics.impressions + 1);
                    conversions = currentMetrics.conversions;
                    conversionRate = if (currentMetrics.impressions == 0) 0.0
                                   else Float.fromInt(currentMetrics.conversions) / Float.fromInt(currentMetrics.impressions + 1);
                    spend = currentMetrics.spend + amount;
                    roi = if (currentMetrics.spend + amount == 0.0) 0.0
                          else (currentMetrics.roi * currentMetrics.spend) / (currentMetrics.spend + amount);
                }
            };
            case (#click) {
                {
                    impressions = currentMetrics.impressions;
                    clicks = currentMetrics.clicks + 1;
                    ctr = Float.fromInt(currentMetrics.clicks + 1) / Float.fromInt(currentMetrics.impressions);
                    conversions = currentMetrics.conversions;
                    conversionRate = Float.fromInt(currentMetrics.conversions) / Float.fromInt(currentMetrics.impressions);
                    spend = currentMetrics.spend;
                    roi = currentMetrics.roi;
                }
            };
            case (#conversion) {
                {
                    impressions = currentMetrics.impressions;
                    clicks = currentMetrics.clicks;
                    ctr = currentMetrics.ctr;
                    conversions = currentMetrics.conversions + 1;
                    conversionRate = Float.fromInt(currentMetrics.conversions + 1) / Float.fromInt(currentMetrics.impressions);
                    spend = currentMetrics.spend;
                    roi = if (currentMetrics.spend == 0.0) 0.0
                          else (amount - currentMetrics.spend) / currentMetrics.spend;
                }
            };
        };

        hourlyMetrics.put(key, updatedMetrics);

        // Update A/B test metrics if ad is part of a test
        for ((testId, test) in abTests.entries()) {
            if (test.status == #active) {
                let updatedMetricsArray = Array.map<(Text, PerformanceMetrics), (Text, PerformanceMetrics)>(
                    test.metrics,
                    func((variantId, metrics): (Text, PerformanceMetrics)): (Text, PerformanceMetrics) {
                        if (Text.equal(variantId, adId)) {
                            (variantId, updatedMetrics)
                        } else {
                            (variantId, metrics)
                        }
                    }
                );

                abTests.put(testId, {test with metrics = updatedMetricsArray});
            };
        };
    };

    public shared(msg) func recordConversion(adId: Text, value: Float) : async Result.Result<(), Text> {
        switch (ads.get(adId)) {
            case (null) #err("Ad not found");
            case (?ad) {
                updateMetrics(adId, #conversion, value);
                #ok(())
            };
        }
    };

    public query func getMetrics(adId: Text, timeRange: TimeRange) : async [PerformanceMetrics] {
        let metrics = Buffer.Buffer<PerformanceMetrics>(0);
        
        for (((id, timestamp), hourMetrics) in hourlyMetrics.entries()) {
            if (Text.equal(id, adId) and 
                timestamp >= timeRange.startTime and 
                timestamp <= timeRange.endTime) {
                metrics.add(hourMetrics);
            };
        };

        Buffer.toArray(metrics)
    };

    public query func getAggregateMetrics(adId: Text, timeRange: TimeRange) : async PerformanceMetrics {
        var aggregate = {
            impressions = 0;
            clicks = 0;
            ctr = 0.0;
            conversions = 0;
            conversionRate = 0.0;
            spend = 0.0;
            roi = 0.0;
        };

        for (((id, timestamp), metrics) in hourlyMetrics.entries()) {
            if (Text.equal(id, adId) and 
                timestamp >= timeRange.startTime and 
                timestamp <= timeRange.endTime) {
                aggregate := {
                    impressions = aggregate.impressions + metrics.impressions;
                    clicks = aggregate.clicks + metrics.clicks;
                    ctr = if (aggregate.impressions == 0) 0.0 
                          else Float.fromInt(aggregate.clicks) / Float.fromInt(aggregate.impressions);
                    conversions = aggregate.conversions + metrics.conversions;
                    conversionRate = if (aggregate.impressions == 0) 0.0 
                                   else Float.fromInt(aggregate.conversions) / Float.fromInt(aggregate.impressions);
                    spend = aggregate.spend + metrics.spend;
                    roi = if (aggregate.spend + metrics.spend == 0.0) 0.0 
                          else ((metrics.roi * metrics.spend + aggregate.roi * aggregate.spend) / 
                                (metrics.spend + aggregate.spend));
                };
            };
        };

        aggregate
    };

    // GDPR compliance functions
    public shared(msg) func updateUserConsent(
        userId: Text,
        advertisingConsent: ConsentStatus,
        analyticsConsent: ConsentStatus,
        personalizationConsent: ConsentStatus
    ) : async Result.Result<(), Text> {
        let consent: UserConsent = {
            userId = userId;
            advertisingConsent = advertisingConsent;
            analyticsConsent = analyticsConsent;
            personalizationConsent = personalizationConsent;
            lastUpdated = Time.now();
        };
        userConsents.put(userId, consent);
        #ok(())
    };

    public query func getUserConsent(userId: Text) : async ?UserConsent {
        userConsents.get(userId)
    };

    public shared(msg) func deleteUserData(userId: Text) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };

        // Delete user consent data
        userConsents.delete(userId);

        // Delete user-related metrics
        let metricsToDelete = Buffer.Buffer<(Text, Int)>(0);
        for (((adId, timestamp), _) in hourlyMetrics.entries()) {
            metricsToDelete.add((adId, timestamp));
        };

        for ((adId, timestamp) in metricsToDelete.vals()) {
            hourlyMetrics.delete((adId, timestamp));
        };

        #ok(())
    };

    public shared(msg) func updateDataRetentionPolicy(
        policy: DataRetentionPolicy
    ) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };

        dataRetentionPolicy := policy;
        #ok(())
    };

    public query func getDataRetentionPolicy() : async DataRetentionPolicy {
        dataRetentionPolicy
    };

    // Data cleanup function
    public shared(msg) func cleanupExpiredData() : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };

        let now = Time.now();
        let nanosecondsPerDay = 86_400_000_000_000;

        // Clean up old metrics data
        let metricsRetentionNanos = Int.abs(dataRetentionPolicy.metricsRetentionDays * nanosecondsPerDay);
        let metricsToDelete = Buffer.Buffer<(Text, Int)>(0);
        
        for (((adId, timestamp), _) in hourlyMetrics.entries()) {
            if (now - timestamp > metricsRetentionNanos) {
                metricsToDelete.add((adId, timestamp));
            };
        };

        for ((adId, timestamp) in metricsToDelete.vals()) {
            hourlyMetrics.delete((adId, timestamp));
        };

        // Clean up inactive ads
        let inactiveAdRetentionNanos = Int.abs(dataRetentionPolicy.inactiveAdRetentionDays * nanosecondsPerDay);
        let adsToDelete = Buffer.Buffer<Text>(0);
        
        for ((adId, ad) in ads.entries()) {
            if (ad.status == #ended and (now - ad.updatedAt > inactiveAdRetentionNanos)) {
                adsToDelete.add(adId);
            };
        };

        for (adId in adsToDelete.vals()) {
            ads.delete(adId);
        };

        #ok(())
    };

    // Enhanced targeting with consent check
    private func _checkUserConsent(userId: Text) : Bool {
        switch (userConsents.get(userId)) {
            case (null) false;
            case (?consent) {
                consent.advertisingConsent == #granted and
                consent.personalizationConsent == #granted
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

    // Content moderation functions
    public shared(msg) func addModerator(moderatorId: Text) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };
        moderators.put(moderatorId, true);
        #ok(())
    };

    public shared(msg) func removeModerator(moderatorId: Text) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };
        moderators.delete(moderatorId);
        #ok(())
    };

    private func _isModerator(userId: Text) : Bool {
        switch (moderators.get(userId)) {
            case (null) false;
            case (?isMod) isMod;
        }
    };

    public shared(msg) func submitAdForReview(adId: Text) : async Result.Result<(), Text> {
        switch (ads.get(adId)) {
            case (null) #err("Ad not found");
            case (?ad) {
                let review: AdReview = {
                    adId = adId;
                    content = ad.content;
                    status = #pending;
                    decisions = [];
                    lastReviewedAt = Time.now();
                };
                adReviews.put(adId, review);
                #ok(())
            };
        }
    };

    public shared(msg) func reviewAd(
        adId: Text,
        status: ContentStatus,
        reason: ?ModerationReason,
        notes: ?Text
    ) : async Result.Result<(), Text> {
        let moderatorId = Principal.toText(msg.caller);
        if (not _isModerator(moderatorId)) {
            return #err("Unauthorized: Only moderators can review ads");
        };

        switch (adReviews.get(adId)) {
            case (null) #err("Ad review not found");
            case (?review) {
                let decision: ModerationDecision = {
                    status = status;
                    reason = reason;
                    moderatorId = moderatorId;
                    timestamp = Time.now();
                    notes = notes;
                };

                let updatedReview = {
                    review with
                    status = status;
                    decisions = Array.append(review.decisions, [decision]);
                    lastReviewedAt = Time.now();
                };

                adReviews.put(adId, updatedReview);

                // Update ad status based on moderation decision
                switch (ads.get(adId)) {
                    case (null) ();
                    case (?ad) {
                        let updatedStatus = switch (status) {
                            case (#approved) #active;
                            case (#rejected) #ended;
                            case (#flagged) #paused;
                            case (#pending) ad.status;
                        };

                        let updatedAd = {
                            ad with
                            status = updatedStatus;
                            updatedAt = Time.now();
                        };

                        ads.put(adId, updatedAd);
                    };
                };

                #ok(())
            };
        }
    };

    public query func getPendingReviews() : async [AdReview] {
        let pending = Buffer.Buffer<AdReview>(0);
        for ((_, review) in adReviews.entries()) {
            if (review.status == #pending) {
                pending.add(review);
            };
        };
        Buffer.toArray(pending)
    };

    public query func getAdReview(adId: Text) : async ?AdReview {
        adReviews.get(adId)
    };

    // Fraud detection functions
    private func _updateFraudScore(
        userId: Text,
        ipAddress: Text,
        userAgent: Text,
        action: {#impression; #click}
    ) : Bool {
        let now = Time.now();
        let hourAgo = now - 3_600_000_000_000;
        
        // Get or create activity log
        let activities = switch (activityLog.get(userId)) {
            case (null) [];
            case (?logs) Array.filter(logs, func(log: ActivityPattern) : Bool {
                log.timestamp > hourAgo
            });
        };

        // Add new activity
        let newActivity = {
            userId = userId;
            ipAddress = ipAddress;
            userAgent = userAgent;
            timestamp = now;
            action = action;
        };
        let updatedActivities = Array.append(activities, [newActivity]);
        activityLog.put(userId, updatedActivities);

        // Calculate metrics
        let clicks = Array.filter(updatedActivities, func(a: ActivityPattern) : Bool { 
            a.action == #click 
        }).size();
        let impressions = Array.filter(updatedActivities, func(a: ActivityPattern) : Bool { 
            a.action == #impression 
        }).size();
        let ctr = if (impressions == 0) 0.0 else Float.fromInt(clicks) / Float.fromInt(impressions);

        // Check for rapid clicking
        let clickTimes = Array.map(
            Array.filter(updatedActivities, func(a: ActivityPattern) : Bool { a.action == #click }),
            func(a: ActivityPattern) : Int { a.timestamp }
        );
        
        // Sort using Array functions
        let sortedClickTimes = Array.sort(clickTimes, Int.compare);
        
        var rapidClicks = false;
        if (sortedClickTimes.size() > 1) {
            for (i in Iter.range(1, sortedClickTimes.size() - 1)) {
                if (sortedClickTimes[i] - sortedClickTimes[i-1] < fraudThresholds.minTimeBetweenClicks) {
                    rapidClicks := true;
                };
            };
        };

        // Check IP address frequency
        let ipFrequency = switch (blockedIps.get(ipAddress)) {
            case (null) 1;
            case (?count) count + 1;
        };
        blockedIps.put(ipAddress, ipFrequency);

        // Calculate fraud score and reasons
        var fraudScore: Float = 0.0;
        let reasons = Buffer.Buffer<Text>(0);

        if (clicks > fraudThresholds.maxClicksPerHour) {
            fraudScore += 0.4;
            reasons.add("Excessive clicks per hour");
        };

        if (impressions > fraudThresholds.maxImpressionsPerHour) {
            fraudScore += 0.3;
            reasons.add("Excessive impressions per hour");
        };

        if (ctr > fraudThresholds.maxClickThroughRate) {
            fraudScore += 0.3;
            reasons.add("Abnormal click-through rate");
        };

        if (rapidClicks) {
            fraudScore += 0.4;
            reasons.add("Rapid successive clicks detected");
        };

        if (ipFrequency > fraudThresholds.suspiciousIpThreshold) {
            fraudScore += 0.2;
            reasons.add("Suspicious IP activity");
        };

        // Update fraud score
        fraudScores.put(userId, {
            score = fraudScore;
            reasons = Buffer.toArray(reasons);
            lastUpdated = now;
        });

        // Return true if activity should be blocked
        fraudScore >= 0.7
    };

    // Admin functions for fraud management
    public shared(msg) func updateFraudThresholds(thresholds: FraudThresholds) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };
        fraudThresholds := thresholds;
        #ok(())
    };

    public query func getFraudScore(userId: Text) : async ?FraudScore {
        fraudScores.get(userId)
    };

    public shared(msg) func clearFraudScore(userId: Text) : async Result.Result<(), Text> {
        if (not _isAdmin(msg.caller)) {
            return #err("Unauthorized");
        };
        fraudScores.delete(userId);
        activityLog.delete(userId);
        #ok(())
    };
}; 