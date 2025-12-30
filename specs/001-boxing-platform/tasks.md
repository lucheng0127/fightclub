---

description: "Task list for feature implementation"
---

# Tasks: Boxing Platform Mini-Program

**Input**: Design documents from `/specs/001-boxing-platform/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual testing only (simulator + real device). No automated test tasks.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **WeChat Mini Program**: `miniprogram/` for frontend, `cloudfunctions/` for backend
- Paths follow project structure from plan.md

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create WeChat Mini Program project in WeChat Developer Tools
- [X] T002 Initialize CloudBase environment and note Environment ID
- [X] T003 [P] Create miniprogram directory structure (pages/, components/, utils/, styles/, images/)
- [X] T004 [P] Create cloudfunctions directory structure (auth/, boxer/, gym/, common/)
- [X] T005 [P] Configure app.json with all page routes and permissions
- [X] T006 [P] Create app.js with CloudBase initialization
- [X] T007 [P] Create global styles in app.wxss
- [X] T008 [P] Create sitemap.json for SEO configuration

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T009 Create database collections (users, boxers, gyms, counters) in CloudBase console
- [ ] T010 Create database indexes (openid, user_id, city, location geospatial) via console or function
- [ ] T011 Initialize counter documents (boxer_count: 0, gym_count: 0) in counters collection
- [X] T012 [P] Create shared utility file miniprogram/utils/request.js for cloud function wrapper
- [X] T013 [P] Create shared utility file miniprogram/utils/auth.js for authorization helpers
- [X] T014 [P] Create shared utility file miniprogram/utils/validation.js for input validation
- [X] T015 [P] Create shared utility file cloudfunctions/common/config.js for cloud function configuration
- [X] T016 Implement OpenID hash function in cloudfunctions/common/config.js (non-reversible, for frontend IDs)
- [X] T017 [P] Create reusable filter-bar component in miniprogram/components/filter-bar/
- [X] T018 [P] Create reusable profile-card component in miniprogram/components/profile-card/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - User Authorization & Role Selection (Priority: P1) 🎯 MVP

**Goal**: First-time users can authorize (user info + location) and select their role (Boxer/Gym) to enter the app

**Independent Test**: Open app → authorize → select role → verify correct entry screen. Test with denied location (distance features disabled).

### Backend Implementation

- [X] T019 [US1] Create cloud function cloudfunctions/auth/login/index.js with user login logic
- [X] T020 [US1] Implement openid retrieval via cloud.getWXContext() in auth/login function
- [X] T021 [US1] Implement user creation in users collection for new users (auth/login)
- [X] T022 [US1] Implement role detection (has_boxer_profile, has_gym_profile) in auth/login
- [X] T023 [US1] Implement anonymized user_id generation using hash function in auth/login
- [X] T024 [US1] Add package.json for auth/login cloud function
- [X] T025 [US1] Deploy auth/login cloud function to CloudBase

### Frontend - Authorization Pages

- [X] T026 [P] [US1] Create login page in miniprogram/pages/auth/login/ (login.wxml, login.wxss, login.js)
- [X] T027 [US1] Implement wx.getUserProfile button for user info authorization in login page
- [X] T028 [US1] Implement wx.getLocation request for location authorization in login page
- [X] T029 [US1] Call auth/login cloud function and handle response in login page
- [X] T030 [US1] Store user_id and auth state in local storage after successful login
- [X] T031 [US1] Handle denied location authorization (disable distance features flag)
- [X] T032 [US1] Create role-select page in miniprogram/pages/auth/role-select/ (role-select.wxml, role-select.wxss, role-select.js)
- [X] T033 [US1] Implement role selection UI (Boxer/Gym buttons) in role-select page
- [X] T034 [US1] Show last_role as default option when user has both roles in role-select
- [X] T035 [US1] Skip role-select page when user has only one role (redirect directly)
- [X] T036 [US1] Implement navigation to boxer or gym flows based on selected role

**Checkpoint**: Users can authorize, select role, and enter app. Ready for profile creation.

---

## Phase 4: User Story 2 - Profile Creation (Priority: P1) 🎯 MVP

**Goal**: New users can create Boxer or Gym profiles with required/optional fields, using transactions for data safety

**Independent Test**: Select Boxer role → fill form with valid/invalid data → submit → verify profile saved. Same for Gym.

### Backend - Boxer Profile Creation

- [X] T037 [US2] Create cloud function cloudfunctions/boxer/create/index.js for boxer profile creation
- [X] T038 [US2] Implement input validation (required fields: nickname, gender, birthdate, height, weight) in boxer/create
- [X] T039 [US2] Implement optional field validation (city, gym_id, phone, record_wins/losses/draws) in boxer/create
- [X] T040 [US2] Implement database transaction for boxer profile creation (create profile + update user + increment counter)
- [X] T041 [US2] Implement gym_id validation (check gym exists) in boxer/create
- [X] T042 [US2] Add package.json for boxer/create cloud function
- [X] T043 [US2] Deploy boxer/create cloud function to CloudBase

### Frontend - Boxer Profile Creation

- [X] T044 [P] [US2] Create boxer profile-create page in miniprogram/pages/boxer/profile-create/ (profile-create.wxml, profile-create.wxss, profile-create.js)
- [X] T045 [US2] Implement form fields for required data (nickname, gender, birthdate, height, weight) in profile-create
- [X] T046 [US2] Implement form fields for optional data (city, gym association, phone, record) in profile-create
- [X] T047 [US2] Implement gender picker (male/female) in profile-create
- [X] T048 [US2] Implement date picker for birthdate in profile-create
- [X] T049 [US2] Implement gym selector (dropdown from gyms list) in profile-create
- [X] T050 [US2] Implement form validation (disable submit if required fields empty) in profile-create
- [X] T051 [US2] Call boxer/create cloud function on form submit in profile-create
- [X] T052 [US2] Handle success response (redirect to dashboard) in profile-create
- [X] T053 [US2] Handle error response (show validation messages) in profile-create

### Backend - Gym Profile Creation

- [X] T054 [US2] Create cloud function cloudfunctions/gym/create/index.js for gym profile creation
- [X] T055 [US2] Implement input validation (required fields: name, address, location, phone) in gym/create
- [X] T056 [US2] Implement optional field validation (icon_url) in gym/create
- [X] T057 [US2] Implement database transaction for gym profile creation (create profile + update user + increment counter)
- [X] T058 [US2] Add package.json for gym/create cloud function
- [X] T059 [US2] Deploy gym/create cloud function to CloudBase

### Frontend - Gym Profile Creation

- [X] T060 [P] [US2] Create gym profile-create page in miniprogram/pages/gym/profile-create/ (profile-create.wxml, profile-create.wxss, profile-create.js)
- [X] T061 [US2] Implement form fields for required data (name, address, phone) in profile-create
- [X] T062 [US2] Implement wx.chooseLocation integration for address/location selection in profile-create
- [X] T063 [US2] Implement image upload for gym icon (wx.cloud.uploadFile) in profile-create
- [X] T064 [US2] Implement form validation (disable submit if required fields empty) in profile-create
- [X] T065 [US2] Call gym/create cloud function on form submit in profile-create
- [X] T066 [US2] Handle success response (redirect to dashboard) in profile-create
- [X] T067 [US2] Handle error response (show validation messages) in profile-create

### Cloud Storage - Image Upload

- [X] T068 [US2] Create cloud function cloudfunctions/common/upload/index.js for image upload handling
- [X] T069 [US2] Configure Cloud Storage for gym-icons directory in CloudBase console
- [X] T070 [US2] Add package.json for common/upload cloud function
- [X] T071 [US2] Deploy common/upload cloud function to CloudBase

**Checkpoint**: Users can create Boxer and Gym profiles. Ready for discovery features.

---

## Phase 5: User Story 3 - Browse and Filter Boxers & Gyms (Priority: P1) 🎯 MVP

**Goal**: Users can view all Boxers and Gyms with counts, filter by criteria, and sort by distance

**Independent Test**: Enter dashboard → view counts → apply filters → verify correct results. Test distance sorting with authorized location.

### Backend - Discovery APIs

- [X] T072 [US3] Create cloud function cloudfunctions/boxer/list/index.js for boxer listing with filters
- [X] T073 [US3] Implement filter logic (city, age range from birthdate, weight range) in boxer/list
- [X] T074 [US3] Implement pagination (page, limit) in boxer/list
- [X] T075 [US3] Calculate age from birthdate server-side in boxer/list
- [X] T076 [US3] Return total_count for filtered results in boxer/list
- [X] T077 [US3] Add package.json for boxer/list cloud function
- [X] T078 [US3] Deploy boxer/list cloud function to CloudBase

- [X] T079 [US3] Create cloud function cloudfunctions/gym/list/index.js for gym listing with filters
- [X] T080 [US3] Implement city filter in gym/list
- [X] T081 [US3] Implement distance sorting (Haversine formula) in gym/list
- [X] T082 [US3] Implement pagination (page, limit) in gym/list
- [X] T083 [US3] Return total_count and human-readable distance in gym/list
- [X] T084 [US3] Add package.json for gym/list cloud function
- [X] T085 [US3] Deploy gym/list cloud function to CloudBase

- [X] T086 [US3] Create cloud function cloudfunctions/common/stats/index.js for platform statistics
- [X] T087 [US3] Implement boxer_count and gym_count retrieval from counters collection in common/stats
- [X] T088 [US3] Add package.json for common/stats cloud function
- [X] T089 [US3] Deploy common/stats cloud function to CloudBase

### Frontend - Boxer List & Filters

- [X] T090 [P] [US3] Create boxer list page in miniprogram/pages/boxer/list/ (list.wxml, list.wxss, list.js)
- [X] T091 [US3] Implement filter-bar component integration (city, age range, weight range inputs) in list
- [X] T092 [US3] Call common/stats cloud function to display total boxer count in list
- [X] T093 [US3] Call boxer/list cloud function with filters in list
- [X] T094 [US3] Display boxer cards with summary info (nickname, age, height, weight, city, record) in list
- [X] T095 [US3] Implement "load more" pagination in list
- [X] T096 [US3] Implement apply filters button in list
- [X] T097 [US3] Implement clear filters button in list
- [X] T098 [US3] Handle empty results state in list

### Frontend - Gym List & Filters

- [X] T099 [P] [US3] Create gym list page in miniprogram/pages/gym/list/ (list.wxml, list.wxss, list.js)
- [X] T100 [US3] Implement filter-bar component integration (city input) in list
- [X] T101 [US3] Call common/stats cloud function to display total gym count in list
- [X] T102 [US3] Call gym/list cloud function with city filter in list
- [X] T103 [US3] Call gym/list with distance sorting (pass user location) if authorized in list
- [X] T104 [US3] Display gym cards with summary info (name, city, distance, boxer_count) in list
- [X] T105 [US3] Implement "load more" pagination in list
- [X] T106 [US3] Implement apply/clear filters buttons in list
- [X] T107 [US3] Handle empty results state in list

### Frontend - Dashboard

- [X] T108 [US3] Create dashboard page in miniprogram/pages/common/dashboard/ (dashboard.wxml, dashboard.wxss, dashboard.js)
- [X] T109 [US3] Call common/stats to display boxer_count and gym_count in dashboard
- [X] T110 [US3] Add navigation buttons to boxer list and gym list in dashboard
- [X] T111 [US3] Display user's current role in dashboard

**Checkpoint**: Users can browse and filter Boxers and Gyms. MVP feature complete.

---

## Phase 6: User Story 4 - View Boxer and Gym Details (Priority: P2)

**Goal**: Users can view complete profile information for any Boxer or Gym

**Independent Test**: Tap on Boxer/Gym from list → verify all fields display correctly → test optional fields show "未提供"

### Backend - Detail APIs

- [X] T112 [US4] Create cloud function cloudfunctions/boxer/get/index.js for single boxer profile
- [X] T113 [US4] Implement profile retrieval by boxer_id in boxer/get
- [X] T114 [US4] Calculate age from birthdate in boxer/get
- [X] T115 [US4] Fetch associated gym name if gym_id exists in boxer/get
- [X] T116 [US4] Format record as "X胜Y负Z平" or null in boxer/get
- [X] T117 [US4] Add package.json for boxer/get cloud function
- [X] T118 [US4] Deploy boxer/get cloud function to CloudBase

- [X] T119 [US4] Create cloud function cloudfunctions/gym/get/index.js for single gym profile
- [X] T120 [US4] Implement profile retrieval by gym_id in gym/get
- [X] T121 [US4] Count associated boxers (aggregate query) in gym/get
- [X] T122 [US4] Add package.json for gym/get cloud function
- [X] T123 [US4] Deploy gym/get cloud function to CloudBase

### Frontend - Detail Pages

- [X] T124 [P] [US4] Create boxer detail page in miniprogram/pages/boxer/detail/ (detail.wxml, detail.wxss, detail.js)
- [X] T125 [US4] Call boxer/get cloud function with boxer_id on load in detail
- [X] T126 [US4] Display all profile fields (nickname, gender, age, birthdate, height, weight, city, gym, phone, record) in detail
- [X] T127 [US4] Implement conditional display for optional fields (show "未提供" if null) in detail
- [X] T128 [P] [US4] Create gym detail page in miniprogram/pages/gym/detail/ (detail.wxml, detail.wxss, detail.js)
- [X] T129 [US4] Call gym/get cloud function with gym_id on load in detail
- [X] T130 [US4] Display all profile fields (name, address, city, location, phone, icon, boxer_count) in detail
- [X] T131 [US4] Implement conditional display for icon (show placeholder if null) in detail
- [X] T132 [US4] Add navigation from boxer list to boxer detail (tap on card)
- [X] T133 [US4] Add navigation from gym list to gym detail (tap on card)

**Checkpoint**: Users can view detailed profiles. Core MVP functionality complete.

---

## Phase 7: User Story 5 - Gym Profile Creation (Priority: P2)

**Note**: Gym profile creation was already implemented in Phase 4 (US2). This phase covers any remaining items.

**Remaining Tasks**:
- [ ] T134 [US5] Test gym profile creation flow end-to-end
- [ ] T135 [US5] Test gym appears in gym list after creation
- [ ] T136 [US5] Test gym icon upload and display in detail view

**Checkpoint**: Gym profile creation fully verified and tested.

---

## Phase 8: User Story 6 - Profile Editing (Priority: P2)

**Goal**: Users can edit their own profiles with restrictions (gender/birthdate immutable for boxers)

**Independent Test**: Access own profile → modify allowed fields → save → verify changes persist. Test restricted fields are read-only.

### Backend - Update APIs

- [X] T137 [US6] Create cloud function cloudfunctions/boxer/update/index.js for boxer profile updates
- [X] T138 [US6] Implement ownership verification (openid match) in boxer/update
- [X] T139 [US6] Implement gender/birthdate immutability check (reject if present) in boxer/update
- [X] T140 [US6] Implement gym_id validation (check gym exists) in boxer/update
- [X] T141 [US6] Add package.json for boxer/update cloud function
- [X] T142 [US6] Deploy boxer/update cloud function to CloudBase

- [X] T143 [US6] Create cloud function cloudfunctions/gym/update/index.js for gym profile updates
- [X] T144 [US6] Implement ownership verification (openid match) in gym/update
- [X] T145 [US6] Add package.json for gym/update cloud function
- [X] T146 [US6] Deploy gym/update cloud function to CloudBase

### Frontend - Edit Pages

- [X] T147 [P] [US6] Create boxer profile-edit page in miniprogram/pages/boxer/profile-edit/ (profile-edit.wxml, profile-edit.wxss, profile-edit.js)
- [X] T148 [US6] Load existing boxer profile data on page load in profile-edit
- [X] T149 [US6] Implement form fields for editable data (height, weight, nickname, city, gym, phone, record) in profile-edit
- [X] T150 [US6] Implement gender/birthdate as read-only or hidden in profile-edit
- [X] T151 [US6] Call boxer/update cloud function on form submit in profile-edit
- [X] T152 [US6] Handle success/error responses in profile-edit
- [X] T153 [P] [US6] Create gym profile-edit page in miniprogram/pages/gym/profile-edit/ (profile-edit.wxml, profile-edit.wxss, profile-edit.js)
- [X] T154 [US6] Load existing gym profile data on page load in profile-edit
- [X] T155 [US6] Implement form fields for all editable data (name, address, location, phone, icon_url) in profile-edit
- [X] T156 [US6] Call gym/update cloud function on form submit in profile-edit
- [X] T157 [US6] Handle success/error responses in profile-edit

**Checkpoint**: Users can edit their profiles with proper restrictions.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T158 [P] Add loading indicators for all cloud function calls
- [ ] T159 [P] Add error handling for network failures across all pages
- [ ] T160 [P] Implement "pull to refresh" on list pages
- [ ] T161 [P] Add empty state illustrations for lists
- [ ] T162 [P] Optimize images for gym icons (compression)
- [ ] T163 Add OpenID protection audit (verify no openid in any frontend response)
- [ ] T164 Add transaction safety audit (verify all multi-entity writes use transactions)
- [ ] T165 Test on real device (not just simulator)
- [ ] T166 Verify distance calculations are accurate within 100 meters
- [ ] T167 Performance test with 100+ boxer/gym records
- [ ] T168 [P] Add app icons and splash screens (document required in images/)
- [ ] T169 Update app.json with final app metadata (name, description)
- [ ] T170 Create test scenarios document in tests/test-scenarios.md
- [ ] T171 Verify all UI text is in Simplified Chinese only

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Can start in parallel with other user stories
- **User Story 2 (Phase 4)**: Depends on Foundational - Can start in parallel with other user stories
- **User Story 3 (Phase 5)**: Depends on Foundational - Can start in parallel with other user stories
- **User Story 4 (Phase 6)**: Depends on User Story 3 (needs list pages to navigate from)
- **User Story 5 (Phase 7)**: Already completed in User Story 2
- **User Story 6 (Phase 8)**: Depends on User Story 2 (needs profiles to edit)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Priorities (Per User Input)

1. **User Story 1 - Authorization**: Must be first (blocks all other flows)
2. **User Story 2 - Profile Creation**: Must be second (cannot view/filter without profiles)
3. **User Story 3 - Browse & Filter**: Must be third (core discovery feature)
4. **User Story 4 - Details**: Can be done in parallel with US2/US3 after Foundational
5. **User Story 5 - Gym Creation**: Already done in US2
6. **User Story 6 - Editing**: Can be done after US2 (profiles exist)

### Recommended Execution Order

**Minimum Viable Product (MVP)**:
1. Phase 1: Setup
2. Phase 2: Foundational
3. Phase 3: US1 - Authorization & Role Selection
4. Phase 4: US2 - Profile Creation
5. Phase 5: US3 - Browse & Filter

**Full Release**: Continue with Phases 6-9

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T012, T013, T014 can run in parallel (different utility files)
- T017, T018 can run in parallel (different components)

**Within Phase 3 (US1 - Authorization)**:
- T026 (login page) can be developed in parallel with T032 (role-select page)

**Within Phase 4 (US2 - Profile Creation)**:
- T037-T043 (Boxer backend) can run in parallel with T054-T059 (Gym backend)
- T044-T053 (Boxer frontend) can run in parallel with T060-T067 (Gym frontend)

**Within Phase 5 (US3 - Browse & Filter)**:
- T072-T078 (Boxer list backend) can run in parallel with T079-T085 (Gym list backend)
- T090-T098 (Boxer list frontend) can run in parallel with T099-T107 (Gym list frontend)

**Within Phase 6 (US4 - Details)**:
- T112-T118 (Boxer detail backend+frontend) can run in parallel with T119-T123 (Gym detail backend+frontend)

---

## Implementation Strategy

### MVP First (User Stories 1-3)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T018) - **CRITICAL BLOCKER**
3. Complete Phase 3: US1 - Authorization (T019-T036)
4. Complete Phase 4: US2 - Profile Creation (T037-T071)
5. Complete Phase 5: US3 - Browse & Filter (T072-T111)
6. **STOP and VALIDATE**: Test full MVP flow (authorize → create profile → browse/filter)
7. Deploy MVP for user testing

### Incremental Delivery

With MVP deployed, add features incrementally:

1. Add US4 - Details (Phase 6) → Users can view full profiles
2. Add US6 - Editing (Phase 8) → Users can manage their profiles
3. Add Polish (Phase 9) → Production-ready app

### Parallel Team Strategy

If multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 - Authorization
   - Developer B: US2 - Profile Creation (can start after US1 auth flow works)
   - Developer C: US3 - Browse & Filter (can work with test data)
3. Merge and integrate as each story completes

---

## Summary

| Phase | Description | Task Count | Parallel Tasks |
|-------|-------------|------------|----------------|
| 1 | Setup | 8 | 5 |
| 2 | Foundational | 10 | 6 |
| 3 | US1 - Authorization | 18 | 2 |
| 4 | US2 - Profile Creation | 35 | 4 |
| 5 | US3 - Browse & Filter | 40 | 8 |
| 6 | US4 - Details | 22 | 2 |
| 7 | US5 - Gym Creation | 3 | 0 |
| 8 | US6 - Editing | 20 | 2 |
| 9 | Polish | 14 | 5 |
| **Total** | **All Phases** | **170** | **34** |

**MVP (Phases 1-5)**: 111 tasks

**Key Milestones**:
- T018: Foundation ready - user stories can begin
- T036: Authorization complete - users can enter app
- T071: Profile creation complete - users have identities
- T111: MVP complete - full user flow working
