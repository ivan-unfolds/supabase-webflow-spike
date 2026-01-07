/**
 * Supabase + Webflow Auth Integration
 * Single drop-in script for authentication functionality
 *
 * IMPORTANT: This script requires Supabase to be loaded first via CDN
 * Add this to Webflow BEFORE this script:
 * <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 */

console.log("[auth-spike] loaded");

// Check if Supabase is available
if (typeof window.supabase === 'undefined') {
  console.error("[auth-spike] ERROR: Supabase not loaded! Add Supabase CDN script before auth-spike.js");
  console.error("Add this to Webflow before auth-spike.js:");
  console.error('<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
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

// Utility: Check if user is authenticated and redirect if not
async function requireAuthOrRedirect(redirectTo = CONFIG.redirects.loginPage) {
  const {
    data: { session },
  } = await supabaseClientClient.auth.getSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}

// Utility: Show user feedback
function showFeedback(message, isError = false) {
  // For spike, just use alert. In production, replace with better UX
  if (isError) {
    console.error(message);
    alert(`Error: ${message}`);
  } else {
    console.log(message);
    alert(message);
  }
}

// ====================
// SIGNUP HANDLER
// ====================
const signupForm = document.querySelector("#signupForm");
if (signupForm) {
  console.log("Signup form detected, attaching handler");

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

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
  });
}

// ====================
// LOGIN HANDLER
// ====================
const loginForm = document.querySelector("#loginForm");
if (loginForm) {
  console.log("Login form detected, attaching handler");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

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
  });
}

// ====================
// LOGOUT HANDLER
// ====================
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

// ====================
// PASSWORD RESET REQUEST
// ====================
const resetForm = document.querySelector("#resetForm");
if (resetForm) {
  console.log("Password reset form detected, attaching handler");

  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector("#resetEmail")?.value.trim();

    if (!email) {
      showFeedback("Please enter your email", true);
      return;
    }

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      showFeedback("Check your email for the password reset link");
    } catch (error) {
      showFeedback(error.message, true);
    }
  });
}

// ====================
// PASSWORD UPDATE (after email link)
// ====================
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

  updatePwForm.addEventListener("submit", async (e) => {
    e.preventDefault();

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
  });
}

// ====================
// PROFILE MANAGEMENT
// ====================
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
      profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

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
      });
    } catch (error) {
      console.error("Profile initialization error:", error);
      showFeedback("Error loading profile", true);
    }
  })();
}

// ====================
// PROTECTED PAGE GATING
// ====================
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

// ====================
// GLOBAL AUTH STATE LISTENER
// ====================
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

// Log initialization
console.log("Supabase auth script loaded and initialized");
console.log("Config:", {
  url: CONFIG.url,
  hasKey: !!CONFIG.publishableKey,
  redirects: CONFIG.redirects,
});
