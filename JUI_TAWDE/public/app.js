const QuizApp = (() => {
  const socket = io();
  const $ = id => document.getElementById(id);
  let pin = "", playerName = "", timerInterval, answered = false;

  function show(id) {
    ["createView", "lobbyView", "gameView", "endView", "joinView", "waitView", "playView"].forEach(x => $(x)?.classList.add("hidden"));
    $(id)?.classList.remove("hidden");
  }
  function renderRanks(target, board, me = "") {
    target.innerHTML = board.map(p => `<div class="rank ${p.name === me ? "me" : ""}"><span>#${p.rank} &nbsp; ${escapeHtml(p.name)}</span><span class="score">${p.score}</span></div>`).join("");
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])); }
  function startCountdown(el, seconds, onDone) {
    clearInterval(timerInterval); const end = Date.now() + seconds * 1000;
    const tick = () => { const left = Math.max(0, end - Date.now()); el.textContent = Math.ceil(left / 1000); if (!left) { clearInterval(timerInterval); onDone?.(); } };
    tick(); timerInterval = setInterval(tick, 50);
  }

  function initHost() {
    $("createBtn").onclick = () => socket.emit("quiz:create", { hostName: $("hostName").value, category: $("category").value });
    socket.on("quiz:created", data => {
      pin = data.pin; $("pin").textContent = pin; $("roomMeta").textContent = `${data.category} • ${data.questionCount} questions`;
      show("lobbyView");
    });
    socket.on("lobby:update", data => {
      $("playerCount").textContent = data.players.length;
      $("players").innerHTML = data.players.length ? data.players.map(p => `<div class="player-item"><span>${escapeHtml(p.name)}</span><b>${p.score}</b></div>`).join("") : `<p class="muted">Waiting for players to join…</p>`;
    });
    $("startBtn").onclick = () => socket.emit("quiz:start", { pin }, res => { if (!res?.ok) $("createMsg").textContent = res.message; });
    socket.on("quiz:started", () => { show("gameView"); socket.emit("quiz:ready", { pin }); });
    socket.on("question:start", q => {
      $("qProgress").textContent = `QUESTION ${q.questionIndex} / ${q.totalQuestions}`;
      $("hostQuestion").textContent = q.question; $("reveal").classList.add("hidden");
      $("hostOptions").innerHTML = q.options.map((o, i) => `<div class="host-option" data-index="${i}">${escapeHtml(o)}</div>`).join("");
      startCountdown($("hostTimer"), q.timeLimitSeconds);
    });
    socket.on("question:time_up", data => {
      clearInterval(timerInterval); $("hostTimer").textContent = "✓";
      document.querySelectorAll(".host-option").forEach((el, i) => { if (i === data.correctOption) el.classList.add("correct"); });
      $("explanation").textContent = data.explanation; $("reveal").classList.remove("hidden");
    });
    socket.on("leaderboard:update", data => renderRanks($("hostLeaderboard"), data.leaderboard));
    socket.on("quiz:ended", data => {
      sessionStorage.setItem("quizFinished", "true");

      $("winnerText").textContent = data.winner
        ? `${data.winner.name} wins with ${data.winner.score} points!`
        : "Quiz complete!";

      $("finalRanks").className = "rank-list";
      renderRanks($("finalRanks"), data.finalRanks);
      show("endView");
    });
    socket.on("quiz:closed", data => { $("createMsg").textContent = data.message; show("createView"); });
  }

  function initPlayer() {
    $("joinBtn").onclick = () => {
      const entered = $("pinInput").value.trim(), name = $("nameInput").value.trim();
      $("joinMsg").textContent = "";
      socket.emit("quiz:join", { pin: entered, playerName: name }, res => { if (!res?.ok) $("joinMsg").textContent = res.message; });
    };
    socket.on("quiz:joined", data => {
      pin = data.pin; playerName = data.name; $("welcomeName").textContent = `Welcome, ${playerName}!`; show("waitView");
    });
    socket.on("lobby:update", data => { $("waitPlayers").innerHTML = `<p class="muted">${data.players.length} player${data.players.length === 1 ? "" : "s"} in the room</p>`; });
    socket.on("quiz:started", () => show("playView"));
    socket.on("question:start", q => {
      answered = false; $("qNumber").textContent = `QUESTION ${q.questionIndex} / ${q.totalQuestions}`; $("question").textContent = q.question;
      $("answerMsg").textContent = ""; $("answerGrid").innerHTML = q.options.map((o, i) => `<button class="answer" data-index="${i}">${escapeHtml(o)}</button>`).join("");
      document.querySelectorAll(".answer").forEach(btn => btn.onclick = () => submitAnswer(Number(btn.dataset.index)));
      startCountdown($("timer"), q.timeLimitSeconds, () => { if (!answered) $("answerMsg").textContent = "Time's up — waiting for the reveal…"; });
    });
    function submitAnswer(index) {
      if (answered) return; answered = true;
      document.querySelectorAll(".answer").forEach(b => b.disabled = true);
      const timeTakenMs = 15000 - Math.max(0, Number($("timer").textContent) * 1000 - 500);
      socket.emit("answer:submit", { pin, selectedOption: index, timeTakenMs }, res => {
        if (!res?.ok) { $("answerMsg").textContent = res.message; return; }
        $("answerMsg").textContent = res.isCorrect ? `✓ Correct! +${res.score} points` : "✕ Not quite — keep going!";
      });
    }
    socket.on("answer:result", data => { $("myScore").textContent = Number($("myScore").textContent) + data.score; });
    socket.on("leaderboard:update", data => renderRanks($("playerLeaderboard"), data.leaderboard, playerName));
    socket.on("question:time_up", data => {
      document.querySelectorAll(".answer").forEach((b, i) => { if (i === data.correctOption) b.style.outline = "3px solid #75a88a"; });
      if (!answered) $("answerMsg").textContent = `Answer: ${document.querySelectorAll(".answer")[data.correctOption]?.textContent || ""}`;
    });
    socket.on("quiz:ended", data => {
      sessionStorage.setItem("quizFinished", "true");

      $("playerWinner").textContent = data.winner
        ? `${data.winner.name} wins!`
        : "Quiz complete!";

      $("playerFinalRanks").className = "rank-list";
      renderRanks($("playerFinalRanks"), data.finalRanks, playerName);
      show("endView");
    });
    socket.on("quiz:closed", data => { $("joinMsg").textContent = data.message; show("joinView"); });
  }
  return { initHost, initPlayer };
})();