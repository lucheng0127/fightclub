# Research: Boxing Platform Mini-Program

**Feature**: [spec.md](spec.md)
**Date**: 2025-12-26
**Phase**: 0 - Research & Technology Decisions

## Overview

This document captures research findings and technology decisions for the Boxing Platform Mini-Program. All decisions align with the Fight Club Constitution, prioritizing WeChat Mini Program + CloudBase native capabilities.

---

## Decision 1: Frontend Framework

**Chosen**: WeChat Mini Program Native Framework (WXML, WXSS, JavaScript/TypeScript)

**Rationale**:
- Specified in constitution as primary technology (Principle I)
- Native framework provides best performance and smallest bundle size
- Full access to WeChat capabilities (authorization, location, cloud services)
- Official WeChat Developer Tools support

**Alternatives Considered**:
- **Uni-app**: Cross-platform framework but adds abstraction layer; not aligned with "WeChat-first" principle
- **Taro**: React-based, adds build complexity; unnecessary for WeChat-only deployment
- **Native**: Selected for simplicity and performance

---

## Decision 2: Backend Architecture

**Chosen**: WeChat CloudBase Serverless (Cloud Functions + Cloud Database)

**Rationale**:
- Specified in user input and constitution (Principle I)
- No server management required
- Built-in database transactions for multi-entity operations (Principle IV compliance)
- Automatic scaling to handle 10,000+ profiles
- Native OpenID handling without exposing to frontend

**Alternatives Considered**:
- **Self-hosted server**: Violates constitution Principle I (external service)
- **Third-party BaaS**: Adds external dependency; WeChat CloudBase provides all needed capabilities

---

## Decision 3: Database & Transactions

**Chosen**: WeChat Cloud Database (MongoDB-like) with CloudBase Transactions

**Rationale**:
- Native NoSQL database integrated with CloudBase
- Supports database transactions (startTransaction, commit, rollback)
- Transaction safety required by constitution Principle IV
- Automatic indexing and query optimization

**Transaction Strategy**:
- Use `db.startTransaction()` for profile creation with associations
- Example: Boxer profile creation + Gym association must be atomic
- Rollback on any failure to prevent partial data

**Alternatives Considered**:
- **Manual compensating transactions**: More complex; CloudBase transactions are simpler and more reliable

---

## Decision 4: OpenID Protection

**Chosen**: Server-side OpenID handling with anonymized frontend identifiers

**Rationale**:
- Constitution Principle III (NON-NEGOTIABLE)
- Cloud functions receive OpenID via `wx.serverContext`
- Frontend never receives raw OpenID in responses
- User-specific data uses anonymized IDs (e.g., `user_id` hash)

**Implementation Pattern**:
```javascript
// Cloud function - OpenID used server-side only
const openid = cloud.getWXContext().openid;

// Frontend receives anonymized ID only
return {
  user_id: hash(openid),  // Non-reversible hash
  profile: { ... }
};
```

---

## Decision 5: Location Services

**Chosen**: WeChat Native Location APIs (wx.getLocation, wx.chooseLocation)

**Rationale**:
- Built into WeChat Mini Program framework
- No external services required
- User authorization required (privacy-compliant)
- Can reverse geocode to city for filtering

**Distance Calculation**:
- Haversine formula for distance between coordinates
- Cloud function calculates distance server-side
- Accuracy target: within 100 meters (SC-008)

**Alternatives Considered**:
- **Third-party map APIs**: Unnecessary; WeChat native APIs sufficient
- **Client-side distance calculation**: Selected for simplicity; could move to server-side if needed

---

## Decision 6: Image Storage

**Chosen**: WeChat Cloud Storage for gym icons

**Rationale**:
- Native integration with CloudBase
- Automatic CDN delivery
- Secure URL generation (temporary access tokens)
- No external storage services needed

**UI Icons**:
- Will document required icons with type, directory, naming (Constitution Principle V)
- Manual download and placement in `miniprogram/images/`

---

## Decision 7: Subscription Messages (Future)

**Chosen**: WeChat Subscription Messages (planned for future features)

**Rationale**:
- Specified in user input
- Native WeChat notification system
- Cloud functions trigger messages (idempotent)
- Send only after successful transaction

**Note**: Not required for MVP (User Stories 1-6). Future enhancement for notifications.

---

## Decision 8: Authorization Flow

**Chosen**: WeChat Silent Authorization + Button-based Explicit Authorization

**Rationale**:
- `wx.getUserProfile` for explicit user info consent (nickname, avatar)
- `wx.getLocation` for location authorization
- Graceful degradation if location denied (disable distance features)

**Flow**:
1. App launch → Check local storage for auth state
2. If not authorized → Show auth buttons
3. User grants permissions → Store auth state
4. Get OpenID via cloud function (server-side only)

---

## Decision 9: Role Management

**Chosen**: Single User with Multiple Roles (Boxer and/or Gym)

**Rationale**:
- User has one OpenID (one WeChat account)
- User can create both Boxer and Gym profiles
- Role selection on app entry (if both exist)
- Last used role remembered

**Data Model**:
```
User (openid)
├── BoxerProfile (optional)
└── GymProfile (optional)
```

---

## Decision 10: Filtering & Query Strategy

**Chosen**: Cloud Database Queries with Compound Indexes

**Rationale**:
- Native Cloud Database query capabilities
- Compound indexes on filter fields (city, age, weight, location)
- Server-side filtering for performance
- Pagination for large result sets (10,000+ profiles)

**Query Examples**:
- Boxers by city: `db.collection('boxers').where({ city: 'Beijing' })`
- Boxers by age range: Calculate from birthdate server-side
- Gyms by distance: Server-side calculation with user location

---

## Summary Table

| Area | Decision | Constitution Alignment |
|------|----------|------------------------|
| Frontend | WeChat Mini Program Native | ✅ Principle I |
| Backend | CloudBase Serverless | ✅ Principle I |
| Database | Cloud Database + Transactions | ✅ Principle IV |
| OpenID | Server-side only, anonymized IDs | ✅ Principle III |
| Location | WeChat native APIs | ✅ Principle I |
| Storage | Cloud Storage + manual UI icons | ✅ Principle V |
| Notifications | Subscription Messages (future) | ✅ User input |

---

## Open Questions Resolved

All technical clarifications from spec have been addressed:

1. **Age calculation**: Server-side from birthdate
2. **Distance calculation**: Haversine formula, accuracy ±100m
3. **Large dataset performance**: Compound indexes + pagination
4. **Under-18 handling**: No age restriction in spec; age used for filtering only
5. **Gym location**: Required during creation via `wx.chooseLocation`
6. **Orphaned Gym associations**: Display Gym name but show "removed" status

---

## Next Steps

Phase 1 will produce:
- [data-model.md](data-model.md) - Database schema and relationships
- [contracts/](contracts/) - API contracts for each cloud function
- [quickstart.md](quickstart.md) - Development setup guide
