# Supabase + Webflow Auth Implementation Guide

This guide documents the actual implementation process for the 1-2 day spike, including the challenges encountered and solutions applied.

## Original Plan Overview

**Goal:** Auth + profile works end-to-end, with RLS on profile.

### Key Decisions Made
1. **Pure JS + GitHub-hosted script** (not Wized) - for template reusability
2. **GitHub Pages hosting** - aligns with existing script registry workflow
3. **Explicit Supabase Auth URL config** - to handle Webflow staging domains

---

## Step 0 — Quick Architecture Decision (✅ Completed)

### Chosen: Pure JS + GitHub-hosted script

**Deliverable:** Single URL to drop into any Webflow project:
```html
https://ivan-unfolds.github.io/supabase-webflow-spike/auth-spike.js
```

---

## Step 1 — Supabase Project Setup (30-60 mins)

### 1.1 Create project + grab keys
- `SUPABASE_URL`: Your project URL
- `SUPABASE_PUBLISHABLE_KEY`: Use the new `sb_publishable_...` format (not legacy `anon` key)

### 1.2 Create `profiles` table + RLS
```sql
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- RECOMMENDED: Automatic profile creation trigger
-- This ensures a profile always exists for every user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, '', '');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

create policy "profiles_insert_own"
on public.profiles for insert
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid());
```

### 1.3 Auth URL settings
In Supabase Auth settings:
- **Site URL**: your primary Webflow domain
- **Redirect URLs**: include all:
  - `https://YOURPROJECT.webflow.io/*` (staging)
  - `https://YOURCUSTOMDOMAIN/*` (production)

---

## Step 2 — Webflow Pages + Form IDs (45-90 mins)

Create these pages with exact IDs:
- `/signup` → form: `#signupForm`, fields: `#signupEmail`, `#signupPassword`
- `/login` → `#loginForm`, `#loginEmail`, `#loginPassword`
- `/reset-password` → `#resetForm`, `#resetEmail`
- `/update-password` → `#updatePwForm`, `#newPassword`, `#confirmPassword` (optional)
- `/account` → `#profileForm`, `#fullName`, `#profileEmail`, `#logoutBtn`
- `/course` (or any protected page) → element with `data-protected="true"`

---

## Step 3 — One JS File That Wires Everything (✅ Completed - WITH FIXES)

### Original Approach (Failed)
Initially tried ES modules with various CDNs:
```javascript
// ❌ These all caused CORS errors in Webflow:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createClient } from "https://unpkg.com/@supabase/supabase-js@2/+esm";
```

**Error encountered:**
```
Access to script at 'https://esm.sh/@supabase/supabase-js@2' from origin
'https://iris-site-template.webflow.io' has been blocked by CORS policy
```

### Working Solution: UMD/CDN Approach

#### Key Changes Made:
1. **Switched from ES modules to UMD build**
2. **Load Supabase separately via CDN**
3. **Renamed `supabase` to `supabaseClient`** to avoid naming conflicts
4. **Use modern `publishableKey` instead of legacy `anonKey`**

#### Final Working Implementation:

**In Webflow (Project Settings → Custom Code → Head Code):**
```html
<!-- MUST BE IN THIS ORDER -->
<!-- 1. Load Supabase first -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- 2. Then load your auth script -->
<script src="https://ivan-unfolds.github.io/supabase-webflow-spike/auth-spike.js"></script>
```

**In auth-spike.js:**
```javascript
// Check if Supabase is loaded (error handling)
if (typeof window.supabase === 'undefined') {
  console.error("[auth-spike] ERROR: Supabase not loaded!");
  throw new Error("Supabase library not found");
}

// Use Supabase from global window object
const { createClient } = window.supabase;

// Initialize with unique variable name to avoid conflicts
const supabaseClient = createClient(CONFIG.url, CONFIG.publishableKey);
```

### Lessons Learned from Step 3:

1. **CORS is a major issue with ES modules in Webflow**
   - Webflow sites can't import ES modules from most CDNs due to CORS
   - Solution: Use UMD builds with standard script tags

2. **Script order matters**
   - Supabase CDN must load BEFORE auth-spike.js
   - Put both in Head Code to ensure proper ordering

3. **Variable naming conflicts**
   - The global `window.supabase` object conflicts with local variables
   - Solution: Name your client instance something else (e.g., `supabaseClient`)

4. **Use modern API keys**
   - Use `publishableKey` (sb_publishable_...) instead of legacy `anonKey`
   - Both work, but publishableKey is the modern approach

5. **Debugging aids are crucial**
   - Added `console.log("[auth-spike] loaded")` at start for verification
   - Added error checking for missing Supabase library
   - Clear error messages save debugging time

6. **Webflow form handling conflicts**
   - Webflow shows "Passwords cannot be submitted" warning with password fields
   - Solution: Use capturing phase with `stopPropagation()`
   - Add `true` parameter to addEventListener and call `e.stopPropagation()`
   - This intercepts the submit before Webflow's handler runs

7. **Critical typo caused profile creation failure**
   - Had `supabaseClientClient` instead of `supabaseClient` in requireAuthOrRedirect
   - This broke profile creation, logout, and any auth-dependent features
   - Always check console errors carefully for typos

8. **Version tracking for cache-busting**
   - Added BUILD_VERSION timestamp that shows when code was deployed
   - Automated with Husky pre-commit hook to update on every commit
   - Helps verify if Webflow is loading latest version vs cached

---

## Step 4 — Profile Create/Update + RLS Proof (60-120 mins)

### Implementation:
- Auto-creates profile on first login if missing
- Updates profile data via form submission
- RLS policies prevent cross-user access

### Testing RLS:
1. Create User A, update profile
2. Create User B
3. As User B, try to update User A's profile in console
4. Should fail with permission error

---

## Step 5 — Protected Page Gating (30-60 mins)

Use `data-protected` attributes to control page access:

**Protection Types:**
- `data-protected="true"` - Basic authentication required
- `data-protected="course"` - Requires auth + course entitlement (needs `#courseSlug` element)
- `data-protected="account"` - Auth + populates account data
- `data-protected="profile"` - Auth + enables profile editing

The script automatically:
- Checks for `data-protected` attribute on page load
- Applies the appropriate protection level
- Redirects to login if authentication fails
- Loads relevant data based on protection type

---

## Deployment to GitHub Pages

1. **Create/use repository:**
   ```bash
   git init
   git remote add origin https://github.com/USERNAME/REPO.git
   ```

2. **Enable GitHub Pages:**
   - Settings → Pages
   - Source: Deploy from branch
   - Branch: main, folder: / (root)
   - Wait ~5 minutes for deployment

3. **Verify script is accessible:**
   ```
   https://USERNAME.github.io/REPO/auth-spike.js
   ```

---

## Webflow-Specific Issues & Solutions

### The "Passwords cannot be submitted" Dialog
**Problem:** Webflow intercepts form submissions with password fields and shows a warning dialog.

**Solution:** Use event capturing phase to intercept before Webflow:
```javascript
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  e.stopPropagation(); // Stops Webflow's handler
  // Your code here
}, true); // <-- The 'true' enables capturing phase
```

### Form Element IDs Must Be Exact
Webflow doesn't automatically generate IDs. You must manually set these in Webflow Designer:
- Select the form/input element
- Go to Element Settings (gear icon)
- Set the ID field exactly as specified (e.g., `signupForm`, `loginEmail`)
- IDs are case-sensitive!

### Script Loading Order
**Critical:** Must load in this exact order in Webflow's Head Code:
1. Supabase CDN first
2. Your auth script second

If reversed, you'll get "Supabase library not found" error.

## Critical Implementation Notes

### What Actually Works in Webflow:
✅ UMD/global scripts loaded via CDN
✅ Standard `<script>` tags (not type="module")
✅ Scripts in Project Settings → Custom Code → Head Code
✅ Using `window` objects for library access

### What Doesn't Work in Webflow:
❌ ES6 module imports from external CDNs
❌ `type="module"` scripts with cross-origin imports
❌ Most ESM CDNs (esm.sh, unpkg ESM, skypack)
❌ Variable names that conflict with global objects

### Configuration Pattern for Reusability:
```html
<script>
  // Optional: Override defaults before loading script
  window.SB_CONFIG = {
    url: "https://YOUR_PROJECT.supabase.co",
    publishableKey: "sb_publishable_YOUR_KEY",
    redirects: {
      afterLogin: "/dashboard",
      afterSignup: "/welcome",
      afterLogout: "/",
      loginPage: "/login"
    }
  };
</script>
```

---

## Time Estimates (Actual)

- Step 0: 10 mins ✅
- Step 1: 30 mins (Supabase setup)
- Step 2: 45-90 mins (Webflow pages)
- Step 3: **~3 hours** (includes CORS debugging and refactoring)
- Step 4: 60 mins (Profile + RLS)
- Step 5: 30 mins (Protected pages)

**Total spike time: 5-6 hours** (vs 1-2 days estimated)

The main time sink was debugging CORS/module loading issues in Step 3. With this guide, future implementations should take only 2-3 hours.

---

## Automation Setup

### Automatic Version Timestamps with Husky
To track deployments and catch cache issues:

1. **Install dependencies:**
   ```bash
   npm install --save-dev husky
   npx husky init
   ```

2. **The pre-commit hook** (already configured in `.husky/pre-commit`):
   - Runs `update-version.sh` automatically
   - Updates BUILD_VERSION timestamp in auth-spike.js
   - Stages the change for commit

3. **Result:** Every commit shows exactly when it was made in the console log

## Debugging Checklist

When things aren't working:

1. **Check console for the version timestamp**
   - Old timestamp = cached version (hard refresh or clear cache)

2. **Check for typos in variable names**
   - Especially `supabaseClient` (we had `supabaseClientClient` typo)

3. **Verify IDs in Webflow match exactly**
   - Case-sensitive: `loginForm` ≠ `loginform`

4. **Check script order in Webflow**
   - Supabase CDN must be BEFORE auth-spike.js

5. **Test in incognito/private window**
   - Eliminates cache/cookie issues

6. **Check Supabase Auth settings**
   - Redirect URLs must include your Webflow domains
   - Both `.webflow.io` and custom domains

## Phase 1: Course-Gated Content + Account Pages

### Account Page Implementation
Added dynamic data population for `/account` pages to show Supabase data alongside Webflow CMS:

**Required Webflow Elements:**
- Email display: Add one of these to show user email:
  - Element with `data-user-email` attribute, OR
  - Element with ID `userEmail`, OR
  - Element with ID `profileEmail`
- `#profileFullName` - Displays full name from profiles table
- `#entitlementsList` - Container for course entitlements
- `#debugContext` - Optional debug info (shows with ?debug)

**Important: Entitlements Table Schema**
The basic entitlements table only has these columns:
- `id` (uuid)
- `user_id` (uuid)
- `course_slug` (text)
- `created_at` (timestamp)

If you need status/validity dates, add them to your table first:
```sql
ALTER TABLE entitlements
ADD COLUMN status text DEFAULT 'active',
ADD COLUMN valid_from timestamptz,
ADD COLUMN valid_to timestamptz;
```

**Key Implementation Details:**
1. **Conditional Alerts** - Added `CONFIG.enableAlerts` flag to disable popups during demos
2. **Entitlements Display** - Shows course access with status indicators
3. **Debug Mode** - Append `?debug` to URL to see additional context
4. **Graceful Fallbacks** - Shows helpful messages when data is missing

### Code Organization Improvements
As the script grew to 600+ lines, reorganized into clear sections:
1. Configuration & Initialization
2. Utility Functions
3. Auth Form Handlers
4. Profile Management
5. Unified Page Protection System
6. Course Page Entitlement Checking
7. Account Page Data Population
8. Global Auth State Listener
9. Initialization Calls

### Architecture Assessment

**For a spike, the single-file approach remains appropriate because:**
- Easy to deploy and test
- Single script tag in Webflow
- No build process needed
- Fast iteration cycles

**When to refactor to modules:**
- When adding payment integration
- When implementing progress tracking
- If file exceeds 1000 lines
- For production deployment

### Lessons Learned - Phase 1

1. **Demo Polish Matters**
   - Console logs > alerts for screencasts
   - Clear status messages help tell the story
   - Debug info should be hidden by default

2. **Webflow Element IDs**
   - Use semantic IDs that describe purpose
   - Document required IDs clearly
   - Consider prefixing (sb-user-email, sb-entitlements)

3. **Data Population Strategy**
   - Check page path before running queries
   - Use conditional rendering based on available elements
   - Provide fallback content for empty states

4. **Code Growth Management**
   - Table of contents helps navigation
   - Clear section headers improve maintainability
   - Consider extraction points early

## Next Steps for Production

1. **Immediate (for demo):**
   - Ensure test user has entitlements seeded
   - Polish account page CSS in Webflow
   - Test full user journey in incognito

2. **Short-term improvements:**
   - Replace inline HTML with template functions
   - Add loading spinners for async operations
   - Implement retry logic for failed requests

3. **Medium-term refactoring:**
   - Extract form handling into reusable function
   - Create separate config file
   - Add TypeScript definitions

4. **Long-term architecture:**
   - Module-based structure with build process
   - Separate concerns (auth, profile, entitlements)
   - Unit tests for critical paths
   - Error tracking/monitoring integration