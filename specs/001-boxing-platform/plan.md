# Implementation Plan: Boxing Platform Mini-Program

**Branch**: `001-boxing-platform` | **Date**: 2025-12-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-boxing-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

A WeChat Mini-Program for collecting boxer and gym information. The app requires WeChat authorization (user info + location), supports dual roles (Boxer and Gym), enables profile creation with required/optional fields, and provides discovery/filtering capabilities for both user types. Technical approach uses WeChat Mini-Program frontend with WeChat CloudBase serverless backend (cloud functions, cloud database with transactions, cloud storage for images).

## Technical Context

**Language/Version**:
- Frontend: JavaScript/TypeScript (WeChat Mini Program framework)
- Backend: Node.js (WeChat CloudBase cloud functions)

**Primary Dependencies**:
- WeChat Mini Program SDK (wx.* APIs)
- WeChat CloudBase SDK (wx.cloud.* APIs)
- WeChat location services (wx.getLocation, wx.chooseLocation)

**Storage**:
- WeChat Cloud Database (MongoDB-like NoSQL database)
- WeChat Cloud Storage (for gym icons/images)
- Local storage for user preferences

**Testing**:
- WeChat Developer Tools simulator
- Manual testing on real devices
- Cloud function logs for debugging

**Target Platform**: WeChat Mini Program (iOS/Android)

**Project Type**: Mobile (WeChat Mini Program - single project with frontend + cloud functions)

**Performance Goals**:
- Profile list pages load within 3 seconds (SC-007)
- Filter operations complete within 2 seconds (SC-004)
- Support 10,000 Boxer profiles and 1,000 Gym profiles without degradation (SC-006)

**Constraints**:
- No external services allowed without explicit justification (Constitution Principle I)
- OpenID must never be exposed to frontend (Constitution Principle III)
- All multi-database writes must use transactions (Constitution Principle IV)
- Distance calculations accurate within 100 meters (SC-008)

**Scale/Scope**:
- 10,000 Boxer profiles
- 1,000 Gym profiles
- ~50 screens/pages including authorization, profile forms, lists, filters, details

**Language Support**:
- Simplified Chinese only
- All UI text, labels, and messages in Simplified Chinese
- No internationalization required

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **WeChat Stack First**: ✅ Using WeChat Mini Program + CloudBase exclusively. No external services proposed.
- [x] **Business Correctness**: ✅ Focus on user scenarios (authorization, profile creation, discovery). Technical choices serve business needs.
- [x] **OpenID Protection**: ✅ Cloud functions will use OpenID only server-side; frontend receives anonymized user IDs. All API responses exclude raw OpenID.
- [x] **Transaction Safety**: ✅ Profile creation with associations will use CloudBase database transactions (startTransaction, commit, rollback).
- [x] **Static Assets**: ✅ Gym icons will use Cloud Storage. UI icons will be documented with type/directory/naming for manual download.
- [x] **Constitution Compliance**: ✅ All generated code will follow constitution principles.

## Project Structure

### Documentation (this feature)

```text
specs/001-boxing-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── auth-api.md
│   ├── boxer-api.md
│   ├── gym-api.md
│   └── discovery-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
miniprogram/              # WeChat Mini Program frontend
├── pages/
│   ├── auth/            # Authorization pages
│   │   ├── login/       # WeChat authorization
│   │   └── role-select/ # Role selection
│   ├── boxer/           # Boxer role pages
│   │   ├── profile-create/  # Initial profile creation
│   │   ├── profile-edit/    # Profile editing
│   │   ├── list/            # Boxer list with filters
│   │   └── detail/          # Boxer detail view
│   ├── gym/             # Gym role pages
│   │   ├── profile-create/
│   │   ├── profile-edit/
│   │   ├── list/
│   │   └── detail/
│   └── common/          # Shared pages
│       ├── dashboard/   # Main dashboard
│       └── profile/     # User profile view
├── components/          # Reusable components
│   ├── filter-bar/     # Filter UI component
│   ├── profile-card/   # Profile card component
│   └── location-picker/ # Location selection
├── utils/              # Utility functions
│   ├── auth.js        # Authorization helpers
│   ├── request.js     # Cloud function wrapper
│   └── validation.js  # Input validation
├── styles/             # Global styles
├── images/             # Static images (UI icons)
├── app.js             # App entry point
├── app.json           # App configuration
└── app.wxss           # Global styles

cloudfunctions/         # WeChat CloudBase cloud functions (backend)
├── common/            # Shared utilities
│   └── config.js      # Cloud function configuration
├── auth/              # Authorization cloud functions
│   └── login          # User login & role check
├── boxer/             # Boxer profile operations
│   ├── create         # Create boxer profile
│   ├── update         # Update boxer profile
│   ├── get            # Get boxer profile
│   └── list           # List boxers with filters
├── gym/               # Gym profile operations
│   ├── create         # Create gym profile
│   ├── update         # Update gym profile
│   ├── get            # Get gym profile
│   └── list           # List gyms with filters
└── common/            # Shared operations
    ├── upload         # Image upload to cloud storage
    └── counters       # Count aggregations

database/              # Database design documents
└── schema.md          # Collection schemas and indexes

tests/                 # Manual test cases
└── test-scenarios.md  # Test scenarios document
```

**Structure Decision**: WeChat Mini Program structure with separated frontend (miniprogram/) and backend (cloudfunctions/). This follows WeChat's official project template and enables independent development/testing of frontend pages and cloud functions.

## Complexity Tracking

> **No constitution violations - this section left empty**

All design choices align with constitution principles. Using WeChat CloudBase native capabilities (no external services), implementing OpenID protection via server-side processing, and using CloudBase database transactions for multi-entity operations.
