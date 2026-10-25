const QuizApp = (() => {
  const socket = io();
  const $ = id => document.getElementById(id);
  let pin = "", playerName = "", timerInterval, answered = false;

  function show(id) {
    const views = [
      "createView", "builderView", "importView", "reviewView", "savedView", "historyView",
      "lobbyView", "gameView", "endView", "joinView", "waitView", "playView"
    ];
    views.forEach(x => $(x)?.classList.add("hidden"));
    $(id)?.classList.remove("hidden");

    // Manage host nav tabs visibility
    const tabs = $("hostNavTabs");
    if (tabs) {
      if (["lobbyView", "gameView", "endView"].includes(id)) {
        tabs.classList.add("hidden");
      } else {
        tabs.classList.remove("hidden");
        document.querySelectorAll("#hostNavTabs .tab-btn").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.tab === id);
        });
      }
    }
  }

  function renderRanks(target, board, me = "") {
    if (!target) return;
    target.innerHTML = board.map(p =>
      `<div class="rank ${p.name === me ? "me" : ""}"><span>#${p.rank} &nbsp; ${escapeHtml(p.name)}</span><span class="score">${p.score}</span></div>`
    ).join("");
  }

  function escapeHtml(s) {
    return String(s ?? "").replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[c]));
  }

  function startCountdown(el, seconds, onDone) {
    clearInterval(timerInterval);
    const end = Date.now() + seconds * 1000;
    const tick = () => {
      const left = Math.max(0, end - Date.now());
      if (el) el.textContent = Math.ceil(left / 1000);
      if (!left) {
        clearInterval(timerInterval);
        onDone?.();
      }
    };
    tick();
    timerInterval = setInterval(tick, 50);
  }

  // --- REUSABLE QUESTION EDITOR COMPONENT ---
  function createBlankQuestion(idx = 0) {
    return {
      number: idx + 1,
      question: "",
      options: ["", "", "", ""],
      correctOption: 0,
      explanation: "",
      timeLimitSeconds: 15,
      needsAttention: false,
      attentionReasons: []
    };
  }

  function renderQuestionEditor(container, questions, onUpdate) {
    if (!container) return;
    container.innerHTML = "";

    questions.forEach((q, qIdx) => {
      const card = document.createElement("div");
      card.className = `q-editor-card ${q.needsAttention ? "attention" : ""}`;

      const head = document.createElement("div");
      head.className = "q-card-head";

      const titleGroup = document.createElement("div");
      titleGroup.className = "q-title-group";
      titleGroup.innerHTML = `<b>Question ${qIdx + 1}</b>`;

      if (q.needsAttention && q.attentionReasons?.length) {
        const badge = document.createElement("span");
        badge.className = "badge-attention";
        badge.textContent = `Needs Attention: ${q.attentionReasons.join(", ")}`;
        titleGroup.appendChild(badge);
      }

      const actions = document.createElement("div");
      actions.className = "q-actions";

      const upBtn = document.createElement("button");
      upBtn.className = "btn-icon";
      upBtn.type = "button";
      upBtn.title = "Move Up";
      upBtn.textContent = "↑";
      upBtn.disabled = qIdx === 0;
      upBtn.onclick = () => {
        const temp = questions[qIdx];
        questions[qIdx] = questions[qIdx - 1];
        questions[qIdx - 1] = temp;
        renderQuestionEditor(container, questions, onUpdate);
        onUpdate?.();
      };

      const downBtn = document.createElement("button");
      downBtn.className = "btn-icon";
      downBtn.type = "button";
      downBtn.title = "Move Down";
      downBtn.textContent = "↓";
      downBtn.disabled = qIdx === questions.length - 1;
      downBtn.onclick = () => {
        const temp = questions[qIdx];
        questions[qIdx] = questions[qIdx + 1];
        questions[qIdx + 1] = temp;
        renderQuestionEditor(container, questions, onUpdate);
        onUpdate?.();
      };

      const delBtn = document.createElement("button");
      delBtn.className = "btn-icon btn-danger";
      delBtn.type = "button";
      delBtn.title = "Delete Question";
      delBtn.textContent = "✕";
      delBtn.onclick = () => {
        const hasContent = q.question.trim() || q.options.some(o => o.trim()) || q.explanation.trim();
        if (hasContent && !confirm(`Delete Question ${qIdx + 1}?`)) return;
        questions.splice(qIdx, 1);
        if (questions.length === 0) questions.push(createBlankQuestion(0));
        renderQuestionEditor(container, questions, onUpdate);
        onUpdate?.();
      };

      actions.appendChild(upBtn);
      actions.appendChild(downBtn);
      actions.appendChild(delBtn);

      head.appendChild(titleGroup);
      head.appendChild(actions);
      card.appendChild(head);

      // Question text & Time limit
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid; grid-template-columns: 3fr 1fr; gap:12px;";

      const qLabel = document.createElement("label");
      qLabel.textContent = "Question Text";
      const qInput = document.createElement("input");
      qInput.value = q.question || "";
      qInput.placeholder = "Enter question text...";
      qInput.oninput = e => {
        q.question = e.target.value;
        onUpdate?.();
      };
      qLabel.appendChild(qInput);

      const timeLabel = document.createElement("label");
      timeLabel.textContent = "Timer (sec)";
      const timeInput = document.createElement("select");
      [10, 15, 20, 30, 45, 60].forEach(sec => {
        const opt = document.createElement("option");
        opt.value = sec;
        opt.textContent = `${sec}s`;
        if (sec === (q.timeLimitSeconds || 15)) opt.selected = true;
        timeInput.appendChild(opt);
      });
      timeInput.onchange = e => {
        q.timeLimitSeconds = parseInt(e.target.value, 10);
        onUpdate?.();
      };
      timeLabel.appendChild(timeInput);

      grid.appendChild(qLabel);
      grid.appendChild(timeLabel);
      card.appendChild(grid);

      // Options
      const optGroup = document.createElement("div");
      optGroup.className = "options-group";
      const optTitle = document.createElement("p");
      optTitle.className = "eyebrow";
      optTitle.style.marginTop = "14px";
      optTitle.textContent = "OPTIONS (Select radio for the correct answer)";
      optGroup.appendChild(optTitle);

      const uniqueGroupName = `correct_q_${qIdx}_${Date.now()}`;

      q.options.forEach((optText, optIdx) => {
        const row = document.createElement("div");
        row.className = "opt-row";

        const radioWrap = document.createElement("label");
        radioWrap.className = "opt-radio-wrap";
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = uniqueGroupName;
        radio.value = optIdx;
        radio.checked = Number(q.correctOption) === optIdx;
        radio.onchange = () => {
          q.correctOption = optIdx;
          // Clear attention if this was the reason
          if (q.needsAttention) {
            q.attentionReasons = q.attentionReasons.filter(r => !r.toLowerCase().includes("correct"));
            q.needsAttention = q.attentionReasons.length > 0;
          }
          onUpdate?.();
        };

        const letter = String.fromCharCode(65 + optIdx);
        radioWrap.appendChild(radio);
        radioWrap.appendChild(document.createTextNode(` Option ${letter}`));

        const input = document.createElement("input");
        input.className = "opt-input";
        input.value = optText || "";
        input.placeholder = `Option ${letter} text...`;
        input.oninput = e => {
          q.options[optIdx] = e.target.value;
          onUpdate?.();
        };

        const removeOptBtn = document.createElement("button");
        removeOptBtn.className = "btn-icon btn-danger";
        removeOptBtn.type = "button";
        removeOptBtn.textContent = "−";
        removeOptBtn.title = "Remove Option";
        removeOptBtn.disabled = q.options.length <= 2;
        removeOptBtn.onclick = () => {
          q.options.splice(optIdx, 1);
          if (q.correctOption >= q.options.length) {
            q.correctOption = 0;
          }
          renderQuestionEditor(container, questions, onUpdate);
          onUpdate?.();
        };

        row.appendChild(radioWrap);
        row.appendChild(input);
        row.appendChild(removeOptBtn);
        optGroup.appendChild(row);
      });

      if (q.options.length < 6) {
        const addOptBtn = document.createElement("button");
        addOptBtn.className = "btn-secondary btn-small";
        addOptBtn.type = "button";
        addOptBtn.style.marginTop = "8px";
        addOptBtn.textContent = "+ Add Option";
        addOptBtn.onclick = () => {
          q.options.push("");
          renderQuestionEditor(container, questions, onUpdate);
          onUpdate?.();
        };
        optGroup.appendChild(addOptBtn);
      }
      card.appendChild(optGroup);

      // Explanation
      const explLabel = document.createElement("label");
      explLabel.textContent = "Explanation (shown to host & players after reveal)";
      const explInput = document.createElement("input");
      explInput.value = q.explanation || "";
      explInput.placeholder = "Explain why this answer is correct...";
      explInput.oninput = e => {
        q.explanation = e.target.value;
        if (q.needsAttention && q.explanation.trim()) {
          q.attentionReasons = q.attentionReasons.filter(r => !r.toLowerCase().includes("explanation"));
          q.needsAttention = q.attentionReasons.length > 0;
        }
        onUpdate?.();
      };
      explLabel.appendChild(explInput);
      card.appendChild(explLabel);

      container.appendChild(card);
    });
  }

  // --- MODAL PREVIEW ---
  function showPreviewModal(title, questions) {
    $("modalPreviewTitle").textContent = title || "Quiz Preview";
    const container = $("modalPreviewQuestions");
    container.innerHTML = "";

    questions.forEach((q, i) => {
      const item = document.createElement("div");
      item.className = "preview-item";
      item.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <b>Question ${i + 1}</b>
          <span class="muted" style="font-size:12px;">Timer: ${q.timeLimitSeconds || 15}s</span>
        </div>
        <p style="font-size:16px; margin-bottom:12px;">${escapeHtml(q.question)}</p>
        <div>
          ${q.options.map((opt, optIdx) => `
            <div class="preview-opt ${Number(q.correctOption) === optIdx ? "correct" : ""}">
              <b>${String.fromCharCode(65 + optIdx)}.</b> ${escapeHtml(opt)}
              ${Number(q.correctOption) === optIdx ? " &nbsp;✓ Correct Answer" : ""}
            </div>
          `).join("")}
        </div>
        <div class="preview-expl">
          <b>Explanation:</b> ${escapeHtml(q.explanation || "No explanation provided.")}
        </div>
      `;
      container.appendChild(item);
    });

    $("previewModal").classList.remove("hidden");
  }

  // --- HOST CONTROLLER ---
  function initHost() {
    // Mode tabs switching
    document.querySelectorAll("#hostNavTabs .tab-btn").forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        if (tab === "savedView") loadSavedQuizzes();
        if (tab === "historyView" && window.QuizHistory) {
          window.QuizHistory.loadHistory($("historyView"));
        }
        show(tab);
      };
    });

    // Modal close buttons
    $("modalCloseBtn").onclick = () => $("previewModal").classList.add("hidden");
    $("modalCloseBtn2").onclick = () => $("previewModal").classList.add("hidden");

    // 1. DEFAULT QUIZ SETUP
    $("createBtn").onclick = () => {
      $("createMsg").textContent = "";
      const user = window.AuthManager ? window.AuthManager.getUser() : null;
      socket.emit("quiz:create", {
        hostName: $("hostName").value,
        category: $("category").value,
        hostUserId: user ? user.id : null
      }, res => {
        if (!res?.ok) $("createMsg").textContent = res?.message || "Error creating room.";
      });
    };

    // 2. MANUAL BUILDER SETUP
    let builderQuestions = [
      createBlankQuestion(0),
      createBlankQuestion(1),
      createBlankQuestion(2)
    ];

    function renderBuilder() {
      renderQuestionEditor($("builderQuestionsList"), builderQuestions, () => {
        $("builderCount").value = builderQuestions.length;
      });
    }
    renderBuilder();

    $("builderAddQBtn").onclick = () => {
      builderQuestions.push(createBlankQuestion(builderQuestions.length));
      renderBuilder();
    };

    $("builderSyncCountBtn").onclick = () => {
      const targetCount = parseInt($("builderCount").value, 10);
      if (isNaN(targetCount) || targetCount < 1 || targetCount > 50) {
        alert("Please specify a count between 1 and 50.");
        return;
      }
      if (targetCount < builderQuestions.length) {
        const willLoseData = builderQuestions.slice(targetCount).some(q =>
          q.question.trim() || q.options.some(o => o.trim()) || q.explanation.trim()
        );
        if (willLoseData && !confirm(`Reducing count to ${targetCount} will remove existing questions with content. Proceed?`)) {
          return;
        }
        builderQuestions = builderQuestions.slice(0, targetCount);
      } else {
        while (builderQuestions.length < targetCount) {
          builderQuestions.push(createBlankQuestion(builderQuestions.length));
        }
      }
      renderBuilder();
    };

    $("builderPreviewBtn").onclick = () => {
      showPreviewModal($("builderTitle").value.trim() || "Custom Quiz Preview", builderQuestions);
    };

    $("builderSaveBtn").onclick = async () => {
      const title = $("builderTitle").value.trim() || "Untitled Custom Quiz";
      const validation = QuizValidation.validateQuiz({
        title,
        questions: builderQuestions
      }, builderQuestions.length);

      if (!validation.valid) {
        $("builderMsg").textContent = `Validation error: ${validation.summary}`;
        return;
      }
      try {
        await QuizStorage.saveQuiz(validation.sanitized);
        $("builderMsg").style.color = "#3a7551";
        $("builderMsg").textContent = "✓ Quiz saved to your local library!";
        setTimeout(() => { $("builderMsg").style.color = ""; $("builderMsg").textContent = ""; }, 3000);
      } catch (err) {
        $("builderMsg").textContent = `Save error: ${err.message}`;
      }
    };

    $("builderCreateRoomBtn").onclick = () => {
      const title = $("builderTitle").value.trim() || "Untitled Custom Quiz";
      const validation = QuizValidation.validateQuiz({
        title,
        questions: builderQuestions
      }, builderQuestions.length);

      if (!validation.valid) {
        $("builderMsg").textContent = `Validation error: ${validation.summary}`;
        return;
      }

      $("builderMsg").textContent = "Creating room...";
      const user = window.AuthManager ? window.AuthManager.getUser() : null;
      socket.emit("quiz:create", {
        hostName: $("hostName").value,
        category: "Custom",
        customQuiz: validation.sanitized,
        hostUserId: user ? user.id : null
      }, res => {
        if (!res?.ok) $("builderMsg").textContent = res?.message || "Failed to create room.";
      });
    };

    // 3. FILE IMPORT CONTROLLER
    let importedFile = null;
    let spreadsheetData = null;

    const dropZone = $("fileDropZone");
    const fileInput = $("quizFileInput");

    dropZone.onclick = () => fileInput.click();
    dropZone.ondragover = e => { e.preventDefault(); dropZone.classList.add("dragover"); };
    dropZone.ondragleave = () => dropZone.classList.remove("dragover");
    dropZone.ondrop = e => {
      e.preventDefault();
      dropZone.classList.remove("dragover");
      if (e.dataTransfer.files?.length) {
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(fileInput.files[0]);
      }
    };

    fileInput.onchange = () => {
      if (fileInput.files?.length) handleFileSelect(fileInput.files[0]);
    };

    function handleFileSelect(file) {
      importedFile = file;
      $("selectedFileName").textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
      $("importMsg").textContent = "";
      $("sheetSelectSection").classList.add("hidden");
      $("columnMappingSection").classList.add("hidden");
    }

    $("extractFileBtn").onclick = async () => {
      if (!importedFile) {
        $("importMsg").textContent = "Please select or drop a quiz document to extract.";
        return;
      }
      $("importMsg").textContent = "Extracting questions from document...";

      try {
        const useAI = $("aiToggle").checked;
        const result = await QuizImporter.importFile(importedFile, { useAI });

        if (result.sheetNames?.length > 1) {
          // Multi-sheet workbook
          spreadsheetData = result;
          const select = $("sheetSelectDropdown");
          select.innerHTML = result.sheetNames.map(s =>
            `<option value="${escapeHtml(s)}" ${s === result.activeSheet ? "selected" : ""}>${escapeHtml(s)}</option>`
          ).join("");
          select.onchange = async () => {
            const newRes = await QuizImporter.importFile(importedFile, { useAI, sheetName: select.value });
            handleExtractionSuccess(newRes);
          };
          $("sheetSelectSection").classList.remove("hidden");
        }

        if (result.needsMapping) {
          spreadsheetData = result;
          setupColumnMapping(result.headers, result.detectedMapping);
          $("columnMappingSection").classList.remove("hidden");
          $("importMsg").textContent = "Automatic column matching was ambiguous. Please confirm the column mapping below.";
          return;
        }

        handleExtractionSuccess(result);
      } catch (err) {
        $("importMsg").textContent = `Extraction failed: ${err.message}`;
      }
    };

    function setupColumnMapping(headers, detected) {
      const cols = headers || [];
      const opts = cols.map((h, i) => `<option value="${i}">${escapeHtml(h || `Column ${i + 1}`)}</option>`).join("");
      const emptyOpt = `<option value="-1">-- None --</option>`;

      ["mapColQuestion", "mapColOptA", "mapColOptB", "mapColOptC", "mapColOptD", "mapColAnswer", "mapColExplanation"].forEach(id => {
        $(id).innerHTML = (id.includes("Opt") || id.includes("Explanation") ? emptyOpt : "") + opts;
      });

      if (detected) {
        if (detected.questionCol !== -1) $("mapColQuestion").value = detected.questionCol;
        if (detected.optionCols?.[0] !== undefined) $("mapColOptA").value = detected.optionCols[0];
        if (detected.optionCols?.[1] !== undefined) $("mapColOptB").value = detected.optionCols[1];
        if (detected.optionCols?.[2] !== undefined) $("mapColOptC").value = detected.optionCols[2];
        if (detected.optionCols?.[3] !== undefined) $("mapColOptD").value = detected.optionCols[3];
        if (detected.answerCol !== -1) $("mapColAnswer").value = detected.answerCol;
        if (detected.explanationCol !== -1) $("mapColExplanation").value = detected.explanationCol;
      }

      $("applyMappingBtn").onclick = async () => {
        const customMapping = {
          questionCol: parseInt($("mapColQuestion").value, 10),
          optionCols: [
            parseInt($("mapColOptA").value, 10),
            parseInt($("mapColOptB").value, 10),
            parseInt($("mapColOptC").value, 10),
            parseInt($("mapColOptD").value, 10)
          ].filter(x => x !== -1),
          answerCol: parseInt($("mapColAnswer").value, 10),
          explanationCol: parseInt($("mapColExplanation").value, 10),
          timeLimitCol: -1
        };

        try {
          $("importMsg").textContent = "Applying column mapping...";
          const res = await QuizImporter.importFile(importedFile, {
            useAI: $("aiToggle").checked,
            sheetName: $("sheetSelectDropdown")?.value,
            customMapping
          });
          handleExtractionSuccess(res);
        } catch (err) {
          $("importMsg").textContent = `Mapping error: ${err.message}`;
        }
      };
    }

    // 4. REVIEW CONTROLLER
    let reviewQuestions = [];

    function handleExtractionSuccess(result) {
      if (!result.questions?.length) {
        $("importMsg").textContent = "No questions could be extracted from this document. Please check the document format.";
        return;
      }

      reviewQuestions = result.questions;
      $("reviewTitle").value = result.title || (importedFile ? importedFile.name.replace(/\.[^/.]+$/, "") : "Imported Quiz");
      $("reviewCount").value = reviewQuestions.length;

      const attentionCount = reviewQuestions.filter(q => q.needsAttention).length;
      $("reviewBadgeCount").textContent = `${reviewQuestions.length} Questions ${attentionCount > 0 ? `(${attentionCount} need attention)` : ""}`;

      renderReview();
      show("reviewView");
    }

    function renderReview() {
      renderQuestionEditor($("reviewQuestionsList"), reviewQuestions, () => {
        $("reviewCount").value = reviewQuestions.length;
        const attentionCount = reviewQuestions.filter(q => q.needsAttention).length;
        $("reviewBadgeCount").textContent = `${reviewQuestions.length} Questions ${attentionCount > 0 ? `(${attentionCount} need attention)` : ""}`;
      });
    }

    $("reviewAddQBtn").onclick = () => {
      reviewQuestions.push(createBlankQuestion(reviewQuestions.length));
      renderReview();
    };

    $("reviewSyncCountBtn").onclick = () => {
      const targetCount = parseInt($("reviewCount").value, 10);
      if (isNaN(targetCount) || targetCount < 1 || targetCount > 50) {
        alert("Please specify a count between 1 and 50.");
        return;
      }
      if (targetCount < reviewQuestions.length) {
        if (!confirm(`Trimming to ${targetCount} questions will remove the last ${reviewQuestions.length - targetCount} questions. Proceed?`)) return;
        reviewQuestions = reviewQuestions.slice(0, targetCount);
      } else {
        while (reviewQuestions.length < targetCount) {
          reviewQuestions.push(createBlankQuestion(reviewQuestions.length));
        }
      }
      renderReview();
    };

    $("reviewPreviewBtn").onclick = () => {
      showPreviewModal($("reviewTitle").value.trim() || "Review Quiz Preview", reviewQuestions);
    };

    $("reviewSaveBtn").onclick = async () => {
      const title = $("reviewTitle").value.trim() || "Untitled Quiz";
      const validation = QuizValidation.validateQuiz({
        title,
        questions: reviewQuestions
      }, reviewQuestions.length);

      if (!validation.valid) {
        $("reviewMsg").textContent = `Validation error: ${validation.summary}`;
        return;
      }

      try {
        await QuizStorage.saveQuiz(validation.sanitized);
        $("reviewMsg").style.color = "#3a7551";
        $("reviewMsg").textContent = "✓ Extracted quiz successfully saved to My Quizzes!";
        setTimeout(() => { $("reviewMsg").style.color = ""; $("reviewMsg").textContent = ""; }, 3000);
      } catch (err) {
        $("reviewMsg").textContent = `Save error: ${err.message}`;
      }
    };

    $("reviewCreateRoomBtn").onclick = () => {
      const title = $("reviewTitle").value.trim() || "Untitled Quiz";
      const validation = QuizValidation.validateQuiz({
        title,
        questions: reviewQuestions
      }, reviewQuestions.length);

      if (!validation.valid) {
        $("reviewMsg").textContent = `Validation error: ${validation.summary}`;
        return;
      }

      $("reviewMsg").textContent = "Creating room...";
      const user = window.AuthManager ? window.AuthManager.getUser() : null;
      socket.emit("quiz:create", {
        hostName: $("hostName").value,
        category: "Imported",
        customQuiz: validation.sanitized,
        hostUserId: user ? user.id : null
      }, res => {
        if (!res?.ok) $("reviewMsg").textContent = res?.message || "Failed to create room.";
      });
    };

    // 5. SAVED QUIZZES CONTROLLER
    async function loadSavedQuizzes() {
      const listContainer = $("savedQuizzesList");
      listContainer.innerHTML = "<p class='muted'>Loading saved quizzes...</p>";

      try {
        const quizzes = await QuizStorage.getAllQuizzes();
        if (!quizzes.length) {
          listContainer.innerHTML = "<p class='muted'>No saved quizzes yet. Create or import a quiz and save it locally to see it here.</p>";
          return;
        }

        listContainer.innerHTML = "";
        quizzes.forEach(quiz => {
          const card = document.createElement("div");
          card.className = "saved-quiz-card";

          const info = document.createElement("div");
          info.className = "saved-quiz-info";
          const d = new Date(quiz.updatedAt || quiz.createdAt);
          info.innerHTML = `
            <h3>${escapeHtml(quiz.title)}</h3>
            <div class="saved-quiz-meta">${quiz.questions?.length || 0} Questions • Saved on ${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          `;

          const actions = document.createElement("div");
          actions.style.cssText = "display:flex; gap:8px; flex-wrap:wrap;";

          const playBtn = document.createElement("button");
          playBtn.className = "primary btn-small";
          playBtn.textContent = "Play ▶";
          playBtn.onclick = () => {
            const user = window.AuthManager ? window.AuthManager.getUser() : null;
            socket.emit("quiz:create", {
              hostName: $("hostName").value,
              category: "Custom",
              customQuiz: quiz,
              hostUserId: user ? user.id : null
            }, res => {
              if (!res?.ok) alert(res?.message || "Error starting game.");
            });
          };

          const editBtn = document.createElement("button");
          editBtn.className = "btn-secondary btn-small";
          editBtn.textContent = "Edit";
          editBtn.onclick = () => {
            $("builderTitle").value = quiz.title;
            $("builderCount").value = quiz.questions?.length || 0;
            builderQuestions = JSON.parse(JSON.stringify(quiz.questions || []));
            renderBuilder();
            show("builderView");
          };

          const dupBtn = document.createElement("button");
          dupBtn.className = "btn-secondary btn-small";
          dupBtn.textContent = "Duplicate";
          dupBtn.onclick = async () => {
            await QuizStorage.duplicateQuiz(quiz.id);
            loadSavedQuizzes();
          };

          const delBtn = document.createElement("button");
          delBtn.className = "btn-icon btn-danger";
          delBtn.textContent = "✕";
          delBtn.title = "Delete Quiz";
          delBtn.onclick = async () => {
            if (confirm(`Delete "${quiz.title}" permanently from this device?`)) {
              await QuizStorage.deleteQuiz(quiz.id);
              loadSavedQuizzes();
            }
          };

          actions.appendChild(playBtn);
          actions.appendChild(editBtn);
          actions.appendChild(dupBtn);
          actions.appendChild(delBtn);

          card.appendChild(info);
          card.appendChild(actions);
          listContainer.appendChild(card);
        });
      } catch (err) {
        listContainer.innerHTML = `<p class='msg'>Failed to load saved quizzes: ${escapeHtml(err.message)}</p>`;
      }
    }

    $("savedNewQuizBtn").onclick = () => {
      $("builderTitle").value = "";
      builderQuestions = [createBlankQuestion(0), createBlankQuestion(1), createBlankQuestion(2)];
      $("builderCount").value = 3;
      renderBuilder();
      show("builderView");
    };

    // --- SOCKET EVENT HANDLERS ---
    let testSockets = [];
    window.addEventListener("beforeunload", () => {
      testSockets.forEach(s => s.disconnect());
    });

    function addTestPlayer() {
      const lobbyMsg = $("lobbyMsg");
      const botNum = testSockets.length + 1;
      const botName = `Player ${botNum}`;
      const botSocket = io();

      botSocket.on("connect", () => {
        botSocket.emit("quiz:join", { pin, playerName: botName }, res => {
          if (res?.ok) {
            testSockets.push(botSocket);
            if (lobbyMsg) {
              lobbyMsg.style.display = "block";
              lobbyMsg.className = "msg success";
              lobbyMsg.innerHTML = `✓ <b>${escapeHtml(botName)}</b> joined the room! Click <b>Start Game ▶</b> whenever you are ready.`;
            }
          } else if (lobbyMsg) {
            lobbyMsg.style.display = "block";
            lobbyMsg.className = "msg";
            lobbyMsg.textContent = res?.message || "Failed to add test player.";
          }
        });
      });

      botSocket.on("question:start", q => {
        const option = Math.floor(Math.random() * (q.options?.length || 4));
        const delay = 1200 + Math.floor(Math.random() * 2000);
        setTimeout(() => {
          botSocket.emit("answer:submit", {
            pin,
            selectedOption: option,
            timeTakenMs: delay
          });
        }, delay);
      });
    }

    if ($("quickAddBotBtn")) {
      $("quickAddBotBtn").onclick = () => addTestPlayer();
    }

    function startSoloPreview() {
      const lobbyMsg = $("lobbyMsg");
      socket.emit("quiz:start", { pin, allowSolo: true }, res => {
        if (!res?.ok && lobbyMsg) {
          lobbyMsg.style.display = "block";
          lobbyMsg.className = "msg";
          lobbyMsg.textContent = res?.message || "Failed to start solo preview.";
        }
      });
    }

    socket.on("quiz:created", data => {
      pin = data.pin;
      $("pin").textContent = pin;
      $("roomMeta").textContent = `${data.quizTitle || data.category} • ${data.questionCount} questions`;
      const quickLink = $("quickPlayerLink");
      if (quickLink) {
        quickLink.href = `/player.html?pin=${encodeURIComponent(pin)}`;
      }
      const lobbyMsg = $("lobbyMsg");
      if (lobbyMsg) {
        lobbyMsg.textContent = "";
        lobbyMsg.className = "msg";
        lobbyMsg.style.display = "none";
      }
      show("lobbyView");
    });

    socket.on("lobby:update", data => {
      $("playerCount").textContent = data.players.length;
      $("players").innerHTML = data.players.length
        ? data.players.map(p => `<div class="player-item"><span>${escapeHtml(p.name)}</span><b>${p.score}</b></div>`).join("")
        : `<p class="muted">Waiting for players to join…</p>`;

      const lobbyMsg = $("lobbyMsg");
      if (data.players.length > 0 && lobbyMsg && !lobbyMsg.classList.contains("success")) {
        lobbyMsg.style.display = "none";
        lobbyMsg.textContent = "";
      }
    });

    $("startBtn").onclick = () => {
      const lobbyMsg = $("lobbyMsg");
      if (lobbyMsg) {
        lobbyMsg.textContent = "";
        lobbyMsg.className = "msg";
        lobbyMsg.style.display = "none";
      }

      if (!pin) {
        if (lobbyMsg) {
          lobbyMsg.style.display = "block";
          lobbyMsg.textContent = "Error: Room PIN not found. Please create a room first.";
        }
        return;
      }

      const count = Number($("playerCount")?.textContent) || 0;
      if (count === 0) {
        if (lobbyMsg) {
          lobbyMsg.style.display = "block";
          lobbyMsg.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="display:inline-flex; align-items:center; gap:6px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                <span><b>At least one player must join</b> before starting the battle!</span>
              </div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-top:4px;">
                <a href="/player.html?pin=${encodeURIComponent(pin)}" target="_blank" class="primary btn-small" style="text-decoration:none; display:inline-flex; align-items:center; gap:5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  <span>Open Player Screen (New Tab)</span>
                </a>
                <button id="addBotInlineBtn" type="button" class="btn-secondary btn-small" style="display:inline-flex; align-items:center; gap:5px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8.01" y2="16"></line><line x1="16" y1="16" x2="16.01" y2="16"></line></svg>
                  <span>+ Add Test Player</span>
                </button>
                <button id="startSoloInlineBtn" type="button" class="btn-secondary btn-small" style="display:inline-flex; align-items:center; gap:5px;" title="Run question countdown & reveal without players">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>Start Solo Preview</span>
                </button>
              </div>
            </div>
          `;
          $("addBotInlineBtn").onclick = () => addTestPlayer();
          $("startSoloInlineBtn").onclick = () => startSoloPreview();
        }
        return;
      }

      socket.emit("quiz:start", { pin }, res => {
        if (!res?.ok) {
          if (lobbyMsg) {
            lobbyMsg.style.display = "block";
            lobbyMsg.textContent = res?.message || "Failed to start quiz.";
          }
        }
      });
    };

    socket.on("quiz:started", () => {
      show("gameView");
      socket.emit("quiz:ready", { pin });
    });

    socket.on("question:start", q => {
      $("qProgress").textContent = `QUESTION ${q.questionIndex} / ${q.totalQuestions}`;
      $("hostQuestion").textContent = q.question;
      $("reveal").classList.add("hidden");
      $("hostOptions").innerHTML = q.options.map((o, i) =>
        `<div class="host-option" data-index="${i}">${escapeHtml(o)}</div>`
      ).join("");
      startCountdown($("hostTimer"), q.timeLimitSeconds || 15);
    });

    socket.on("question:time_up", data => {
      clearInterval(timerInterval);
      $("hostTimer").textContent = "✓";
      document.querySelectorAll(".host-option").forEach((el, i) => {
        if (i === data.correctOption) el.classList.add("correct");
      });
      $("explanation").textContent = data.explanation || "No explanation provided.";
      $("reveal").classList.remove("hidden");
    });

    socket.on("leaderboard:update", data => renderRanks($("hostLeaderboard"), data.leaderboard));

    socket.on("quiz:ended", data => {
      sessionStorage.setItem("quizFinished", "true");
      $("winnerText").textContent = data.winner
        ? `${data.winner.name} wins with ${data.winner.score} points!`
        : "Quiz complete!";

      if (window.PodiumRenderer && $("podiumArea")) {
        $("finalRanks").innerHTML = "";
        window.PodiumRenderer.renderPodiumAndLeaderboard({
          containerEl: $("podiumArea"),
          winner: data.winner,
          finalRanks: data.finalRanks || [],
          podium: data.podium || [],
          sessionId: data.sessionId,
          isHost: true,
          currentUser: window.AuthManager ? window.AuthManager.getUser() : null
        });
      } else {
        $("finalRanks").className = "rank-list";
        renderRanks($("finalRanks"), data.finalRanks);
      }
      show("endView");
    });

    socket.on("quiz:closed", data => {
      $("createMsg").textContent = data.message;
      show("createView");
    });
  }

  // --- PLAYER CONTROLLER ---
  function initPlayer() {
    $("joinBtn").onclick = () => {
      const entered = $("pinInput").value.trim();
      const name = $("nameInput").value.trim();
      $("joinMsg").textContent = "";

      if (!entered) {
        $("joinMsg").textContent = "Please enter the 4-digit Room PIN.";
        $("pinInput").focus();
        return;
      }
      if (!name) {
        $("joinMsg").textContent = "Please enter your player nickname.";
        $("nameInput").focus();
        return;
      }

      const user = window.AuthManager ? window.AuthManager.getUser() : null;
      socket.emit("quiz:join", {
        pin: entered,
        playerName: name,
        userId: user ? user.id : null
      }, res => {
        if (!res?.ok) {
          $("joinMsg").textContent = res?.message || "Failed to join room. Please check the PIN.";
        } else {
          pin = res.pin || entered;
          playerName = res.name || name;
          $("welcomeName").textContent = `Welcome, ${playerName}!`;
          show("waitView");
        }
      });
    };

    socket.on("quiz:joined", data => {
      if (data) {
        pin = data.pin || pin;
        playerName = data.name || playerName;
        $("welcomeName").textContent = `Welcome, ${playerName}!`;
        show("waitView");
      }
    });

    socket.on("lobby:update", data => {
      $("waitPlayers").innerHTML = `<p class="muted">${data.players.length} player${data.players.length === 1 ? "" : "s"} in the room</p>`;
    });

    socket.on("quiz:started", () => show("playView"));

    socket.on("question:start", q => {
      answered = false;
      $("qNumber").textContent = `QUESTION ${q.questionIndex} / ${q.totalQuestions}`;
      $("question").textContent = q.question;
      $("answerMsg").textContent = "";
      $("playerReveal")?.classList.add("hidden");

      $("answerGrid").innerHTML = q.options.map((o, i) =>
        `<button class="answer" data-index="${i}">${escapeHtml(o)}</button>`
      ).join("");

      document.querySelectorAll(".answer").forEach(btn =>
        btn.onclick = () => submitAnswer(Number(btn.dataset.index), q.timeLimitSeconds || 15)
      );

      startCountdown($("timer"), q.timeLimitSeconds || 15, () => {
        if (!answered) $("answerMsg").textContent = "Time's up — waiting for the reveal…";
      });
    });

    function submitAnswer(index, timeLimitSeconds) {
      if (answered) return;
      answered = true;
      document.querySelectorAll(".answer").forEach(b => b.disabled = true);
      const totalMs = timeLimitSeconds * 1000;
      const timeTakenMs = totalMs - Math.max(0, Number($("timer").textContent) * 1000 - 500);

      socket.emit("answer:submit", { pin, selectedOption: index, timeTakenMs }, res => {
        if (!res?.ok) {
          $("answerMsg").textContent = res.message;
          return;
        }
        $("answerMsg").textContent = res.isCorrect ? `✓ Correct! +${res.score} points` : "✕ Not quite — keep going!";
      });
    }

    socket.on("answer:result", data => {
      $("myScore").textContent = Number($("myScore").textContent) + data.score;
    });

    socket.on("leaderboard:update", data => {
      renderRanks($("playerLeaderboard"), data.leaderboard, playerName);
    });

    // Feature H: Explanations visible to participant after reveal
    socket.on("question:time_up", data => {
      document.querySelectorAll(".answer").forEach((b, i) => {
        if (i === data.correctOption) b.style.outline = "3px solid #75a88a";
      });
      if (!answered) {
        $("answerMsg").textContent = `Answer: ${document.querySelectorAll(".answer")[data.correctOption]?.textContent || ""}`;
      }
      if ($("playerExplanation") && $("playerReveal")) {
        $("playerExplanation").textContent = data.explanation || "No explanation provided.";
        $("playerReveal").classList.remove("hidden");
      }
    });

    socket.on("quiz:ended", data => {
      sessionStorage.setItem("quizFinished", "true");
      $("playerWinner").textContent = data.winner
        ? `${data.winner.name} wins!`
        : "Quiz complete!";

      if (window.PodiumRenderer && $("playerPodiumArea")) {
        $("playerFinalRanks").innerHTML = "";
        window.PodiumRenderer.renderPodiumAndLeaderboard({
          containerEl: $("playerPodiumArea"),
          winner: data.winner,
          finalRanks: data.finalRanks || [],
          podium: data.podium || [],
          sessionId: data.sessionId,
          isHost: false,
          currentUser: window.AuthManager ? window.AuthManager.getUser() : null
        });
      } else {
        $("playerFinalRanks").className = "rank-list";
        renderRanks($("playerFinalRanks"), data.finalRanks, playerName);
      }
      show("endView");
    });

    socket.on("quiz:closed", data => {
      $("joinMsg").textContent = data.message;
      show("joinView");
    });
  }

  return { initHost, initPlayer, renderQuestionEditor, createBlankQuestion };
})();