# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a Supabase + Webflow authentication integration that provides a single JavaScript file (`auth-spike.js`) to add complete authentication and user management to Webflow sites. The script is designed to be hosted on GitHub Pages or CDN and loaded into Webflow via custom code.

## Development Commands

```bash
# Install dependencies (only Husky for git hooks)
npm install

# No build process - this is a single vanilla JS file
# The script is deployed directly to GitHub Pages

# Version updates happen automatically via git hook
# On commit, update-version.sh updates BUILD_VERSION timestamp in auth-spike.js
```

## Architecture & Key Concepts

### Core Philosophy: Single Source of Truth

The `data-protected` attribute on HTML elements is the **sole control** for page protection. No hardcoded authentication checks should exist in feature functions like `initProfilesDirectory()`.

### Page Protection System

The script uses a unified protection system via `initializePageProtection()` that checks for `data-protected` attributes:

- `data-protected="true"` - Basic authentication required
- `data-protected="account"` - Auth + populates account data
- `data-protected="profile"` - Auth + enables profile form
- `data-protected="course"` - Auth + checks entitlements
- No attribute - Page is public

### Database Access Pattern

1. **RLS (Row Level Security)** - Enforces that users can only edit their own profiles
2. **RPC Functions** - Provide safe, read-only access to data (no emails exposed)
3. **Public RPCs** - Use `_public` suffix, work for both anonymous and authenticated users

Example: `list_profile_cards_public()` returns profiles without emails, accessible by anyone.

### Script Structure

The main `auth-spike.js` file is organized into numbered sections:

1. Configuration & Initialization - Sets up Supabase client
2. Utility Functions - `ensureProfileExists()`, `requireAuthOrRedirect()`
3. Auth Form Handlers - Signup, login, logout, password reset
4. Profile Management - Form handling for profile edits
5. Unified Page Protection System - Central `data-protected` handler
6. Course Page Entitlement Checking - Course access control
7. Account Page Data Population - Dynamic data insertion
8. Lesson Progress Tracking - Completion tracking
9. Profiles Directory - `/people` page functionality
10. Global Auth State Listener - Auth state changes
11. Initialization Calls - Boot sequence

### Deployment Model

1. Script is configured with hardcoded Supabase credentials in `CONFIG` object
2. Can be overridden via `window.SB_CONFIG` before script loads
3. Hosted on GitHub Pages and loaded into Webflow via CDN
4. Requires Supabase JS library loaded first

### SQL Organization

SQL files are organized by purpose in `sql/` directory:
- `schema/` - Database tables and RLS policies (numbered for execution order)
- `functions/` - RPC functions for features (e.g., profiles-directory.sql)
- `seeds/` - Demo/test data (optional for development)

Run in order: schema → functions → seeds (optional). See `sql/README.md` for details.

### Testing & Debug

Add `?debug` to any URL for verbose console logging. The `hasDebugFlag()` function controls debug output throughout the script.

## Critical Implementation Details

### Profile Creation Flow

Profiles are created via `ensureProfileExists()` which handles race conditions and errors gracefully. Called on:
- Successful signup
- Profile form page visit (failsafe)

### Element ID Dependencies

The script expects specific element IDs in Webflow:

- Auth forms: `#signupForm`, `#loginForm`, `#resetForm`, etc.
- Profile form: `#profileForm`, `#fullName`
- Account page: `#userEmail`, `#entitlementsList`, `#progressList`
- Profiles directory: `#profilesList`, `#profilesEmpty`, `#profilesError`

### Version Management

The `BUILD_VERSION` constant is automatically updated on each commit via the git pre-commit hook that runs `update-version.sh`. This provides version tracking without a build process.