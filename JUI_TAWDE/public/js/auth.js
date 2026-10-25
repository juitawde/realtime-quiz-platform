/**
 * AuthManager - Client-side authentication and session state controller
 * Supports dedicated login/register pages and professional SVG navigation.
 */
const AuthManager = (() => {
  let currentUser = null;

  async function init() {
    await fetchCurrentUser();
    renderAuthUI();
  }

  async function fetchCurrentUser() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json();
      if (data.ok && data.user) {
        currentUser = data.user;
      } else {
        currentUser = null;
      }
    } catch (err) {
      console.warn("Failed to fetch user state:", err);
      currentUser = null;
    }
    return currentUser;
  }

  function getUser() {
    return currentUser;
  }

  async function login(email, password) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = data.user;
      renderAuthUI();
      return { ok: true, user: data.user, token: data.token };
    }
    return { ok: false, error: data.error || "Login failed." };
  }

  async function register(displayName, email, password) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ displayName, email, password })
    });
    const data = await res.json();
    if (data.ok) {
      currentUser = data.user;
      renderAuthUI();
      return { ok: true, user: data.user, token: data.token };
    }
    return { ok: false, error: data.error || "Registration failed." };
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });
    } catch (e) {
      console.warn("Logout error:", e);
    }
    currentUser = null;
    renderAuthUI();

    // Notify history or dashboard to update
    if (window.QuizHistory && typeof window.QuizHistory.onAuthChanged === "function") {
      window.QuizHistory.onAuthChanged(null);
    }

    // If currently on an authenticated-only section or page, refresh
    if (window.location.pathname.includes("history")) {
      window.location.reload();
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderAuthUI() {
    const containers = document.querySelectorAll(".auth-nav-container");
    const currentPath = window.location.pathname + window.location.search;
    const returnUrlParam = encodeURIComponent(currentPath);

    containers.forEach(container => {
      if (currentUser) {
        container.innerHTML = `
          <div class="user-auth-pill" style="display:inline-flex; align-items:center; gap:8px; padding:4px 12px; background:#fff; border:1px solid var(--line); border-radius:999px; box-shadow:0 2px 6px rgba(71,46,53,0.04);">
            <div style="width:22px; height:22px; border-radius:50%; background:var(--rose2); display:flex; align-items:center; justify-content:center; color:var(--ink);">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span class="user-name" style="font-weight:600; font-size:13px; color:var(--ink);">${escapeHtml(currentUser.displayName)}</span>
            <button class="btn-logout" type="button" title="Sign out of your account" style="background:none; border:none; color:var(--muted); font-size:12px; cursor:pointer; padding:2px 6px; display:inline-flex; align-items:center; gap:4px; border-radius:6px; transition:color 0.15s ease;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        `;
        const logoutBtn = container.querySelector(".btn-logout");
        if (logoutBtn) logoutBtn.onclick = logout;
      } else {
        container.innerHTML = `
          <div style="display:inline-flex; align-items:center; gap:8px;">
            <a href="/login.html?returnUrl=${returnUrlParam}" class="nav-link-btn" style="text-decoration:none;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              <span>Sign In</span>
            </a>
            <a href="/register.html?returnUrl=${returnUrlParam}" class="nav-cta-btn" style="text-decoration:none;">
              <span>Register</span>
            </a>
          </div>
        `;
      }
    });
  }

  // Auto-init on page load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    init,
    initNav: renderAuthUI,
    getUser,
    fetchCurrentUser,
    login,
    register,
    logout,
    renderAuthUI
  };
})();

window.AuthManager = AuthManager;
