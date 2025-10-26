# Generate Outfit Edge Function

## Overview
Robust edge function for AI-powered outfit generation with comprehensive error handling, request validation, and retry logic.

## Features Implemented

### 1. Request Validation with Zod
- ✅ Strict TypeScript type checking
- ✅ Input validation for all request parameters
- ✅ Length limits and format validation
- ✅ Clear validation error messages

**Schema Location**: `schema.ts`

### 2. Authentication & Authorization
- ✅ JWT validation enforced (via `verify_jwt = true` in config.toml)
- ✅ User ID verification from JWT token
- ✅ Authorization check (authenticated user must match requested user)
- ✅ 401 Unauthorized for missing auth
- ✅ 403 Forbidden for authorization mismatches

### 3. Robust Error Handling
- ✅ Proper HTTP status codes (4xx for client errors, 5xx for server errors)
- ✅ Structured error responses with error codes
- ✅ Specific error handling for:
  - Rate limiting (429)
  - Authentication errors (401)
  - Authorization errors (403)
  - Validation errors (400)
  - AI service errors (429, 402, 500)
  - Database errors (500)

### 4. Exponential Backoff Retry
- ✅ Automatic retry for transient failures
- ✅ Exponential backoff with configurable parameters
- ✅ Max retries: 3
- ✅ Retry on: 408, 429, 500, 502, 503, 504 status codes
- ✅ Backoff timing: 1s, 2s, 4s, 8s (up to 10s max)

**Implementation**: `utils.ts` - `withRetry()` function

### 5. Structured Logging
- ✅ JSON-formatted logs
- ✅ Log levels: INFO, WARN, ERROR
- ✅ Contextual metadata in logs
- ✅ Timestamps on all logs
- ✅ Request tracing with processing time

**Implementation**: `utils.ts` - `Logger` class

### 6. Structured JSON Response
```typescript
// Success Response
{
  "success": true,
  "data": {
    "outfit": { /* outfit data */ },
    "recommendedClothes": [ /* clothes array */ ],
    "structuredOutfit": { /* structured format */ }
  },
  "meta": {
    "processingTimeMs": 1234,
    "clothesAnalyzed": 45,
    "pinterestTrendsUsed": true,
    "imageGenerated": false
  },
  "timestamp": "2025-01-10T12:34:56.789Z"
}

// Error Response
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": { /* optional additional context */ }
  }
}
```

## API Documentation

### Endpoint
`POST /functions/v1/generate-outfit`

### Authentication
**Required**: Bearer token (JWT) in Authorization header

### Request Body Schema
```typescript
{
  prompt: string;              // Required, 1-1000 chars
  mood?: string;               // Optional mood selector
  userId: string;              // Required UUID (must match JWT subject)
  isPublic?: boolean;          // Default: true
  pinterestBoardId?: string;   // Optional Pinterest integration
  selectedItem?: ClothingItem | ClothingItem[]; // Optional selected items
  purchaseLinks?: PurchaseLink[];  // Optional shopping links
  weatherData?: WeatherData;   // Optional weather context
  userPreferences?: UserPreferences; // Optional style preferences
  pinterestContext?: string;   // Optional Pinterest context
  pinterestPins?: PinterestPin[]; // Optional Pinterest pins
  generateImage?: boolean;     // Default: false (AI image generation)
}
```

### Response Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | Success | Outfit generated successfully |
| 400 | Bad Request | Invalid request data or no clothes in wardrobe |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User not authorized for requested userId |
| 429 | Rate Limited | Too many requests (10 per minute limit) |
| 500 | Server Error | Internal server error or AI service failure |
| 502 | Bad Gateway | Upstream service (AI) unavailable |

### Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `VALIDATION_ERROR` | Request validation failed | Check request format and required fields |
| `UNAUTHENTICATED` | Missing authentication | Provide valid JWT token |
| `FORBIDDEN` | Authorization failed | Ensure userId matches authenticated user |
| `RATE_LIMIT_EXCEEDED` | Too many requests | Wait 1 minute before retrying |
| `NO_CLOTHES` | Empty wardrobe | Upload clothing items first |
| `DATABASE_ERROR` | Database operation failed | Retry request |
| `AI_RATE_LIMIT` | AI service rate limited | Wait and retry |
| `AI_CREDITS_EXHAUSTED` | AI credits depleted | Contact support |
| `SERVICE_MISCONFIGURED` | Missing API keys | Contact administrator |

## Security Features

1. **JWT Validation**: Enforced at the Supabase gateway level
2. **User Authorization**: Explicit check that authenticated user matches requested user
3. **Input Validation**: Zod schemas prevent injection attacks
4. **Rate Limiting**: 10 requests per minute per user
5. **CORS**: Configurable allowed origin via `ALLOWED_ORIGIN` env var

## Monitoring & Debugging

### Structured Logs
All logs are JSON-formatted for easy parsing:

```json
{
  "level": "INFO",
  "context": "generate-outfit",
  "message": "Request validated successfully",
  "timestamp": "2025-01-10T12:34:56.789Z",
  "userId": "uuid",
  "mood": "casual",
  "hasWeather": true
}
```

### Key Metrics in Response
- `processingTimeMs`: Total request processing time
- `clothesAnalyzed`: Number of wardrobe items analyzed
- `pinterestTrendsUsed`: Whether Pinterest was used
- `imageGenerated`: Whether AI image was created

## Performance Optimizations

1. **Retry Logic**: Automatic recovery from transient failures
2. **Rate Limiting**: Prevents API abuse
3. **Async Texture Generation**: Non-blocking texture map generation
4. **Request Validation**: Early rejection of invalid requests

## Environment Variables Required

```bash
LOVABLE_API_KEY=<ai-gateway-key>
SUPABASE_URL=<supabase-project-url>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
ALLOWED_ORIGIN=<cors-allowed-origin> # Default: *
```

## Testing

### Valid Request Example
```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-outfit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Casual weekend brunch outfit",
    "mood": "casual",
    "userId": "user-uuid-here",
    "isPublic": true,
    "generateImage": false
  }'
```

### Expected Success Response
```json
{
  "success": true,
  "data": {
    "outfit": { ... },
    "recommendedClothes": [ ... ],
    "structuredOutfit": { ... }
  },
  "meta": {
    "processingTimeMs": 2340,
    "clothesAnalyzed": 32
  },
  "timestamp": "2025-01-10T12:34:56.789Z"
}
```

## Future Improvements

- [ ] Add request ID for distributed tracing
- [ ] Implement circuit breaker pattern for AI service
- [ ] Add Sentry integration for error tracking
- [ ] Cache frequent outfit requests
- [ ] Add webhook support for async processing
- [ ] Implement batch outfit generation
