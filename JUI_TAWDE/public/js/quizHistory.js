/**
 * QuizHistory - Controller for user's persistent hosted and played quiz activity
 * Connects to MongoDB endpoints with loading, error, and retry states.
 * Formatted with clean single-card layouts (zero nested double-boxes) and warm theme styling.
 */
const QuizHistory = (() => {

  let hostedCache = [];
  let playedCache = [];
  let currentSubTab = "hosted"; // 'hosted' | 'played'
  let fetchError = null;

  async function loadHistory(containerEl) {
    if (!containerEl) return;
    const user = AuthManager.getUser();

    if (!user) {
      containerEl.innerHTML = `
        <div style="text-align:center; padding:48px 24px; max-width:520px; margin:0 auto;">
          <div style="width:56px; height:56px; border-radius:16px; background:var(--rose2); display:flex; align-items:center; justify-content:center; margin:0 auto 18px; color:var(--ink);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 8v4l3 3"></path>
              <circle cx="12" cy="12" r="9"></circle>
            </svg>
          </div>
          <p class="eyebrow" style="margin:0 0 8px 0;">ACCOUNT HISTORY</p>
          <h2 style="margin:0 0 12px; font-size:26px; color:var(--ink);">Sign in to view your Quiz History</h2>
          <p class="muted" style="margin:0 auto 28px; font-size:14px; line-height:1.6;">
            Log in to automatically record, access, and analyze all quizzes you host and participate in.
          </p>
          <a class="primary" href="/login.html?returnUrl=/host.html" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; padding:12px 26px; border-radius:12px; font-weight:600; font-size:14px;">
            <span>Sign In to Access History</span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      `;
      return;
    }

    containerEl.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; margin-bottom:24px;">
        <div>
          <p class="eyebrow" style="margin:0 0 6px 0;">ACCOUNT DASHBOARD</p>
          <h1 style="margin:0; font-size:28px; color:var(--ink);">Quiz History &amp; Reports</h1>
        </div>
        <div style="display:flex; gap:10px;">
          <button id="histSubTabHosted" class="tab-pill ${currentSubTab === 'hosted' ? 'active' : ''}" type="button">Hosted Quizzes</button>
          <button id="histSubTabPlayed" class="tab-pill ${currentSubTab === 'played' ? 'active' : ''}" type="button">Played Battles</button>
        </div>
      </div>

      <!-- Controls Row: Search & Sort -->
      <div style="display:flex; gap:14px; margin-bottom:20px; flex-wrap:wrap;">
        <div style="flex:1; min-width:220px; position:relative;">
          <input type="text" id="histSearchInput" placeholder="Filter by quiz title..." style="width:100%; box-sizing:border-box; margin:0; padding:12px 16px; border-radius:12px; font-size:14px;">
        </div>
        <div style="width:200px;">
          <select id="histSortSelect" style="width:100%; box-sizing:border-box; margin:0; padding:12px 16px; border-radius:12px; font-size:14px;">
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="players-desc">Most Players</option>
            <option value="score-desc">Highest Score</option>
          </select>
        </div>
      </div>

      <div id="histListContainer" style="display:flex; flex-direction:column; gap:12px;">
        <div style="text-align:center; padding:48px 16px;">
          <div class="pulse-dot" style="margin:0 auto 14px;"></div>
          <p class="muted" style="margin:0; font-size:14px;">Loading quiz records from database...</p>
        </div>
      </div>
    `;

    document.getElementById("histSubTabHosted").onclick = () => {
      currentSubTab = "hosted";
      document.getElementById("histSubTabHosted").classList.add("active");
      document.getElementById("histSubTabPlayed").classList.remove("active");
      renderList();
    };

    document.getElementById("histSubTabPlayed").onclick = () => {
      currentSubTab = "played";
      document.getElementById("histSubTabPlayed").classList.add("active");
      document.getElementById("histSubTabHosted").classList.remove("active");
      renderList();
    };

    const searchInput = document.getElementById("histSearchInput");
    const sortSelect = document.getElementById("histSortSelect");
    if (searchInput) searchInput.oninput = () => renderList();
    if (sortSelect) sortSelect.onchange = () => renderList();

    await fetchHistoryData();
    renderList();
  }

  async function fetchHistoryData() {
    fetchError = null;
    try {
      const [hRes, pRes] = await Promise.all([
        fetch("/api/history/hosted", { credentials: "include" }),
        fetch("/api/history/played", { credentials: "include" })
      ]);

      if (!hRes.ok) {
        throw new Error(`Failed to load hosted history (HTTP ${hRes.status})`);
      }
      if (!pRes.ok) {
        throw new Error(`Failed to load played history (HTTP ${pRes.status})`);
      }

      const hData = await hRes.json();
      const pData = await pRes.json();
      hostedCache = hData.ok ? (hData.history || []) : [];
      playedCache = pData.ok ? (pData.history || []) : [];
    } catch (err) {
      console.error("Failed to fetch quiz history:", err);
      fetchError = err.message || "Failed to communicate with database server.";
      hostedCache = [];
      playedCache = [];
    }
  }

  function renderList() {
    const listContainer = document.getElementById("histListContainer");
    if (!listContainer) return;

    if (fetchError) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:36px 20px; background:#fff; border:1px solid rgba(239, 68, 68, 0.3); border-radius:16px;">
          <p class="msg" style="color:var(--danger); margin:0 0 14px 0; font-size:14px;">
            ${escapeHtml(fetchError)}
          </p>
          <button class="secondary" type="button" onclick="QuizHistory.refresh()" style="display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Retry Loading History</span>
          </button>
        </div>
      `;
      return;
    }

    const query = (document.getElementById("histSearchInput")?.value || "").toLowerCase().trim();
    const sort = document.getElementById("histSortSelect")?.value || "date-desc";

    let items = currentSubTab === "hosted" ? [...hostedCache] : [...playedCache];

    // Filter
    if (query) {
      items = items.filter(x => (x.quizTitle || "").toLowerCase().includes(query));
    }

    // Sort
    items.sort((a, b) => {
      if (sort === "date-desc") return new Date(b.startTime) - new Date(a.startTime);
      if (sort === "date-asc") return new Date(a.startTime) - new Date(b.startTime);
      if (sort === "players-desc") return (b.participantsCount || 0) - (a.participantsCount || 0);
      if (sort === "score-desc") return (b.score || b.winnerScore || 0) - (a.score || a.winnerScore || 0);
      return 0;
    });

    if (items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:48px 24px; background:rgba(255, 249, 243, 0.6); border:1px dashed var(--line); border-radius:18px;">
          <p class="muted" style="margin:0; font-size:14px; line-height:1.6;">
            ${currentSubTab === "hosted"
              ? "No hosted quizzes recorded yet. Create and host a multiplayer quiz to see detailed session analytics here!"
              : "No played battles recorded yet. Join a quiz room using a PIN to track your scores, accuracy, and rankings!"}
          </p>
        </div>
      `;
      return;
    }

    if (currentSubTab === "hosted") {
      listContainer.innerHTML = items.map(s => {
        const d = new Date(s.startTime);
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
          <div class="saved-quiz-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:20px 24px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 2px 8px rgba(71,46,53,0.03);">
            <div style="flex:1; min-width:240px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="eyebrow" style="font-size:10.5px; margin:0;">${escapeHtml(s.category.toUpperCase())} • PIN ${escapeHtml(s.pin)}</span>
                <span class="status-pill status-${s.status}" style="font-size:10px;">${escapeHtml(s.status.toUpperCase())}</span>
              </div>
              <h3 style="margin:2px 0 6px; font-size:18px; color:var(--ink);">${escapeHtml(s.quizTitle)}</h3>
              <div class="saved-quiz-meta" style="font-size:13px; color:var(--muted); line-height:1.5;">
                <span>${s.participantsCount} Player${s.participantsCount === 1 ? '' : 's'}</span> •
                <span>Winner: <b style="color:var(--ink);">${escapeHtml(s.winnerName || "None")}</b> (${s.winnerScore || 0} pts)</span> •
                <span>${dateStr} at ${timeStr}</span> •
                <span>${s.durationSeconds}s</span>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="primary btn-small" type="button" onclick="window.location.href='/report.html?sessionId=${encodeURIComponent(s.sessionId)}'" style="display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; font-weight:600; font-size:13px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>View Full Report</span>
              </button>
            </div>
          </div>
        `;
      }).join("");
    } else {
      listContainer.innerHTML = items.map(p => {
        const d = new Date(p.startTime);
        const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        return `
          <div class="saved-quiz-card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px; padding:20px 24px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 2px 8px rgba(71,46,53,0.03);">
            <div style="flex:1; min-width:240px;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                <span class="eyebrow" style="font-size:10.5px; margin:0;">HOSTED BY ${escapeHtml(p.hostName.toUpperCase())}</span>
                <span class="rank-badge rank-${p.rank || 1}" style="font-size:11px; padding:3px 10px;">Rank #${p.rank || "—"}</span>
              </div>
              <h3 style="margin:2px 0 6px; font-size:18px; color:var(--ink);">${escapeHtml(p.quizTitle)}</h3>
              <div class="saved-quiz-meta" style="font-size:13px; color:var(--muted); line-height:1.5;">
                <span>Score: <b style="color:var(--ink);">${p.score} pts</b></span> •
                <span>Accuracy: <b style="color:var(--ink);">${p.accuracyPercentage}%</b> (${p.correctCount} correct)</span> •
                <span>Avg Time: ${p.avgResponseTimeSeconds}s</span> •
                <span>${dateStr}</span>
              </div>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="primary btn-small" type="button" onclick="window.location.href='/report.html?sessionId=${encodeURIComponent(p.sessionId)}'" style="display:inline-flex; align-items:center; gap:6px; padding:9px 16px; border-radius:10px; font-weight:600; font-size:13px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                <span>View Results</span>
              </button>
            </div>
          </div>
        `;
      }).join("");
    }
  }

  function refresh() {
    const el = document.getElementById("historyView");
    if (el) loadHistory(el);
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  return {
    loadHistory,
    refresh
  };
})();

window.QuizHistory = QuizHistory;
