# Supabase + Webflow Auth Integration Setup

## Quick Start

### 1. Update Configuration

Edit `auth-spike.js` and replace these values:
```javascript
const CONFIG = window.SB_CONFIG || {
  url: "https://YOUR_PROJECT.supabase.co", // Your Supabase project URL
  publishableKey: "sb_publishable_YOUR_KEY", // Your Supabase publishable key
  // ... rest of config
};
```

**Note:** Use the new `sb_publishable_...` key format if available. If you only have the legacy `anon` key (starts with `eyJ...`), that works too - both are safe for client-side use.

### 2. Deploy to GitHub Pages

1. Push this file to your GitHub repo
2. Enable GitHub Pages in repo Settings → Pages
3. Your script will be available at:
   ```
   https://YOUR_USERNAME.github.io/YOUR_REPO/auth-spike.js
   ```

### 3. Add to Webflow

Add this to your Webflow site (either site-wide or specific pages):

```html
<script type="module" src="https://YOUR_USERNAME.github.io/YOUR_REPO/auth-spike.js"></script>
```

Or with configuration override:
```html
<script>
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
<script type="module" src="https://YOUR_USERNAME.github.io/YOUR_REPO/auth-spike.js"></script>
```

## Required Webflow Page Structure

### Signup Page (`/signup`)
```html
<form id="signupForm">
  <input type="email" id="signupEmail" required>
  <input type="password" id="signupPassword" required>
  <button type="submit">Sign Up</button>
</form>
```

### Login Page (`/login`)
```html
<form id="loginForm">
  <input type="email" id="loginEmail" required>
  <input type="password" id="loginPassword" required>
  <button type="submit">Log In</button>
</form>
```

### Password Reset Page (`/reset-password`)
```html
<form id="resetForm">
  <input type="email" id="resetEmail" required>
  <button type="submit">Send Reset Email</button>
</form>
```

### Password Update Page (`/update-password`)
```html
<form id="updatePwForm">
  <input type="password" id="newPassword" required>
  <input type="password" id="confirmPassword"> <!-- Optional -->
  <button type="submit">Update Password</button>
</form>
```

### Account/Profile Page (`/account`)
```html
<form id="profileForm">
  <span id="profileEmail"></span> <!-- Shows user email -->
  <input type="text" id="fullName" placeholder="Full Name">
  <button type="submit">Save Profile</button>
</form>
<button id="logoutBtn">Log Out</button>
```

### Protected Pages
Add this attribute to any element on pages that require authentication:
```html
<div data-protected="true">
  <!-- Protected content -->
  <span data-user-email></span> <!-- Optional: displays user email -->
</div>
```

## Supabase Setup Checklist

### 1. Database Schema
Run this SQL in Supabase SQL Editor:

```sql
-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies
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

### 2. Authentication Settings

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://YOUR_DOMAIN.com`
- **Redirect URLs** (add all that apply):
  - `https://YOUR_PROJECT.webflow.io/*`
  - `https://YOUR_CUSTOM_DOMAIN.com/*`
  - `http://localhost:*` (for local testing)

### 3. Email Templates (Optional)

Customize email templates in Authentication → Email Templates for:
- Confirm signup
- Reset password
- Magic link

## Testing the Integration

1. **Test Signup**:
   - Navigate to `/signup`
   - Create new account
   - Should redirect to `/account` (or check email if confirmation required)

2. **Test Login**:
   - Navigate to `/login`
   - Enter credentials
   - Should redirect to `/account`

3. **Test Password Reset**:
   - Navigate to `/reset-password`
   - Enter email
   - Check email for reset link
   - Click link → should go to `/update-password`
   - Set new password

4. **Test Profile**:
   - While logged in, go to `/account`
   - Update name
   - Should save successfully

5. **Test Protected Pages**:
   - Log out
   - Try to access protected page
   - Should redirect to `/login`
   - Log in
   - Should now access protected page

6. **Test RLS** (in browser console):
   ```javascript
   // This should fail if logged in as different user
   await supabase
     .from('profiles')
     .update({full_name: 'Hacker'})
     .eq('id', 'OTHER_USER_ID');
   ```

## Troubleshooting

### "Module not found" error
- Ensure you're using `type="module"` in your script tag
- Check that the GitHub Pages URL is accessible

### Authentication not persisting
- Check Supabase URL configuration
- Ensure cookies are enabled
- Check for CORS issues

### Password reset not working
- Verify redirect URLs in Supabase include your domain
- Check email templates in Supabase
- Ensure `/update-password` page exists

### Profile not saving
- Check browser console for errors
- Verify RLS policies are applied
- Ensure user is authenticated

## Production Considerations

1. **Replace alerts**: Implement proper toast notifications or error displays
2. **Add loading states**: Show spinners during API calls
3. **Validate inputs**: Add client-side validation
4. **Handle edge cases**: Network errors, session expiry
5. **Secure the config**: Consider environment-specific configs
6. **Add analytics**: Track auth events
7. **Implement rate limiting**: Protect against abuse

## Making It Reusable

To use across multiple Webflow projects:

1. Host the script once on GitHub Pages
2. In each Webflow project, just add:
   ```html
   <script>
     window.SB_CONFIG = {
       url: "PROJECT_SPECIFIC_URL",
       anonKey: "PROJECT_SPECIFIC_KEY",
       redirects: { /* project specific */ }
     };
   </script>
   <script type="module" src="https://shared.github.io/auth-spike.js"></script>
   ```
3. Ensure all projects use the same element IDs