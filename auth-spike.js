/**
 * Supabase + Webflow Auth Integration
 * Single drop-in script for authentication functionality
 *
 * IMPORTANT: This script requires Supabase to be loaded first via CDN
 * Add this to Webflow BEFORE this script:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *
 * TABLE OF CONTENTS:
 * ==================
 * 1. Configuration & Initialization
 * 2. Utility Functions
 * 3. Auth Form Handlers (Signup, Login, Logout, Password)
 * 4. Profile Management
 * 5. Unified Page Protection System
 * 6. Course Page Entitlement Checking
 * 7. Account Page Data Population
 * 8. Lesson Progress Tracking
 * 9. Global Auth State Listener
 * 10. Initialization Calls
 */

// Build timestamp - UPDATE THIS WITH EACH COMMIT
const BUILD_VERSION = "29/01/2026, 15:40:53"; // Refactored to unified data-protected gating system
console.log(`[auth-spike] loaded - Version: ${BUILD_VERSION}`);

// ============================================================================
// 1. CONFIGURATION & INITIALIZATION
// ============================================================================

function hasDebugFlag() {
  return new URLSearchParams(window.location.search).has("debug");
}

// Check if Supabase is available
if (typeof window.supabase === "undefined") {
  console.error(
    "[auth-spike] ERROR: Supabase not loaded! Add Supabase CDN script before auth-spike.js"
  );
  console.error("Add this to Webflow before auth-spike.js:");
  console.error(
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>'
  );
  throw new Error("Supabase library not found");
}

// Use Supabase from global window object
const { createClient } = window.supabase;

// Configuration - make these configurable later
const CONFIG = window.SB_CONFIG || {
  url: "https://pthlhifuddrtiegtsjxn.supabase.co", // Replace with your Supabase URL
  publishableKey: "sb_publishable_NAakNKy3ON23zw3gqG9CtQ_nLcm_Q70", // Your Supabase publishable key
  redirects: {
    afterLogin: "/account",
    afterSignup: "/account",
    afterLogout: "/login",
    loginPage: "/login",
  },
  // URL patterns for different page types (customize based on your Webflow structure)
  urlPatterns: {
    course: "/courses/{course_slug}", // e.g., /courses/javascript-basics
    lesson: "/lessons/{lesson_slug}", // e.g., /lessons/lms-future-webflow-10
  },
};

// Initialize Supabase client with unique variable name to avoid conflicts
// Note: publishableKey works the same as anonKey - both are safe for client-side use
const supabaseClient = createClient(CONFIG.url, CONFIG.publishableKey);

// ============================================================================
// 2. UTILITY FUNCTIONS
// ============================================================================

/**
 * Ensure a user profile exists in the profiles table
 * Creates one if it doesn't exist, updates email if it does
 * @param {string} userId - The user's auth ID
 * @param {string} email - The user's email
 * @returns {Promise<{success: boolean, profile?: any, error?: any}>}
 */
async function ensureProfileExists(userId, email) {
  try {
    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("Profile fetch error:", fetchError);
      return { success: false, error: fetchError };
    }

    if (existingProfile) {
      return { success: true, profile: existingProfile };
    }

    // Create new profile
    if (hasDebugFlag()) console.log("Creating new profile for user:", userId);

    const { data: newProfile, error: insertError } = await supabaseClient
      .from("profiles")
      .insert({
        id: userId,
        email: email,
        full_name: "",
        avatar_url: "",
      })
      .select()
      .single();

    if (insertError) {
      // 23505 = unique violation (profile already exists - race condition)
      if (insertError.code === '23505') {
        if (hasDebugFlag()) console.log("Profile already exists (race condition), fetching...");
        // Try to fetch again
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        return { success: true, profile };
      }
      console.error("Profile creation error:", insertError);
      return { success: false, error: insertError };
    }

    return { success: true, profile: newProfile };
  } catch (error) {
    console.error("Unexpected error in ensureProfileExists:", error);
    return { success: false, error };
  }
}

// Utility: Check if user is authenticated and redirect if not
async function requireAuthOrRedirect(redirectTo = CONFIG.redirects.loginPage) {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

// Utility: Show user feedback
function showFeedback(message, isError = false) {
  // For demo/Loom recording: use console only to avoid popups
  // Set ENABLE_ALERTS=true in CONFIG to re-enable alerts
  const useAlerts = CONFIG.enableAlerts || false;

  if (isError) {
    console.error(`[auth-spike] Error: ${message}`);
    if (useAlerts) alert(`Error: ${message}`);
  } else {
    console.log(`[auth-spike] ${message}`);
    if (useAlerts) alert(message);
  }
}

// ============================================================================
// 3. AUTH FORM HANDLERS
// ============================================================================

// --------------------
// SIGNUP HANDLER
// --------------------
const signupForm = document.querySelector("#signupForm");
if (signupForm) {
  if (hasDebugFlag()) console.log("Signup form detected, attaching handler");

  signupForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevents Webflow's handler from running

      const email = document.querySelector("#signupEmail")?.value.trim();
      const password = document.querySelector("#signupPassword")?.value;

      if (!email || !password) {
        showFeedback("Please fill in all fields", true);
        return;
      }

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        // If email confirmation is required, show different message
        if (data.user && !data.session) {
          showFeedback("Check your email to confirm your account!");
        } else if (data.user && data.session) {
          // Auto-login successful - ensure profile exists
          await ensureProfileExists(data.user.id, data.user.email);
          // Redirect regardless of profile creation result
          window.location.href = CONFIG.redirects.afterSignup;
        }
      } catch (error) {
        showFeedback(error.message, true);
      }
    },
    true
  ); // Use capturing phase to intercept before Webflow
}

// --------------------
// LOGIN HANDLER
// --------------------
const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  if (hasDebugFlag()) console.log("Login form detected, attaching handler");

  loginForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevents Webflow's handler from running

      const email = document.querySelector("#loginEmail")?.value.trim();
      const password = document.querySelector("#loginPassword")?.value;

      if (!email || !password) {
        showFeedback("Please fill in all fields", true);
        return;
      }

      try {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        window.location.href = CONFIG.redirects.afterLogin;
      } catch (error) {
        showFeedback(error.message, true);
      }
    },
    true
  ); // Use capturing phase to intercept before Webflow
}

// --------------------
// LOGOUT HANDLER
// --------------------
const logoutBtn = document.querySelector("#logoutBtn");
if (logoutBtn) {
  if (hasDebugFlag()) console.log("Logout button detected, attaching handler");

  logoutBtn.addEventListener("click", async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;

      window.location.href = CONFIG.redirects.afterLogout;
    } catch (error) {
      showFeedback(error.message, true);
    }
  });
}

// --------------------
// PASSWORD RESET REQUEST
// --------------------
const resetForm = document.querySelector("#resetForm");
if (resetForm) {
  console.log("Password reset form detected, attaching handler");

  resetForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevents Webflow's handler from running

      const email = document.querySelector("#resetEmail")?.value.trim();

      if (!email) {
        showFeedback("Please enter your email", true);
        return;
      }

      try {
        const { error } = await supabaseClient.auth.resetPasswordForEmail(
          email,
          {
            redirectTo: `${window.location.origin}/update-password`,
          }
        );

        if (error) throw error;

        showFeedback("Check your email for the password reset link");
      } catch (error) {
        showFeedback(error.message, true);
      }
    },
    true
  ); // Use capturing phase to intercept before Webflow
}

// --------------------
// PASSWORD UPDATE (after email link)
// --------------------
async function handlePasswordRecovery() {
  // Check if we have a recovery code in the URL
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (!code) {
    console.log("No recovery code found in URL");
    return false;
  }

  console.log("Recovery code found, exchanging for session");

  try {
    const { error } = await supabaseClient.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn("Code exchange failed:", error.message);
      return false;
    }

    // Clean up URL
    url.searchParams.delete("code");
    window.history.replaceState({}, document.title, url.toString());

    return true;
  } catch (error) {
    console.error("Password recovery error:", error);
    return false;
  }
}

const updatePwForm = document.querySelector("#updatePwForm");
if (updatePwForm) {
  console.log("Password update form detected");

  // Try to handle recovery code first
  handlePasswordRecovery().then((success) => {
    if (!success) {
      showFeedback("Invalid or expired reset link", true);
    }
  });

  updatePwForm.addEventListener(
    "submit",
    async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevents Webflow's handler from running

      const newPassword = document.querySelector("#newPassword")?.value;
      const confirmPassword = document.querySelector("#confirmPassword")?.value;

      if (!newPassword) {
        showFeedback("Please enter a new password", true);
        return;
      }

      // Optional: Check password confirmation if field exists
      if (confirmPassword && newPassword !== confirmPassword) {
        showFeedback("Passwords do not match", true);
        return;
      }

      try {
        const { error } = await supabaseClient.auth.updateUser({
          password: newPassword,
        });

        if (error) throw error;

        showFeedback(
          "Password updated successfully! Please log in with your new password."
        );

        // Sign out and redirect to login
        await supabaseClient.auth.signOut();
        setTimeout(() => {
          window.location.href = CONFIG.redirects.loginPage;
        }, 2000);
      } catch (error) {
        showFeedback(error.message, true);
      }
    },
    true
  ); // Use capturing phase to intercept before Webflow
}

// ============================================================================
// 4. PROFILE MANAGEMENT
// ============================================================================

/**
 * Initialize profile form with authentication
 * Called from unified protection system when data-protected="profile"
 */
async function initializeProfileForm(session) {
  const profileForm = document.querySelector("#profileForm");
  if (!profileForm) {
    console.warn("[auth-spike] No profile form found despite data-protected='profile'");
    return;
  }

  if (hasDebugFlag()) console.log("Initializing profile form");
  const user = session.user;

    try {
      // Ensure profile exists and get it
      const { success, profile, error } = await ensureProfileExists(user.id, user.email);

      if (!success) {
        console.error("Could not ensure profile exists:", error);
        showFeedback("Error loading profile. Please refresh the page.", true);
        return;
      }

      // Populate form with existing data
      if (profile) {
        const fullNameField = document.querySelector("#fullName");
        const emailDisplay = document.querySelector("#profileEmail");

        if (fullNameField && profile.full_name) {
          fullNameField.value = profile.full_name;
        }

        if (emailDisplay) {
          emailDisplay.textContent = profile.email || user.email;
        }
      }

      // Handle form submission
      profileForm.addEventListener(
        "submit",
        async (e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevents Webflow's handler from running

          const full_name = document.querySelector("#fullName")?.value || "";

          try {
            // Re-verify session at submission time
            const { data: { session: currentSession } } = await supabaseClient.auth.getSession();
            if (!currentSession) {
              showFeedback("Session expired. Please log in again.", true);
              window.location.href = CONFIG.redirects.loginPage;
              return;
            }

            const { error } = await supabaseClient
              .from("profiles")
              .update({
                full_name,
                updated_at: new Date().toISOString(),
              })
              .eq("id", currentSession.user.id);

            if (error) throw error;

            showFeedback("Profile updated successfully!");
          } catch (error) {
            showFeedback(error.message, true);
          }
        },
        true
      ); // Use capturing phase to intercept before Webflow
    } catch (error) {
      console.error("Profile initialization error:", error);
      showFeedback("Error loading profile", true);
    }
}

// ============================================================================
// 5. UNIFIED PAGE PROTECTION SYSTEM
// ============================================================================

/**
 * Main protection system that checks data-protected attributes
 * Protection types:
 * - "true" or "basic": Simple authentication required
 * - "course": Authentication + entitlement check (requires courseSlug element)
 * - "account": Authentication + account data population
 * - "profile": Authentication + profile form handling
 */
async function initializePageProtection() {
  const protectedEl = document.querySelector("[data-protected]");

  if (!protectedEl) {
    if (hasDebugFlag()) console.log("[auth-spike] No protection required on this page");
    return;
  }

  const protectionType = protectedEl.getAttribute("data-protected");
  if (hasDebugFlag()) console.log(`[auth-spike] Page protection type: ${protectionType}`);

  // Check for debug bypass
  if (hasDebugFlag()) {
    console.log("[auth-spike] Protection bypassed via ?debug");
    return;
  }

  // Most protection types need auth, so check once
  const needsAuth = ["true", "basic", "account", "profile"].includes(protectionType);
  let session = null;

  if (needsAuth) {
    session = await requireAuthOrRedirect();
    if (!session) return; // Redirect already happened
  }

  // Handle different protection types
  switch(protectionType) {
    case "true":
    case "basic":
      // Simple auth check - already done above
      if (hasDebugFlag()) console.log("User authenticated, access granted");
      // Optionally show user info
      const userDisplay = document.querySelector("[data-user-email]");
      if (userDisplay && session) {
        userDisplay.textContent = session.user.email;
      }
      break;

    case "course":
      // Auth + entitlement check
      // Note: Still requires courseSlug element to be present
      await handleCoursePageGating();
      break;

    case "account":
      // Auth + account data population
      await populateAccountPage();
      await renderProgressOnAccount();
      break;

    case "profile":
      // Auth + profile form handling
      await initializeProfileForm(session);
      break;

    default:
      console.warn(`[auth-spike] Unknown protection type: ${protectionType}, defaulting to basic auth`);
      await requireAuthOrRedirect();
  }
}

// ============================================================================
// 8. LESSON PROGRESS TRACKING
// ============================================================================

/**
 * Get session helper for progress tracking
 */
async function getSessionOrNull() {
  const { data } = await supabaseClient.auth.getSession();
  return data?.session || null;
}

/**
 * Read text content from DOM element by ID
 */
function readText(id) {
  const el = document.getElementById(id);
  return el ? el.textContent.trim() : null;
}

/**
 * Mark a lesson as complete in Supabase
 */
async function markLessonComplete() {
  const session = await getSessionOrNull();
  if (!session) {
    console.log("[progress] No session, cannot mark complete");
    return;
  }

  const userId = session.user.id;
  const courseSlug = readText("courseSlug");
  const moduleSlug = readText("moduleSlug");
  const lessonSlug = readText("lessonSlug");

  if (!lessonSlug) {
    console.warn("[progress] No lessonSlug found in DOM");
    return;
  }

  const nowIso = new Date().toISOString();

  const payload = {
    user_id: userId,
    course_slug: courseSlug,
    module_slug: moduleSlug,
    lesson_slug: lessonSlug,
    completed: true,
    completed_at: nowIso,
    last_viewed_at: nowIso,
    updated_at: nowIso,
  };

  const { error } = await supabaseClient
    .from("lesson_progress")
    .upsert(payload, { onConflict: "user_id,lesson_slug" });

  if (error) {
    console.error("[progress] upsert failed", error);
    showFeedback("Could not save progress", true);
    return;
  }

  // Update UI to show completion
  const statusEl = document.getElementById("completionStatus");
  if (statusEl) {
    statusEl.textContent = "✅ Completed";
  }

  // Also update button text if needed
  const btn = document.getElementById("markCompleteBtn");
  if (btn) {
    btn.textContent = "Completed";
    btn.disabled = true;
  }

  console.log("[progress] Marked complete:", lessonSlug);
  showFeedback("Progress saved!");
}

/**
 * Check if lesson is already completed and update UI
 */
async function checkLessonProgress() {
  const session = await getSessionOrNull();
  if (!session) return;

  const lessonSlug = readText("lessonSlug");
  if (!lessonSlug) return;

  const userId = session.user.id;

  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .select("completed, completed_at")
    .eq("user_id", userId)
    .eq("lesson_slug", lessonSlug)
    .maybeSingle();

  if (error) {
    console.error("[progress] check failed", error);
    return;
  }

  if (data?.completed) {
    // Update UI to show already completed
    const statusEl = document.getElementById("completionStatus");
    if (statusEl) {
      statusEl.textContent = "✅ Completed";
    }

    const btn = document.getElementById("markCompleteBtn");
    if (btn) {
      btn.textContent = "Completed";
      btn.disabled = true;
    }

    console.log("[progress] Already completed:", lessonSlug);
  }
}

/**
 * Initialize lesson progress UI and handlers
 */
function initLessonProgressUI() {
  // Only run on lesson pages (check for lessonSlug)
  const lessonSlug = readText("lessonSlug");
  if (!lessonSlug) {
    return; // Not a lesson page
  }

  console.log("[progress] Initializing for lesson:", lessonSlug);

  // Check existing progress on page load
  checkLessonProgress();

  // Attach handler to mark complete button
  const btn = document.getElementById("markCompleteBtn");
  if (btn) {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      await markLessonComplete();
    });
    console.log("[progress] Mark complete button handler attached");
  }
}

// ============================================================================
// 9. GLOBAL AUTH STATE LISTENER
// ============================================================================
supabaseClient.auth.onAuthStateChange((event, session) => {
  console.log("Auth state changed:", event);

  // Handle auth events
  switch (event) {
    case "SIGNED_IN":
      console.log("User signed in:", session?.user.email);
      break;
    case "SIGNED_OUT":
      console.log("User signed out");
      break;
    case "TOKEN_REFRESHED":
      console.log("Token refreshed");
      break;
    case "USER_UPDATED":
      console.log("User updated");
      break;
  }
});

// ============================================================================
// 6. COURSE PAGE ENTITLEMENT CHECKING
// ============================================================================

function getCourseSlugFromDom() {
  const el = document.getElementById("courseSlug");
  return el?.textContent?.trim() || null;
}

async function handleCoursePageGating() {
  if (hasDebugFlag()) {
    console.log("[auth-spike] gating bypassed via ?debug");
    return;
  }
  const courseSlug = getCourseSlugFromDom();
  if (!courseSlug) return; // not a course page

  const { data: sessionRes } = await supabaseClient.auth.getSession();
  const session = sessionRes?.session;

  if (!session) {
    console.log("[auth-spike] no session, redirecting to /login");
    window.location.href = "/login";
    return;
  }

  const userId = session.user.id;

  const { data, error } = await supabaseClient
    .from("entitlements")
    .select("course_slug")
    .eq("user_id", userId)
    .eq("course_slug", courseSlug)
    .limit(1);

  if (error) {
    console.error("[auth-spike] entitlement check failed", error);
    window.location.href = "/no-access";
    return;
  }

  if (!data || data.length === 0) {
    console.log("[auth-spike] no entitlement for", courseSlug);
    window.location.href = "/no-access";
    return;
  }

  console.log("[auth-spike] entitlement OK for", courseSlug);
}

// ============================================================================
// 7. ACCOUNT PAGE DATA POPULATION
// ============================================================================
async function populateAccountPage() {
  if (hasDebugFlag()) console.log("[auth-spike] Populating account page data");

  // Get current session (assumes already authenticated by protection system)
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    console.error("[auth-spike] No session found for account population");
    return;
  }

  const user = session.user;

  // 1) Email - try multiple selectors
  const userEmailEl = document.querySelector("[data-user-email]") ||
                      document.getElementById("userEmail") ||
                      document.getElementById("profileEmail");
  if (userEmailEl) {
    userEmailEl.textContent = user.email;
    if (hasDebugFlag()) console.log("[auth-spike] Set user email display");
  } else if (hasDebugFlag()) {
    console.log("[auth-spike] No email display element found. Tried: [data-user-email], #userEmail, #profileEmail");
  }

  // 2) Profile full name from Supabase
  const fullNameEl = document.getElementById("profileFullName");
  if (fullNameEl) {
    const { data: profile, error } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!error && profile?.full_name) {
      fullNameEl.textContent = profile.full_name;
      if (hasDebugFlag()) console.log("[auth-spike] Set profile full name:", profile.full_name);
    } else {
      fullNameEl.textContent = "(name not set yet)";
      if (hasDebugFlag()) console.log("[auth-spike] No profile name found");
    }
  }

  // 3) Entitlements list (course-level)
  const entitlementsEl = document.getElementById("entitlementsList");
  if (entitlementsEl) {
    // Only select columns that actually exist in the table
    // Basic entitlements table only has: id, user_id, course_slug, created_at
    const { data: ents, error } = await supabaseClient
      .from("entitlements")
      .select("course_slug")
      .eq("user_id", user.id);

    if (error) {
      entitlementsEl.innerHTML = '<p class="error">Could not load entitlements.</p>';
      console.error("[auth-spike] Entitlements error:", error);
      return;
    }

    if (!ents || ents.length === 0) {
      entitlementsEl.innerHTML = '<p class="empty">No course access found. Contact support if this is incorrect.</p>';
      console.log("[auth-spike] No entitlements found for user");
      return;
    }

    // Build entitlements display with links to courses
    const coursePattern = CONFIG.urlPatterns?.course || "/courses/{course_slug}";
    entitlementsEl.innerHTML = `
      <ul class="entitlements-list">
        ${ents
          .map((e) => {
            const courseUrl = coursePattern.replace("{course_slug}", e.course_slug);
            return `<li>
              <a href="${courseUrl}"><strong>${e.course_slug}</strong></a>
              <span class="status-active">active</span>
            </li>`;
          })
          .join("")}
      </ul>
    `;
    if (hasDebugFlag()) console.log(`[auth-spike] Displayed ${ents.length} entitlements`);
  }

  // 4) Debug context (optional - for development)
  const debugEl = document.getElementById("debugContext");
  if (debugEl && hasDebugFlag()) {
    debugEl.innerHTML = `
      <div class="debug-info">
        <strong>Debug Info:</strong>
        <br>User ID: ${user.id}
        <br>Email: ${user.email}
        <br>Session: Active
        <br>Page: ${window.location.pathname}
      </div>
    `;
    console.log("[auth-spike] Debug context displayed");
  }
}

/**
 * Render user's completed lessons progress on /account page
 */
async function renderProgressOnAccount() {
  // Get current session (assumes already authenticated by protection system)
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    console.error("[auth-spike] No session found for progress render");
    return;
  }

  const userId = session.user.id;

  const listEl = document.getElementById("progressList");
  const emptyEl = document.getElementById("progressEmptyState");

  if (!listEl) {
    console.log("[progress] #progressList not found on /account, skipping progress render");
    return;
  }

  console.log("[progress] Fetching completed lessons for account page");

  // Fetch completed lessons (latest first)
  const { data, error } = await supabaseClient
    .from("lesson_progress")
    .select("course_slug,module_slug,lesson_slug,completed,completed_at,updated_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[progress] Failed to read progress", error);
    listEl.innerHTML = '<p class="error">Could not load progress.</p>';
    if (emptyEl) emptyEl.style.display = "none";
    return;
  }

  if (!data || data.length === 0) {
    console.log("[progress] No completed lessons found");
    listEl.innerHTML = "";
    if (emptyEl) {
      emptyEl.style.display = "";
      emptyEl.textContent = "No completed lessons yet.";
    }
    return;
  }

  console.log(`[progress] Found ${data.length} completed lessons`);

  // Hide empty state if we have data
  if (emptyEl) emptyEl.style.display = "none";

  // Format date helper
  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      const date = new Date(iso);
      // Use a shorter format for better display
      return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  // Build the progress list HTML
  listEl.innerHTML = `
    <ul class="progress-list">
      ${data
        .map((row) => {
          const when = formatDate(row.completed_at || row.updated_at);
          // Build lesson URL if we have the lesson slug
          const lessonPattern = CONFIG.urlPatterns?.lesson || "/lessons/{lesson_slug}";
          const lessonUrl = row.lesson_slug
            ? lessonPattern.replace("{lesson_slug}", row.lesson_slug)
            : null;

          return `
            <li class="progress-item">
              ${lessonUrl
                ? `<a href="${lessonUrl}"><strong>${row.lesson_slug}</strong></a>`
                : `<strong>${row.lesson_slug}</strong>`
              }
              <div class="progress-meta" style="opacity:0.8;font-size:0.9em">
                ${row.course_slug} / ${row.module_slug}
                ${when ? `— Completed: ${when}` : ""}
              </div>
            </li>
          `;
        })
        .join("")}
    </ul>
    <div class="progress-summary" style="margin-top:1rem;padding-top:1rem;border-top:1px solid #eee">
      <em>Total completed: ${data.length} lesson${data.length !== 1 ? 's' : ''}</em>
    </div>
  `;
}

// ============================================================================
// 10. INITIALIZATION CALLS
// ============================================================================

// Log initialization
console.log("Supabase auth script loaded and initialized");
console.log("Config:", {
  url: CONFIG.url,
  hasKey: !!CONFIG.publishableKey,
  redirects: CONFIG.redirects,
});

// Initialize unified page protection system
initializePageProtection();

// Initialize lesson progress tracking (independent of protection)
initLessonProgressUI();
