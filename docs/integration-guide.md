# Advertising System Integration Guide

## Overview
This guide provides detailed instructions for integrating the IC Dates advertising system into your application. The system supports various ad formats, targeting options, and analytics tracking.

## Prerequisites
- Internet Computer SDK (DFX) version 0.12.0 or higher
- Node.js 14.x or higher
- Basic understanding of Motoko and Internet Computer architecture

## Installation

### 1. Add Dependencies
Add the advertising canister to your `dfx.json`:
```json
{
  "canisters": {
    "advertising": {
      "main": "src/backend/advertising.mo",
      "type": "motoko"
    }
  }
}
```

### 2. Import Required Modules
```motoko
import Advertising "canister:advertising";
import Types "types";
```

## Basic Integration

### 1. Initialize the Ad System
```motoko
let adSystem = await Advertising.init({
  appId = "your_app_id";
  settings = {
    defaultTimeout = 5000;
    maxRetries = 3;
    cacheExpiry = 3600;
  };
});
```

### 2. Request Ads
```motoko
// Basic ad request
let ad = await Advertising.getTargetedAdsForUser({
  userId = user.id;
  placement = "feed";
  count = 1;
});

// With targeting parameters
let targetedAd = await Advertising.getTargetedAdsForUser({
  userId = user.id;
  placement = "feed";
  count = 1;
  targeting = {
    interests = ["dating", "relationships"];
    location = ?{
      latitude = 37.7749;
      longitude = -122.4194;
    };
    demographics = {
      ageRange = {min = 25; max = 35};
      gender = ?"F";
    };
  };
});
```

### 3. Track Events
```motoko
// Track impression
await Advertising.recordImpression({
  adId = ad.id;
  userId = user.id;
  timestamp = Time.now();
});

// Track click
await Advertising.recordClick({
  adId = ad.id;
  userId = user.id;
  timestamp = Time.now();
});

// Track conversion
await Advertising.recordConversion({
  adId = ad.id;
  userId = user.id;
  value = ?100.00;
  timestamp = Time.now();
});
```

## Advanced Features

### 1. A/B Testing Integration
```motoko
// Create A/B test
let test = await Advertising.createABTest({
  name = "Button Color Test";
  variants = ["#FF0000", "#00FF00"];
  targetMetric = #clicks;
  duration = 7 * 24 * 3600 * 1000000000; // 7 days
});

// Get variant for user
let variant = await Advertising.getTestVariant(test.id, user.id);

// Update test metrics
await Advertising.updateABTestMetrics(test.id, variant, #click);
```

### 2. Custom Ad Placements
```motoko
// Define custom placement
let placement = {
  id = "profile_sidebar";
  size = {width = 300; height = 250};
  position = "right";
  allowedTypes = ["image", "video"];
};

// Register placement
await Advertising.registerPlacement(placement);
```

### 3. User Consent Management
```motoko
// Check user consent
let hasConsent = await Advertising.checkUserConsent(user.id);

// Update consent
await Advertising.updateUserConsent({
  userId = user.id;
  advertising = true;
  analytics = true;
  targeting = true;
});
```

## Performance Optimization

### 1. Caching
```motoko
// Enable ad caching
await Advertising.configureCaching({
  enabled = true;
  ttl = 3600; // 1 hour
  maxSize = 1000; // entries
});

// Prefetch ads
await Advertising.prefetchAds({
  userId = user.id;
  placements = ["feed", "sidebar"];
  count = 5;
});
```

### 2. Batch Operations
```motoko
// Batch impression tracking
await Advertising.recordImpressionsBatch([
  {adId = ad1.id; userId = user.id; timestamp = Time.now()},
  {adId = ad2.id; userId = user.id; timestamp = Time.now()},
]);
```

## Error Handling
```motoko
try {
  let ad = await Advertising.getTargetedAdsForUser(params);
  // Handle success
} catch (error) {
  switch (error) {
    case (#NoAdsAvailable) {
      // Handle no ads
    };
    case (#InvalidTarget) {
      // Handle invalid targeting
    };
    case (#RateLimited) {
      // Handle rate limiting
    };
    case (#SystemError(msg)) {
      // Handle system error
    };
  };
}
```

## Monitoring Integration

### 1. Health Checks
```motoko
// Get system health
let health = await Advertising.getSystemHealth();

// Subscribe to alerts
await Advertising.subscribeToAlerts({
  endpoint = "https://your-alert-endpoint.com";
  events = [#Error, #Warning, #Info];
});
```

### 2. Performance Monitoring
```motoko
// Get performance metrics
let metrics = await Advertising.getPerformanceMetrics({
  startTime = startTimestamp;
  endTime = endTimestamp;
  metrics = [#ResponseTime, #ErrorRate, #RequestCount];
});
```

## Security Considerations

1. **API Authentication**
   - Use proper authentication for all API calls
   - Implement rate limiting
   - Validate all input parameters

2. **Data Protection**
   - Encrypt sensitive data
   - Implement proper access controls
   - Follow data retention policies

3. **GDPR Compliance**
   - Obtain and track user consent
   - Implement data deletion capabilities
   - Provide transparency in data usage

## Best Practices

1. **Ad Loading**
   - Implement lazy loading
   - Use proper error fallbacks
   - Cache ad content when possible

2. **Performance**
   - Batch API calls when possible
   - Implement proper retry logic
   - Use appropriate timeouts

3. **User Experience**
   - Load ads asynchronously
   - Provide loading states
   - Handle ad blocking gracefully

## Troubleshooting

### Common Issues

1. **Ads Not Loading**
   - Check system health status
   - Verify targeting parameters
   - Check rate limits
   - Validate API credentials

2. **Poor Performance**
   - Review caching configuration
   - Check network latency
   - Monitor system metrics
   - Optimize batch operations

3. **Integration Errors**
   - Verify API versions
   - Check error logs
   - Validate input parameters
   - Test network connectivity

## Support
- Technical documentation: docs.icdates.com/advertising-api
- Support email: api-support@icdates.com
- Issue tracker: github.com/icdates/advertising/issues 