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

Add `data-protected="true"` to any element on protected pages.

The script automatically:
- Checks for this attribute
- Redirects to login if no session
- Shows user email if `data-user-email` element exists

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

## Next Steps for Production

1. Replace `alert()` with proper toast notifications
2. Add loading states during API calls
3. Implement better error handling UI
4. Add password strength validation
5. Consider email verification flow
6. Set up proper GitHub Actions for automated deployment
7. Create Webflow template with all required pages/forms pre-built