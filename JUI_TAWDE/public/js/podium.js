/**
 * PodiumRenderer - Renders the top-3 winners' podium and full leaderboard
 * Uses professional SVG icons and interactive podium/leaderboard controls.
 */
const PodiumRenderer = (() => {

  function renderPodiumAndLeaderboard({
    containerEl,
    winner,
    finalRanks = [],
    podium = [],
    sessionId = null,
    isHost = false,
    currentUser = null
  }) {
    if (!containerEl) return;
    containerEl.innerHTML = "";

    // Cache final results so refreshing results page retains them
    try {
      sessionStorage.setItem(
        "lastQuizResults",
        JSON.stringify({ winner, finalRanks, podium, sessionId, isHost })
      );
    } catch (e) {
      console.warn("Could not cache quiz results in sessionStorage:", e);
    }

    const wrapper = document.createElement("div");
    wrapper.className = "podium-flow-container";

    // 1. Stage 1: Dedicated Top-Three Winners' Podium Screen
    const podiumSection = document.createElement("div");
    podiumSection.id = "podiumStageSection";
    podiumSection.className = "podium-stage";
    podiumSection.innerHTML = buildPodiumHTML(podium.length > 0 ? podium : finalRanks.slice(0, 3));
    wrapper.appendChild(podiumSection);

    // Toggle Action: View Full Leaderboard
    const toggleContainer = document.createElement("div");
    toggleContainer.style.cssText = "margin-top:20px; text-align:center;";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "secondary";
    toggleBtn.id = "toggleLeaderboardBtn";
    toggleBtn.type = "button";
    toggleBtn.style.cssText = "display:inline-flex; align-items:center; gap:8px; font-size:14px; padding:10px 18px;";
    toggleBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 9l6 6 6-6"></path>
      </svg>
      <span>View Full Leaderboard (${finalRanks.length} Players)</span>
    `;

    toggleContainer.appendChild(toggleBtn);
    wrapper.appendChild(toggleContainer);

    // 2. Stage 2: Complete Leaderboard Stage (can be expanded/revealed)
    const leaderboardSection = document.createElement("div");
    leaderboardSection.id = "fullLeaderboardSection";
    leaderboardSection.className = "full-leaderboard-stage";
    leaderboardSection.style.cssText = "display:none; margin-top:24px; animation:fadeIn 0.3s ease-in-out;";

    leaderboardSection.innerHTML = `
      <div class="section-title" style="margin-bottom:12px; display:flex; justify-content:space-between; align-items:center;">
        <h3 style="margin:0; font-size:18px; display:inline-flex; align-items:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span>Complete Final Rankings</span>
        </h3>
        <span class="count">${finalRanks.length} Participant${finalRanks.length === 1 ? "" : "s"}</span>
      </div>
      <div class="leaderboard-table-container">
        <table class="results-table">
          <thead>
            <tr>
              <th style="width:60px;">Rank</th>
              <th>Participant</th>
              <th style="text-align:right;">Score</th>
              <th style="text-align:right;">Accuracy</th>
              <th style="text-align:right;">Avg Time</th>
            </tr>
          </thead>
          <tbody>
            ${finalRanks.map(p => {
              const rank = p.rank || 0;
              const isMe = (currentUser && (p.name === currentUser.displayName)) || p.isMe;
              const isFirst = rank === 1;
              const correct = p.correctCount !== undefined ? p.correctCount : (p.correct_count !== undefined ? p.correct_count : null);
              const accuracy = p.accuracyPercentage !== undefined ? `${p.accuracyPercentage}%` : (correct !== null ? `${correct} correct` : "—");
              const avgTime = p.avgResponseTimeSeconds ? `${p.avgResponseTimeSeconds}s` : (p.avgResponseTimeMs ? `${(p.avgResponseTimeMs / 1000).toFixed(1)}s` : "—");

              return `
                <tr class="${isMe ? 'row-me' : ''} ${isFirst ? 'row-winner' : ''}">
                  <td>
                    <span class="rank-badge rank-${rank}" style="display:inline-flex; align-items:center; justify-content:center; gap:3px;">
                      #${rank}
                    </span>
                  </td>
                  <td><b>${escapeHtml(p.name)}</b> ${isMe ? '<span class="you-tag">(You)</span>' : ''}</td>
                  <td style="text-align:right; font-weight:700;">${p.score}</td>
                  <td style="text-align:right; color:var(--muted);">${accuracy}</td>
                  <td style="text-align:right; color:var(--muted);">${avgTime}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
      <div style="text-align:center; margin-top:14px;">
        <button id="backToPodiumBtn" class="secondary" type="button" style="font-size:13px; padding:6px 14px; display:inline-flex; align-items:center; gap:6px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 15l-6-6-6 6"></path>
          </svg>
          <span>Back to Podium</span>
        </button>
      </div>
    `;

    wrapper.appendChild(leaderboardSection);

    // Toggle event listener
    toggleBtn.onclick = () => {
      const isVisible = leaderboardSection.style.display !== "none";
      if (isVisible) {
        leaderboardSection.style.display = "none";
        toggleBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
          <span>View Full Leaderboard (${finalRanks.length} Players)</span>
        `;
      } else {
        leaderboardSection.style.display = "block";
        toggleBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 15l-6-6-6 6"></path>
          </svg>
          <span>Hide Leaderboard</span>
        `;
        leaderboardSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    };

    const backBtn = leaderboardSection.querySelector("#backToPodiumBtn");
    if (backBtn) {
      backBtn.onclick = () => {
        leaderboardSection.style.display = "none";
        toggleBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M6 9l6 6 6-6"></path>
          </svg>
          <span>View Full Leaderboard (${finalRanks.length} Players)</span>
        `;
        podiumSection.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    }

    // 3. Stage 3: Detailed Report Access Action (Host only — removed from player side)
    if (sessionId && isHost) {
      const actionsSection = document.createElement("div");
      actionsSection.className = "results-actions-stage";
      actionsSection.style.cssText = "margin-top:24px; display:flex; gap:12px; justify-content:center; flex-wrap:wrap;";

      const reportBtn = document.createElement("button");
      reportBtn.className = "primary";
      reportBtn.type = "button";
      reportBtn.style.cssText = "display:inline-flex; align-items:center; gap:8px;";
      reportBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>View Full Quiz Analytics Report</span>
      `;
      reportBtn.onclick = () => {
        window.location.href = `/report.html?sessionId=${encodeURIComponent(sessionId)}`;
      };
      actionsSection.appendChild(reportBtn);
      wrapper.appendChild(actionsSection);
    }

    containerEl.appendChild(wrapper);
  }

  function buildPodiumHTML(topThree) {
    if (!topThree || topThree.length === 0) {
      return `
        <div style="text-align:center; padding:32px 16px;">
          <p class="muted" style="margin:0;">No player results recorded for this session.</p>
        </div>
      `;
    }

    const first = topThree[0] || null;
    const second = topThree[1] || null;
    const third = topThree[2] || null;

    let html = `<div class="podium-grid">`;

    // 2nd Place Pedestal (Silver - Left)
    if (second) {
      html += `
        <div class="podium-col podium-silver">
          <div class="podium-user-info">
            <span class="podium-medal" title="2nd Place">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#8a8296;">
                <circle cx="12" cy="8" r="6"></circle>
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
              </svg>
            </span>
            <span class="podium-name">${escapeHtml(second.name)}</span>
            <span class="podium-pts">${second.score} pts</span>
          </div>
          <div class="podium-pillar pillar-2">
            <span class="pillar-rank">2</span>
          </div>
        </div>
      `;
    } else {
      html += `<div class="podium-col podium-empty"></div>`;
    }

    // 1st Place Pedestal (Gold - Center, tallest)
    if (first) {
      html += `
        <div class="podium-col podium-gold">
          <div class="podium-crown" title="1st Place Winner">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#d97706;">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </div>
          <div class="podium-user-info">
            <span class="podium-medal" style="font-weight:700; color:#d97706; font-size:13px;">1st Place</span>
            <span class="podium-name winner-name">${escapeHtml(first.name)}</span>
            <span class="podium-pts winner-pts">${first.score} pts</span>
          </div>
          <div class="podium-pillar pillar-1">
            <span class="pillar-rank">1</span>
          </div>
        </div>
      `;
    }

    // 3rd Place Pedestal (Bronze - Right)
    if (third) {
      html += `
        <div class="podium-col podium-bronze">
          <div class="podium-user-info">
            <span class="podium-medal" title="3rd Place">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:#b45309;">
                <circle cx="12" cy="8" r="6"></circle>
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
              </svg>
            </span>
            <span class="podium-name">${escapeHtml(third.name)}</span>
            <span class="podium-pts">${third.score} pts</span>
          </div>
          <div class="podium-pillar pillar-3">
            <span class="pillar-rank">3</span>
          </div>
        </div>
      `;
    } else {
      html += `<div class="podium-col podium-empty"></div>`;
    }

    html += `</div>`;
    return html;
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  return {
    renderPodiumAndLeaderboard,
    buildPodiumHTML
  };
})();

window.PodiumRenderer = PodiumRenderer;
