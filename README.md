# Supabase + Webflow Auth Integration

A single JavaScript file that adds complete authentication and user management to Webflow sites using Supabase as the backend.

## Features

- 🔐 **Authentication**: Signup, login, logout, password reset
- 👤 **User Profiles**: Edit own profile with RLS protection
- 🛡️ **Page Protection**: Flexible protection via `data-protected` attributes
- 📚 **Course Entitlements**: Gate content by user permissions
- 📊 **Progress Tracking**: Track lesson completion
- 👥 **Profiles Directory**: Public or protected member directory

## Quick Start

1. **Add to Webflow** (Project Settings → Custom Code → Head):
```html
<!-- Load Supabase first -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<!-- Then your configured auth script -->
<script src="https://YOUR-HOSTED-VERSION/auth-spike.js"></script>
```

2. **Configure** in the script:
```javascript
const CONFIG = {
  url: "https://YOUR_PROJECT.supabase.co",
  publishableKey: "sb_publishable_YOUR_KEY",
  // ... redirects
};
```

3. **Set up Supabase**: Run SQL from `SETUP.md`

## Page Protection System

Control access using the `data-protected` attribute:

| Protection Type | Usage | Behavior |
|----------------|-------|----------|
| None | No attribute | Page is public |
| Basic | `data-protected="true"` | Requires login |
| Account | `data-protected="account"` | Login + populates user data |
| Profile | `data-protected="profile"` | Login + enables profile form |
| Course | `data-protected="course"` | Login + checks entitlements |

## Profiles Directory

The `/people` page displays user profiles with expandable details and edit capabilities.

### Features
- **Expandable profile cards** - Click "View Details" to see bio, location, company, role, website
- **Rich profile fields** - Supports bio, location, company, role, and website URLs
- **Auth-aware UI** - Shows login/logout button based on authentication state
- **Inline editing** - Edit all profile fields directly in the card (own profile only)

### Public Mode (no login required)
```html
<!-- No data-protected attribute -->
<div id="profilesList"></div>
```
- Anyone can view profiles and expand details
- Login button shown at top
- No edit buttons visible

### Protected Mode (login required)
```html
<div data-protected="true">
  <div id="profilesList"></div>
</div>
```
- Requires authentication to view
- Logout button shown with user email
- Edit button enabled for own profile

## Architecture Decisions

### Single Source of Truth
The `data-protected` attribute is the sole control for page protection. No hardcoded auth checks in feature functions.

### RLS + RPC Pattern
- **Row Level Security (RLS)**: Enforces that users can only edit their own data
- **Remote Procedure Calls (RPC)**: Provide safe, read-only access to data
- **Public RPCs**: Allow anonymous users to view safe data (no emails)

### Progressive Enhancement
Features gracefully degrade based on authentication status rather than blocking entirely.

## Project Structure

```
/
├── auth-spike.js           # Main integration script
├── SETUP.md               # Webflow setup instructions
├── sql/
│   ├── schema/            # Database tables and RLS policies
│   ├── functions/         # RPC functions for features
│   └── seeds/             # Demo/test data
└── docs/
    └── gating-system.md   # Page protection documentation
```

## Key Lessons Learned

1. **Simplicity wins**: One set of public RPC functions is better than duplicate auth/public versions
2. **Separation of concerns**: Let `data-protected` handle access, RPC handle viewing, RLS handle editing
3. **Flexibility matters**: Support both public and protected modes for features like directories
4. **User context**: Always show "You" badge and differentiate own vs others' content

## Testing

Add `?debug` to any URL for verbose console logging.

## Security Notes

- Email addresses are never exposed in directory views
- RLS policies prevent unauthorized profile edits even if frontend is compromised
- All RPC functions return only safe fields (id, name, avatar)

## Contributing

When adding features:
1. Respect the `data-protected` attribute system
2. Use RPC for data fetching when possible
3. Keep email addresses private
4. Test both authenticated and anonymous flows