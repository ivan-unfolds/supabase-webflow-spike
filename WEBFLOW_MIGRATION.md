# Webflow Migration Guide - Protection System Update

## ⚠️ BREAKING CHANGES

The gating system now uses **explicit `data-protected` attributes** instead of auto-detecting based on element IDs. You must update your Webflow pages.

## Quick Reference

| Page Type         | Old System                                  | New System                                |
| ----------------- | ------------------------------------------- | ----------------------------------------- |
| Login/Signup      | No change                                   | No change (still public)                  |
| Account Page      | Auto-protected if path = `/account`         | Add `data-protected="account"`            |
| Profile Edit      | Auto-protected if has `#profileForm`        | Add `data-protected="profile"`            |
| Course Pages      | Auto-protected if has `#courseSlug`         | Add `data-protected="course"`             |
| Generic Protected | Add `data-protected="true"`                 | Same (no change)                          |
| People Page       | Accidentally protected (had `#profileForm`) | Remove protection or add `data-protected` |

## Migration Steps

### Step 1: Update Your Account Page

1. In Webflow, go to your **Account** page
2. Select the main wrapper/container element
3. In the Settings panel, add custom attribute:
   - Name: `data-protected`
   - Value: `account`
4. Ensure these IDs exist for data population:
   - `userEmail` or `profileEmail` (for email display)
   - `entitlementsList` (for course list)
   - `progressList` (for completed lessons)

**Smoke Test:**

- Publish and visit `/account` logged out → redirects to `/login` ✓
- Login and visit `/account` → shows your data ✓

### Step 2: Update Profile Edit Pages

1. Go to any page with profile editing form
2. Select the main wrapper element
3. Add custom attribute:
   - Name: `data-protected`
   - Value: `profile`
4. Keep the `profileForm` ID on your form element

**Smoke Test:**

- Visit profile page logged out → redirects to `/login` ✓
- Login and visit profile → can edit and save ✓

### Step 3: Update Course/Lesson Pages

1. Go to your course template or individual course pages
2. Select the main wrapper element
3. Add custom attribute:
   - Name: `data-protected`
   - Value: `course`
4. Ensure these elements exist (can be hidden):
   - Element with ID `courseSlug` containing the course identifier
   - (Optional) `moduleSlug` for module name
   - (Optional) `lessonSlug` for lesson name

Example structure in Webflow:

```
Main Container [data-protected="course"]
  ├── Hidden Div [id="courseSlug"] → Text: "javascript-basics"
  ├── Hidden Div [id="moduleSlug"] → Text: "module-1"
  ├── Hidden Div [id="lessonSlug"] → Text: "intro-to-variables"
  └── Visible course content...
```

**Smoke Test:**

- Visit course without login → redirects to `/login` ✓
- Login without entitlement → redirects to `/no-access` ✓
- Login with entitlement → shows course content ✓

### Step 4: Fix the People Page (or similar duplicated pages)

**If People page should be PUBLIC:**

1. Go to People page in Webflow
2. Remove/rename the `profileForm` ID if it exists
3. Do NOT add any `data-protected` attribute

**If People page should be PROTECTED:**

1. Add custom attribute:
   - Name: `data-protected`
   - Value: `true`

**Smoke Test:**

- Visit `/people` → should work based on your choice above ✓

### Step 5: Update Generic Protected Pages

For any other member-only pages:

1. Select the main wrapper
2. Add custom attribute:
   - Name: `data-protected`
   - Value: `true`

### Step 6: Test Everything

Run through this checklist:

#### Public Pages (no protection)

- [ ] Home page loads without login
- [ ] Login page accessible
- [ ] Signup page accessible
- [ ] People page (if made public)

#### Protected Pages

- [ ] `/account` requires login
- [ ] `/account` shows user email
- [ ] `/account` shows entitlements list
- [ ] `/account` shows progress (if any)
- [ ] Profile edit page requires login
- [ ] Profile form saves correctly
- [ ] Course pages require login
- [ ] Course pages check entitlements
- [ ] Lesson complete button works

#### Debug Mode

- [ ] Add `?debug` to any protected URL → bypasses protection

## Troubleshooting

### "Page is protected but shouldn't be"

- Check for leftover `data-protected` attributes
- In old system, check for `#profileForm` or other trigger IDs

### "Page isn't protected but should be"

- Verify `data-protected` attribute is added
- Check browser console for `[auth-spike]` messages
- Ensure attribute is on element that exists on page load

### "Course protection not working"

- Verify `#courseSlug` element exists
- Check the course slug matches your database
- Check user has entitlement in Supabase

### "Account data not showing"

- Verify element IDs match exactly:
  - `userEmail` or `profileEmail`
  - `entitlementsList`
  - `progressList`
- Check console for errors

## Quick Copy-Paste Attributes

For Webflow's custom attributes panel:

**Basic Protection:**

- Name: `data-protected`
- Value: `true`

**Account Page:**

- Name: `data-protected`
- Value: `account`

**Profile Edit:**

- Name: `data-protected`
- Value: `profile`

**Course/Lesson:**

- Name: `data-protected`
- Value: `course`

## What Changed in the Code?

1. **Removed** automatic protection based on:
   - Element IDs (`#profileForm` presence)
   - URL paths (`/account`)

2. **Added** explicit protection via `data-protected` attribute

3. **Benefit**: You have full control - no surprise protection from duplicating pages!

## Need Help?

Check the console for `[auth-spike]` messages - they'll tell you:

- What protection type was detected
- Whether authentication succeeded
- What data is being populated

The new system is more explicit and predictable. Once updated, you'll never have surprise protection issues from duplicating pages!
