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
 * 5. Protected Page Gating
 * 6. Course Page Entitlement Checking
 * 7. Account Page Data Population
 * 8. Lesson Progress Tracking
 * 9. Global Auth State Listener
 * 10. Initialization Calls
 */

// Build timestamp - UPDATE THIS WITH EACH COMMIT
const BUILD_VERSION = "21/01/2026, 20:27:14"; // Added progress tracking
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
};

// Initialize Supabase client with unique variable name to avoid conflicts
// Note: publishableKey works the same as anonKey - both are safe for client-side use
const supabaseClient = createClient(CONFIG.url, CONFIG.publishableKey);

// ============================================================================
// 2. UTILITY FUNCTIONS
// ============================================================================

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
  console.log("Signup form detected, attaching handler");

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
        } else {
          // Auto-login successful
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
  console.log("Login form detected, attaching handler");

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
  console.log("Logout button detected, attaching handler");

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
const profileForm = document.querySelector("#profileForm");
if (profileForm) {
  console.log("Profile form detected, loading profile");

  (async () => {
    // Require authentication
    const session = await requireAuthOrRedirect();
    if (!session) return;

    const user = session.user;

    try {
      // Check if profile exists
      let { data: profile, error: fetchError } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError) {
        console.warn("Profile fetch error:", fetchError);
      }

      // Create profile if it doesn't exist
      if (!profile) {
        console.log("Creating new profile for user");

        const { data: newProfile, error: insertError } = await supabaseClient
          .from("profiles")
          .insert({
            id: user.id,
            email: user.email,
            full_name: "",
            avatar_url: "",
          })
          .select()
          .single();

        if (insertError) {
          console.error("Profile creation error:", insertError);
        } else {
          profile = newProfile;
        }
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
            const { error } = await supabaseClient
              .from("profiles")
              .update({
                full_name,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

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
  })();
}

// ============================================================================
// 5. PROTECTED PAGE GATING
// ============================================================================
// Check for protected page markers
const protectedMarkers = document.querySelectorAll("[data-protected='true']");
if (protectedMarkers.length > 0) {
  console.log("Protected page detected, checking authentication");

  (async () => {
    const session = await requireAuthOrRedirect();
    if (session) {
      console.log("User authenticated, access granted");

      // Optionally show user info
      const userEmail = session.user.email;
      const userDisplay = document.querySelector("[data-user-email]");
      if (userDisplay) {
        userDisplay.textContent = userEmail;
      }
    }
  })();
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
async function populateAccountDemo() {
  // Only run on /account page
  if (!window.location.pathname.startsWith("/account")) return;

  console.log("[auth-spike] Populating account page data");

  const session = await requireAuthOrRedirect();
  if (!session) return;

  const user = session.user;

  // 1) Email - try multiple selectors
  const userEmailEl = document.querySelector("[data-user-email]") ||
                      document.getElementById("userEmail") ||
                      document.getElementById("profileEmail");
  if (userEmailEl) {
    userEmailEl.textContent = user.email;
    console.log("[auth-spike] Set user email display");
  } else {
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
      console.log("[auth-spike] Set profile full name:", profile.full_name);
    } else {
      fullNameEl.textContent = "(name not set yet)";
      console.log("[auth-spike] No profile name found");
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
    const baseUrl = `${window.location.origin}/courses/`;
    entitlementsEl.innerHTML = `
      <ul class="entitlements-list">
        ${ents
          .map((e) => {
            const courseUrl = `${baseUrl}${e.course_slug}`;
            return `<li>
              <a href="${courseUrl}"><strong>${e.course_slug}</strong></a>
              <span class="status-active">active</span>
            </li>`;
          })
          .join("")}
      </ul>
    `;
    console.log(`[auth-spike] Displayed ${ents.length} entitlements`);
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

// Run course page gating check
handleCoursePageGating();

// Run account page population
populateAccountDemo();

// Initialize lesson progress tracking
initLessonProgressUI();
