# Page Protection & Gating System

## Overview

The authentication and gating system uses explicit `data-protected` attributes on HTML elements to control page access. This provides clear, declarative protection that's easy to manage in Webflow.

## How It Works

1. **On page load**, the script looks for any element with a `data-protected` attribute
2. **Based on the attribute value**, it applies the appropriate protection level
3. **Debug bypass**: Add `?debug` to any URL to skip protection (development only)

## Protection Types

### Basic Authentication (`data-protected="true"`)
- **Purpose**: Require user login
- **Use case**: Member-only pages, dashboards
- **Behavior**: Redirects to `/login` if not authenticated

```html
<div data-protected="true">
  <!-- Page content -->
</div>
```

### Course Protection (`data-protected="course"`)
- **Purpose**: Require login + course entitlement
- **Use case**: Course lessons, modules
- **Requirements**: Must have `<div id="courseSlug">course-name</div>` element
- **Behavior**:
  - Checks authentication first
  - Verifies user has entitlement for the specific course
  - Redirects to `/no-access` if no entitlement

```html
<div data-protected="course">
  <div id="courseSlug" style="display:none">javascript-basics</div>
  <div id="moduleSlug" style="display:none">module-1</div>
  <div id="lessonSlug" style="display:none">variables</div>
  <!-- Course content -->
</div>
```

### Account Page (`data-protected="account"`)
- **Purpose**: Require login + populate account data
- **Use case**: User account/dashboard pages
- **Auto-populates**:
  - User email (`[data-user-email]`, `#userEmail`, or `#profileEmail`)
  - Profile name (`#profileFullName`)
  - Course entitlements (`#entitlementsList`)
  - Lesson progress (`#progressList`)

```html
<div data-protected="account">
  <h1>My Account</h1>
  <div id="userEmail"></div>
  <div id="entitlementsList"></div>
  <div id="progressList"></div>
</div>
```

### Profile Management (`data-protected="profile"`)
- **Purpose**: Require login + enable profile editing
- **Use case**: Profile edit pages
- **Requirements**: Must have `<form id="profileForm">` element
- **Behavior**: Loads user profile and handles form submission

```html
<div data-protected="profile">
  <form id="profileForm">
    <input type="text" id="fullName" placeholder="Full Name">
    <button type="submit">Save Profile</button>
  </form>
</div>
```

## Element IDs Reference

### User Display Elements
- `[data-user-email]` - Shows logged-in user's email
- `#userEmail` - Alternative for user email display
- `#profileEmail` - Another alternative for email display
- `#profileFullName` - Shows user's full name from profile

### Course Elements (Required for course protection)
- `#courseSlug` - Contains the course identifier
- `#moduleSlug` - Contains the module identifier (optional)
- `#lessonSlug` - Contains the lesson identifier (optional)

### Account Page Elements
- `#entitlementsList` - Container for course access list
- `#progressList` - Container for completed lessons
- `#progressEmptyState` - Shows when no progress exists
- `#debugContext` - Debug info (only with ?debug flag)

### Lesson Progress Elements
- `#markCompleteBtn` - Button to mark lesson complete
- `#completionStatus` - Shows lesson completion status

## Configuration

The system respects these redirect settings in the CONFIG object:

```javascript
CONFIG = {
  redirects: {
    afterLogin: "/account",
    afterSignup: "/account",
    afterLogout: "/login",
    loginPage: "/login"
  }
}
```

## Testing Protection

### Smoke Tests

1. **Test unauthenticated access**:
   - Open incognito window
   - Visit protected page → Should redirect to `/login`

2. **Test authenticated access**:
   - Log in first
   - Visit protected page → Should show content

3. **Test course entitlement**:
   - Log in with test user
   - Visit course with entitlement → Access granted
   - Visit course without entitlement → Redirect to `/no-access`

4. **Test debug bypass**:
   - Add `?debug` to any protected URL
   - Should bypass all protection checks

## Common Issues

1. **Page unexpectedly protected**: Check for leftover IDs like `#profileForm` from duplicated pages
2. **Course protection not working**: Ensure `#courseSlug` element exists with correct course identifier
3. **Account data not populating**: Verify element IDs match exactly (case-sensitive)
4. **Protection not triggering**: Ensure `data-protected` is on an element that exists on page load

## Migration from Old System

The old system used implicit protection based on element IDs. The new system requires explicit `data-protected` attributes, giving you full control over what's protected.

Old triggers that are now removed:
- `#profileForm` presence → No longer auto-protects
- `/account` path check → No longer auto-protects
- Must now use explicit `data-protected` attributes