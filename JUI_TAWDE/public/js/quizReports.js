/**
 * QuizReports - Detailed session analytics report viewer
 * Supports full-page report rendering and question diagnostic analytics.
 * Uses clean SVG icons, polished cream/rose aesthetics, and comprehensive timing metrics.
 */
const QuizReports = (() => {

  /**
   * For backwards-compatibility and simple triggers:
   * Navigates directly to the dedicated full-page report.
   */
  function openReportModal(sessionId) {
    if (!sessionId) return;
    window.location.href = `/report.html?sessionId=${encodeURIComponent(sessionId)}`;
  }

  /**
   * Loads report data and renders it into a designated page container.
   */
  async function loadReportPage(sessionId, containerTarget) {
    const container = typeof containerTarget === "string"
      ? document.getElementById(containerTarget)
      : containerTarget;

    if (!container) return;

    if (!sessionId) {
      container.innerHTML = `
        <div style="text-align:center; padding:56px 20px; background:#fff; border:1px solid var(--line); border-radius:18px;">
          <div style="width:48px; height:48px; border-radius:14px; background:var(--rose2); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:var(--ink);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style="margin:0 0 8px; font-size:20px; color:var(--ink);">No Session Selected</h2>
          <p class="muted" style="margin:0 0 20px; font-size:14px;">Please select a quiz session from your host dashboard or history.</p>
          <a href="/host.html" class="primary" style="display:inline-flex; align-items:center; gap:8px; text-decoration:none; padding:10px 20px; border-radius:10px; font-weight:600; font-size:14px;">
            ← Go to Host Dashboard
          </a>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="text-align:center; padding:64px 20px; background:#fff; border:1px solid var(--line); border-radius:18px; box-shadow:0 2px 10px rgba(71,46,53,0.03);">
        <div class="pulse-dot" style="margin:0 auto 16px;"></div>
        <p class="muted" style="margin:0; font-size:14.5px; font-weight:500;">Loading full session analytics report...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/reports/${encodeURIComponent(sessionId)}`, { credentials: "include" });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        container.innerHTML = `
          <div style="text-align:center; padding:48px 20px; background:#fff; border:1px solid rgba(239, 68, 68, 0.25); border-radius:18px;">
            <div style="width:48px; height:48px; border-radius:14px; background:rgba(239, 68, 68, 0.1); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; color:var(--danger);">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h2 style="margin:0 0 8px; font-size:19px; color:var(--ink);">Unable to Load Report</h2>
            <p class="msg" style="color:var(--danger); margin:0 0 20px 0; font-size:14px;">
              ${escapeHtml(data.error || "Failed to load report.")}
            </p>
            <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
              <button class="primary" type="button" onclick="QuizReports.loadReportPage('${escapeHtml(sessionId)}', '${typeof containerTarget === 'string' ? containerTarget : 'reportPageContainer'}')" style="display:inline-flex; align-items:center; gap:6px;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                <span>Retry Loading</span>
              </button>
              <a href="/host.html" class="secondary" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none;">
                <span>Back to Host</span>
              </a>
            </div>
          </div>
        `;
        return;
      }

      renderReport(container, data);
    } catch (err) {
      container.innerHTML = `
        <div style="text-align:center; padding:48px 20px; background:#fff; border:1px solid rgba(239, 68, 68, 0.25); border-radius:18px;">
          <h2 style="margin:0 0 8px; font-size:19px; color:var(--ink);">Network Connection Error</h2>
          <p class="msg" style="color:var(--danger); margin:0 0 20px 0; font-size:14px;">
            ${escapeHtml(err.message || "Failed to communicate with report server.")}
          </p>
          <button class="primary" type="button" onclick="QuizReports.loadReportPage('${escapeHtml(sessionId)}', '${typeof containerTarget === 'string' ? containerTarget : 'reportPageContainer'}')" style="display:inline-flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>Retry Loading</span>
          </button>
        </div>
      `;
    }
  }

  function renderReport(container, reportData) {
    const s = reportData.summary;
    const participants = reportData.participants || [];
    const questions = reportData.questionAnalytics || [];
    const isHost = reportData.userRole === "host";

    const startDate = s.startTime ? new Date(s.startTime).toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : "—";

    container.innerHTML = `
      <!-- Header Meta Banner -->
      <div class="report-header-banner" style="background:#fff; border:1px solid var(--line); border-radius:18px; padding:24px 28px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:16px; box-shadow:0 2px 10px rgba(71, 46, 53, 0.04);">
        <div>
          <span class="eyebrow" style="margin-bottom:6px; display:inline-block;">${escapeHtml((s.category || "General").toUpperCase())} • PIN ${escapeHtml(s.pin || "")}</span>
          <h1 style="margin:0 0 8px 0; font-size:26px; color:var(--ink);">${escapeHtml(s.quizTitle || "Quiz Report")}</h1>
          <p class="muted" style="margin:0; font-size:14px; line-height:1.5;">
            Conducted by <b>${escapeHtml(s.hostName || "Host")}</b> on ${startDate} • Duration: <b>${s.durationSeconds || 0}s</b>
          </p>
        </div>
        <div class="report-badge-status" style="display:flex; align-items:center; gap:10px;">
          <span class="status-pill status-${s.status || 'completed'}">${escapeHtml((s.status || "completed").toUpperCase())}</span>
        </div>
      </div>

      <!-- Key Metrics Row -->
      <div class="report-metrics-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:14px; margin-bottom:26px;">
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Participants</span>
          <span class="metric-val" style="font-size:24px; font-weight:800; color:var(--ink);">${s.totalParticipants}</span>
        </div>
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Highest Score</span>
          <span class="metric-val" style="font-size:24px; font-weight:800; color:var(--ink);">${s.highestScore}</span>
        </div>
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Winner</span>
          <span class="metric-val" style="font-size:18px; font-weight:800; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(s.winnerName || "None")}</span>
        </div>
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Avg. Score</span>
          <span class="metric-val" style="font-size:24px; font-weight:800; color:var(--ink);">${s.averageScore}</span>
        </div>
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Avg. Response</span>
          <span class="metric-val" style="font-size:24px; font-weight:800; color:var(--ink);">${s.averageResponseTimeSeconds}s</span>
        </div>
        <div class="metric-card" style="background:#fff; border:1px solid var(--line); border-radius:14px; padding:16px 18px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
          <span class="metric-label" style="font-size:10.5px; color:var(--muted); font-weight:700; letter-spacing:0.8px; text-transform:uppercase; margin-bottom:6px; display:block;">Overall Accuracy</span>
          <span class="metric-val" style="font-size:24px; font-weight:800; color:var(--ink);">${s.overallAccuracyPercentage}%</span>
        </div>
      </div>

      <!-- Navigation Tabs inside Report -->
      <div class="report-tabs-bar" style="display:flex; gap:12px; margin-bottom:22px; border-bottom:1px solid var(--line); padding-bottom:14px;">
        <button id="repTabPlayers" class="tab-pill active" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>Participant Analysis (${participants.length})</span>
        </button>
        <button id="repTabQuestions" class="tab-pill" type="button">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
          </svg>
          <span>Question Diagnostics (${questions.length})</span>
        </button>
      </div>

      <!-- Tab 1: Participants List & Breakdown -->
      <div id="reportSectionPlayers" class="report-sub-section">
        <div class="report-table-card" style="background:#fff; border:1px solid var(--line); border-radius:16px; overflow:hidden; box-shadow:0 2px 10px rgba(71, 46, 53, 0.04);">
          <div style="padding:18px 24px; border-bottom:1px solid var(--line); background:rgba(255, 249, 243, 0.5);">
            <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--ink);">Participants Performance Analysis</h3>
          </div>
          <div style="overflow-x:auto;">
            <table class="results-table" style="width:100%; border-collapse:collapse;">
              <thead>
                <tr>
                  <th style="width:50px; padding:12px 16px;">Rank</th>
                  <th style="padding:12px 16px;">Name</th>
                  <th style="text-align:right; padding:12px 16px;">Score</th>
                  <th style="text-align:right; padding:12px 16px;">Correct</th>
                  <th style="text-align:right; padding:12px 16px;">Accuracy</th>
                  <th style="text-align:right; padding:12px 16px;">Avg Time</th>
                  ${isHost ? '<th style="text-align:center; padding:12px 16px;">Action</th>' : ''}
                </tr>
              </thead>
              <tbody>
                ${participants.length === 0 ? `
                  <tr>
                    <td colspan="${isHost ? 7 : 6}" style="text-align:center; padding:32px; color:var(--muted);">
                      No participant records found for this quiz session.
                    </td>
                  </tr>
                ` : participants.map((p, idx) => `
                  <tr>
                    <td style="padding:14px 16px;"><b>#${p.rank || idx + 1}</b></td>
                    <td style="padding:14px 16px;">
                      <b>${escapeHtml(p.name)}</b>
                      ${p.isWinner ? `
                        <span class="winner-tag" style="display:inline-flex; align-items:center; gap:4px; margin-left:6px; color:#b45309; font-size:11px; font-weight:700;">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                            <path d="M4 22h16"></path>
                            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
                          </svg>
                          <span>Winner</span>
                        </span>
                      ` : ''}
                    </td>
                    <td style="text-align:right; font-weight:700; padding:14px 16px;">${p.score}</td>
                    <td style="text-align:right; padding:14px 16px;">${p.correctCount} / ${s.totalQuestions}</td>
                    <td style="text-align:right; padding:14px 16px;">${p.accuracyPercentage}%</td>
                    <td style="text-align:right; padding:14px 16px;">${p.averageResponseTimeSeconds}s</td>
                    ${isHost ? `
                      <td style="text-align:center; padding:14px 16px;">
                        <button class="btn-detail-action btn-toggle-player-q" data-pid="${p.id}" type="button">
                          Details
                        </button>
                      </td>
                    ` : ''}
                  </tr>
                  <!-- Expanded Question Results for this Player -->
                  <tr id="playerDetailsRow_${p.id}" class="player-details-row ${(!isHost && p.questions && p.questions.length > 0) ? '' : 'hidden'}">
                    <td colspan="${isHost ? 7 : 6}" style="background:rgba(255, 249, 243, 0.4); padding:18px 24px; border-top:1px dashed var(--line); border-bottom:1px solid var(--line);">
                      <h4 style="margin:0 0 14px; font-size:14px; color:var(--ink);">Question Responses for <b>${escapeHtml(p.name)}</b>:</h4>
                      ${p.questions && p.questions.length > 0 ? `
                        <div class="player-q-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px;">
                          ${p.questions.map(pq => `
                            <div class="player-q-card ${pq.isCorrect ? 'q-correct' : (pq.isUnanswered ? 'q-unanswered' : 'q-incorrect')}" style="background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; box-shadow:0 1px 4px rgba(71,46,53,0.03);">
                              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:12px;">
                                <span class="eyebrow" style="margin:0; font-size:11px;">QUESTION ${pq.questionIndex}</span>
                                <span style="display:inline-flex; align-items:center; gap:4px;">
                                  ${pq.isCorrect ? `
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#059669;">
                                      <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    <span style="color:#059669; font-weight:700;">+${pq.pointsEarned} pts</span>
                                  ` : (pq.isUnanswered ? `
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#d97706;">
                                      <circle cx="12" cy="12" r="10"></circle>
                                      <line x1="8" y1="12" x2="16" y2="12"></line>
                                    </svg>
                                    <span style="color:#d97706; font-weight:700;">Unanswered</span>
                                  ` : `
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#dc2626;">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                    <span style="color:#dc2626; font-weight:700;">Incorrect</span>
                                  `)}
                                </span>
                              </div>
                              <p style="margin:0 0 10px; font-size:13.5px; font-weight:600; color:var(--ink); line-height:1.45;">${escapeHtml(pq.questionText)}</p>
                              <div style="font-size:12.5px; margin-bottom:5px; line-height:1.4;">
                                <span class="muted">Submitted:</span> <b>${escapeHtml(pq.selectedText)}</b>
                              </div>
                              ${!pq.isCorrect ? `
                                <div style="font-size:12.5px; color:#059669; margin-bottom:5px; line-height:1.4;">
                                  <span>Correct:</span> <b>${escapeHtml(pq.correctText)}</b>
                                </div>
                              ` : ''}

                              <!-- Prominent Time Taken Chip for this Player in this Question Box -->
                              <div class="q-time-chip" style="display:inline-flex; align-items:center; gap:6px; margin-top:8px; padding:4px 10px; border-radius:8px; background:rgba(217, 143, 159, 0.12); color:var(--ink); font-size:12px; font-weight:600; border:1px solid rgba(217, 143, 159, 0.22);">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--ink);">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>Time Taken: <b>${pq.responseTimeSeconds || (pq.responseTimeMs ? (pq.responseTimeMs / 1000).toFixed(2) : "0.00")}s</b></span>
                              </div>

                              ${pq.explanation ? `
                                <div style="margin-top:10px; font-size:12px; color:var(--muted); background:rgba(244, 217, 222, 0.35); padding:8px 10px; border-radius:8px; line-height:1.4;">
                                  <b>Explanation:</b> ${escapeHtml(pq.explanation)}
                                </div>
                              ` : ''}
                            </div>
                          `).join("")}
                        </div>
                      ` : '<p class="muted" style="margin:0; font-size:13px;">No individual question records available.</p>'}
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tab 2: Question Diagnostics -->
      <div id="reportSectionQuestions" class="report-sub-section hidden">
        <div class="report-questions-wrapper">
          <div style="margin-bottom:18px;">
            <h3 style="margin:0 0 4px; font-size:17px; font-weight:700; color:var(--ink);">Question Diagnostics Breakdown</h3>
            <p class="muted" style="margin:0; font-size:13.5px;">Accuracy rates, individual player response times, and frequent answer patterns for each quiz question.</p>
          </div>
          <div class="questions-analytics-list" style="display:flex; flex-direction:column; gap:14px;">
            ${questions.map(qa => `
              <div class="qa-item-card" style="background:#fff; border:1px solid var(--line); border-radius:16px; padding:20px 24px; box-shadow:0 2px 8px rgba(71, 46, 53, 0.04);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span class="eyebrow" style="margin:0;">QUESTION ${qa.questionIndex}</span>
                  <span class="qa-acc-pill ${qa.accuracyPercentage >= 70 ? 'acc-high' : (qa.accuracyPercentage >= 40 ? 'acc-mid' : 'acc-low')}">
                    ${qa.accuracyPercentage}% Accuracy
                  </span>
                </div>
                <h4 style="margin:0 0 12px; font-size:16px; color:var(--ink); line-height:1.4;">${escapeHtml(qa.questionText)}</h4>

                <!-- Accuracy Progress Bar -->
                <div class="progress-bar-track" style="margin-bottom:14px;">
                  <div class="progress-bar-fill" style="width:${qa.accuracyPercentage}%;"></div>
                </div>

                <div class="qa-stats-row" style="display:flex; gap:18px; flex-wrap:wrap; font-size:12.5px; color:var(--muted); padding:10px 0; border-top:1px dashed var(--line); border-bottom:1px dashed var(--line);">
                  <div style="display:inline-flex; align-items:center; gap:5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#059669;">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Correct: <b style="color:var(--ink);">${qa.correctCount}</b></span>
                  </div>
                  <div style="display:inline-flex; align-items:center; gap:5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:#dc2626;">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                    <span>Incorrect: <b style="color:var(--ink);">${qa.incorrectCount}</b></span>
                  </div>
                  <div style="display:inline-flex; align-items:center; gap:5px;">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#d97706;">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                    <span>Unanswered: <b style="color:var(--ink);">${qa.unansweredCount}</b></span>
                  </div>
                  <div><span>Avg Response: <b style="color:var(--ink);">${qa.averageResponseTimeSeconds}s</b></span></div>
                </div>

                <div style="margin-top:12px; font-size:13.5px; line-height:1.4;">
                  <span class="muted">Correct Answer:</span> <b style="color:#059669;">${String.fromCharCode(65 + qa.correctOption)}. ${escapeHtml(qa.correctText)}</b>
                </div>

                ${qa.mostFrequentIncorrectOption ? `
                  <div style="margin-top:6px; font-size:12.5px; color:#dc2626; line-height:1.4;">
                    <span>Most Common Mistake:</span> <b>${String.fromCharCode(65 + qa.mostFrequentIncorrectOption.optionIndex)}. ${escapeHtml(qa.mostFrequentIncorrectOption.text)}</b> (${qa.mostFrequentIncorrectOption.count} player${qa.mostFrequentIncorrectOption.count === 1 ? '' : 's'})
                  </div>
                ` : ''}

                <!-- Dedicated Player Response Times Box for this Question -->
                ${qa.playerTimes && qa.playerTimes.length > 0 ? `
                  <div class="qa-player-times-section" style="margin-top:14px; padding-top:12px; border-top:1px dashed var(--line);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                      <span style="font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--muted);">Player Response Times (${qa.playerTimes.length})</span>
                    </div>
                    <div class="qa-player-times-grid" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(210px, 1fr)); gap:8px;">
                      ${qa.playerTimes.map(pt => `
                        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255, 249, 243, 0.7); border:1px solid var(--line); border-radius:8px; padding:7px 10px; font-size:12px;">
                          <span style="font-weight:600; color:var(--ink); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:115px;" title="${escapeHtml(pt.playerName)}">${escapeHtml(pt.playerName)}</span>
                          <div style="display:inline-flex; align-items:center; gap:6px;">
                            ${pt.isCorrect ? `
                              <span style="color:#059669; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:2px;">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Correct
                              </span>
                            ` : (pt.isUnanswered ? `
                              <span style="color:#d97706; font-weight:700; font-size:11px;">Unanswered</span>
                            ` : `
                              <span style="color:#dc2626; font-weight:700; font-size:11px; display:inline-flex; align-items:center; gap:2px;">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                Incorrect
                              </span>
                            `)}
                            <span style="font-weight:700; color:var(--ink); font-variant-numeric:tabular-nums; display:inline-flex; align-items:center; gap:3px;">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted);">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              ${pt.responseTimeSeconds}s
                            </span>
                          </div>
                        </div>
                      `).join("")}
                    </div>
                  </div>
                ` : ''}

                ${qa.explanation ? `
                  <div class="qa-item-expl" style="margin-top:12px; font-size:12px; color:var(--muted); background:rgba(244, 217, 222, 0.35); border:1px solid rgba(234, 219, 213, 0.6); padding:9px 13px; border-radius:8px; line-height:1.4;">
                    <b>Explanation:</b> ${escapeHtml(qa.explanation)}
                  </div>
                ` : ''}
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    `;

    // Tab switching inside Report
    const tabPlayers = container.querySelector("#repTabPlayers");
    const tabQuestions = container.querySelector("#repTabQuestions");
    const secPlayers = container.querySelector("#reportSectionPlayers");
    const secQuestions = container.querySelector("#reportSectionQuestions");

    if (tabPlayers && tabQuestions && secPlayers && secQuestions) {
      tabPlayers.onclick = () => {
        tabPlayers.classList.add("active");
        tabQuestions.classList.remove("active");
        secPlayers.classList.remove("hidden");
        secQuestions.classList.add("hidden");
      };
      tabQuestions.onclick = () => {
        tabQuestions.classList.add("active");
        tabPlayers.classList.remove("active");
        secQuestions.classList.remove("hidden");
        secPlayers.classList.add("hidden");
      };
    }

    // Toggle player question details
    container.querySelectorAll(".btn-toggle-player-q").forEach(btn => {
      btn.onclick = () => {
        const pid = btn.dataset.pid;
        const row = document.getElementById(`playerDetailsRow_${pid}`);
        if (row) {
          row.classList.toggle("hidden");
          btn.textContent = row.classList.contains("hidden") ? "Details" : "Hide";
        }
      };
    });
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  return {
    openReportModal,
    loadReportPage,
    renderReport
  };
})();

window.QuizReports = QuizReports;
