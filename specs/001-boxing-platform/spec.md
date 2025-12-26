# Feature Specification: Boxing Platform Mini-Program

**Feature Branch**: `001-boxing-platform`
**Created**: 2025-12-26
**Status**: Draft
**Input**: User description: "创建一个微信小程序，用于收集拳击手和拳馆的信息。用户进入需要获取微信授权获取其用户信息和位置信息，授权后用户需要选择进入角色，有拳馆和拳馆两种角色，如果用户只有一种角色则默认以已有角色进入。当用户以拳手角色进入后，初次需要填写拳手基本信息，包含身高、体重、性别、昵称、出生日期以上必填，战绩、当前所在城市、所属拳馆和联系电话选填。以拳手身份进入时可以看到当前平台内的拳手和拳馆信息包括数量，拳手可以根据城市和离自己的距离筛选拳馆，并查看拳馆信息。拳手也可以根据城市、年龄、体重过滤拳击手，并查看拳手信息。一个用户可以同时拥有拳手和拳馆的角色，用户也可以修改自己的基本信息，但是性别、出生日期不可修改。当以拳馆角色进入后，初次需要填写拳馆基本信息，包含名称、地址及定位、联系电话以上为必填，拳馆图标选填。以拳馆身份进入时和拳手一样，同样可以查看和过滤拳手和拳馆，并查看信息。"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - User Authorization & Role Selection (Priority: P1)

First-time users open the mini-program and authorize access to their profile and location, then select their role (Boxer or Gym) to begin using the platform.

**Why this priority**: Without authorization and role selection, users cannot access any functionality. This is the entry point for all user journeys.

**Independent Test**: Can be fully tested by opening the mini-program, completing authorization flow, selecting a role, and verifying the correct home screen is displayed.

**Acceptance Scenarios**:

1. **Given** a new user opens the mini-program, **When** they grant user info and location authorization, **Then** they are prompted to select a role (Boxer or Gym)
2. **Given** a user has only one role registered, **When** they open the mini-program, **Then** they bypass role selection and enter directly with their existing role
3. **Given** a user denies location authorization, **When** they proceed, **Then** they can still use the platform but distance-based filtering is disabled
4. **Given** a user has both Boxer and Gym roles, **When** they open the mini-program, **Then** they can choose which role to enter with

---

### User Story 2 - Boxer Profile Creation (Priority: P1)

A new Boxer user completes their profile with required information (height, weight, gender, nickname, birthdate) and optional details (record, city, gym, phone).

**Why this priority**: Boxers cannot be discovered or connect with others without a profile. This is the core value proposition for Boxer users.

**Independent Test**: Can be fully tested by selecting Boxer role, filling the profile form with valid/invalid data, submitting, and verifying profile is saved and displayed correctly.

**Acceptance Scenarios**:

1. **Given** a new Boxer user, **When** they submit the profile with all required fields filled, **Then** their profile is created and they can view the main dashboard
2. **Given** a Boxer filling the profile form, **When** a required field is empty, **Then** the submit button is disabled or an error message is displayed
3. **Given** a Boxer filling the profile form, **When** they skip all optional fields, **Then** the profile is still created successfully
4. **Given** a Boxer filling the profile form, **When** they enter an invalid date format for birthdate, **Then** a validation error is shown

---

### User Story 3 - Browse and Filter Boxers & Gyms (Priority: P1)

Users (either Boxers or Gyms) can view all Boxers and Gyms on the platform, see total counts, and filter by various criteria to find relevant matches.

**Why this priority**: This is the primary discovery feature that enables users to find and connect with each other. Without it, the platform has no utility.

**Independent Test**: Can be fully tested by entering the platform, applying different filters, and verifying the correct list of results is displayed with accurate counts.

**Acceptance Scenarios**:

1. **Given** a user on the main dashboard, **When** they view the Boxer list, **Then** they see the total count of Boxers on the platform
2. **Given** a Boxer viewing Gyms, **When** they filter by city, **Then** only Gyms in that city are displayed
3. **Given** a Boxer viewing Gyms, **When** they have authorized location, **Then** they can sort Gyms by distance from their current location
4. **Given** a user viewing Boxers, **When** they apply filters for city, age range, and weight range, **Then** only Boxers matching all criteria are displayed
5. **Given** a user viewing Boxers, **When** they clear all filters, **Then** all Boxers are displayed again

---

### User Story 4 - View Boxer and Gym Details (Priority: P2)

Users can tap on any Boxer or Gym in the list to view their complete profile information and contact details.

**Why this priority**: While discovery is critical, the detailed view is what enables meaningful connections. Users need to see full information to decide whether to contact someone.

**Independent Test**: Can be fully tested by selecting a Boxer or Gym from a list and verifying all profile information is displayed correctly including optional fields.

**Acceptance Scenarios**:

1. **Given** a user viewing the Boxer list, **When** they tap on a Boxer, **Then** a detail page opens showing that Boxer's complete profile
2. **Given** a user viewing a Boxer's profile, **When** the Boxer has not filled optional fields (record, phone, gym), **Then** those fields are hidden or shown as "not provided"
3. **Given** a user viewing Gym details, **When** the Gym has provided an icon, **Then** the icon is displayed on the detail page
4. **Given** a user viewing Gym details, **When** the Gym has provided address and location, **Then** the address is displayed and can be used for navigation

---

### User Story 5 - Gym Profile Creation (Priority: P2)

A new Gym user completes their profile with required information (name, address with location, phone) and optional gym icon.

**Why this priority**: Gyms are the second user type. While important, the platform can provide initial value with Boxers alone, then expand with Gym profiles.

**Independent Test**: Can be fully tested by selecting Gym role, filling the profile form, submitting, and verifying the Gym profile is saved and discoverable.

**Acceptance Scenarios**:

1. **Given** a new Gym user, **When** they submit the profile with all required fields, **Then** their Gym profile is created and appears in Gym search results
2. **Given** a Gym filling the profile form, **When** they provide address but skip icon, **Then** the profile is still created successfully
3. **Given** a Gym filling the profile form, **When** they need to set location, **Then** they can use map pick or automatic location based on address
4. **Given** a Gym filling the profile form, **When** they submit without name, address, or phone, **Then** validation errors prevent submission

---

### User Story 6 - Profile Editing (Priority: P2)

Users can edit their own profile information, with restrictions that gender and birthdate cannot be modified after initial creation.

**Why this priority**: Profile editing is important for data accuracy, but users can initially create profiles without it. This is an enhancement to the core experience.

**Independent Test**: Can be fully tested by accessing profile edit, modifying allowed fields, and verifying changes persist. Also verify restricted fields (gender, birthdate) cannot be changed.

**Acceptance Scenarios**:

1. **Given** a Boxer viewing their own profile, **When** they access edit mode, **Then** they can modify height, weight, nickname, city, gym, phone, and record
2. **Given** a Boxer in edit mode, **When** they attempt to modify gender or birthdate, **Then** those fields are read-only or hidden
3. **Given** a Gym viewing their own profile, **When** they edit their information, **Then** changes are saved and reflected in search results
4. **Given** any user editing their profile, **When** they save changes, **Then** the updated information is immediately visible to other users viewing their profile

---

### Edge Cases

- What happens when a user denies both user info AND location authorization?
- How does the system handle when a Boxer's birthdate indicates they are under 18 (or any age restriction)?
- What happens when a Gym's location cannot be determined from the address?
- How does the system display distance when a user's location is not available?
- What happens when a user has filled a Gym as their "belonging gym" but that Gym is deleted or removed?
- How are duplicate Gym names handled when users search or browse?
- What happens when a user attempts to associate with a Gym that doesn't exist in the system?
- How does the system handle very large numbers of Boxers/Gyms (performance implications)?

## Requirements *(mandatory)*

### Functional Requirements

**Authorization & Access**
- **FR-001**: System MUST request user info authorization (nickname, avatar) upon first launch
- **FR-002**: System MUST request location authorization upon first launch
- **FR-003**: System MUST allow users to proceed without location authorization but disable distance-based features
- **FR-004**: System MUST store user's OpenID for identity management (never exposed to frontend)
- **FR-005**: System MUST support role selection between Boxer and Gym after authorization

**Role Management**
- **FR-006**: System MUST allow a single user account to have both Boxer and Gym roles
- **FR-007**: System MUST bypass role selection if user has only one registered role
- **FR-008**: System MUST remember user's last active role and offer it as default option

**Boxer Profile**
- **FR-009**: System MUST require height (cm) for Boxer profile creation
- **FR-010**: System MUST require weight (kg) for Boxer profile creation
- **FR-011**: System MUST require gender (male/female) for Boxer profile creation
- **FR-012**: System MUST require nickname for Boxer profile creation
- **FR-013**: System MUST require birthdate for Boxer profile creation
- **FR-014**: System MUST allow optional record (win/loss/draw) for Boxer profile
- **FR-015**: System MUST allow optional city for Boxer profile
- **FR-016**: System MUST allow optional Gym association for Boxer profile
- **FR-017**: System MUST allow optional phone number for Boxer profile
- **FR-018**: System MUST prevent modification of gender and birthdate after profile creation
- **FR-019**: System MUST allow modification of all other profile fields after creation

**Gym Profile**
- **FR-020**: System MUST require Gym name for Gym profile creation
- **FR-021**: System MUST require address for Gym profile creation
- **FR-022**: System MUST require location coordinates (latitude, longitude) for Gym profile
- **FR-023**: System MUST require phone number for Gym profile creation
- **FR-024**: System MUST allow optional Gym icon/image for Gym profile
- **FR-025**: System MUST allow modification of all Gym profile fields after creation

**Discovery & Filtering**
- **FR-026**: System MUST display total count of Boxers on the platform
- **FR-027**: System MUST display total count of Gyms on the platform
- **FR-028**: System MUST allow filtering Gyms by city
- **FR-029**: System MUST allow sorting Gyms by distance from user's current location (when available)
- **FR-030**: System MUST allow filtering Boxers by city
- **FR-031**: System MUST allow filtering Boxers by age range
- **FR-032**: System MUST allow filtering Boxers by weight range
- **FR-033**: System MUST allow combining multiple Boxer filters simultaneously
- **FR-034**: System MUST allow clearing all active filters

**Profile Viewing**
- **FR-035**: System MUST display full Boxer profile when selected from list
- **FR-036**: System MUST display full Gym profile when selected from list
- **FR-037**: System MUST hide or mark as empty any optional fields not provided by the user
- **FR-038**: System MUST calculate and display Boxer's age based on birthdate

**Data & Privacy**
- **FR-039**: System MUST NOT expose raw OpenID in any frontend response
- **FR-040**: System MUST use anonymized user identifiers for any frontend data association
- **FR-041**: System MUST ensure all multi-database write operations use transactions for atomicity

### Key Entities

**User**: Platform user with WeChat authorization, may have Boxer profile, Gym profile, or both. Contains OpenID (never exposed), last role used.

**Boxer Profile**: Represents an individual boxer. Contains height, weight, gender (non-editable after creation), nickname, birthdate (non-editable after creation), record (optional), city (optional), associated Gym (optional), phone (optional), location coordinates (derived from city or manual entry).

**Gym Profile**: Represents a boxing gym. Contains name, address, location coordinates (required), phone, icon/image (optional). Associated with User who created it.

**Gym Association**: Link between a Boxer and a Gym (Boxer's "belonging gym"). A Boxer may belong to zero or one Gym.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: New users can complete authorization and role selection in under 60 seconds
- **SC-002**: New Boxers can complete their profile creation in under 3 minutes
- **SC-003**: New Gyms can complete their profile creation in under 5 minutes (including location setup)
- **SC-004**: Users can apply filters and see updated results in under 2 seconds
- **SC-005**: 95% of users successfully complete their first profile creation on first attempt
- **SC-006**: Platform supports 10,000 Boxer profiles and 1,000 Gym profiles without performance degradation
- **SC-007**: Profile list pages load and display within 3 seconds on standard mobile network
- **SC-008**: Distance calculations for Gyms are accurate within 100 meters
- **SC-009**: No user OpenID is exposed in any API response or frontend code
- **SC-010**: All multi-entity write operations (e.g., creating profile with associations) complete atomically (no partial failures)
