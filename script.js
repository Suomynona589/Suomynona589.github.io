// Quiz Hub - Full JavaScript
// Includes:
// - Builder access code to open builder: 4815162342 (revealed on perfect score too)
// - Burn/admin code: 9859 to unlock Burn, plus Edit/Delete management for burned quizzes
// - Shuffle-safe correctness mapping
// - Test mode (run draft without burning)
// - Burn simulation: persists quizzes to localStorage and renders dynamically
// - Edit mode: load a burned quiz into builder, save changes back
// - Delete mode: remove burned quizzes
// - Achievements + perfect score reveal for builder code
// - Optional timer hooks and category filter scaffolding

document.addEventListener("DOMContentLoaded", () => {
  // ====== Codes ======
  const BUILDER_ACCESS_CODE = "4815162342"; // open builder; also revealed after perfect score
  const ADMIN_BURN_CODE = "9859"; // unlock burn + edit/delete (admin mode)

  // ====== Storage keys ======
  const STORAGE = {
    quizzes: "qh_quizzes",
    settings: "qh_settings",
    achievements: "qh_achievements",
    admin: "qh_admin_unlocked"
  };

  // ====== DOM ======
  const homePage = document.getElementById("home-page");
  const quizContainer = document.getElementById("quiz-container");
  const builderContainer = document.getElementById("builder-container");

  const quizListEl = document.getElementById("quiz-list");
  const openBuilderBtn = document.getElementById("open-builder");
  const builderLockIcon = document.getElementById("builder-lock");

  const quizTitleEl = document.getElementById("quiz-title");
  const questionBox = document.getElementById("question-box");
  const optionsBox = document.getElementById("options-box");
  const nextBtn = document.getElementById("nextBtn");
  const leaveBtn = document.getElementById("leaveBtn");
  const resultBox = document.getElementById("result-box");

  const quizTitleInput = document.getElementById("quiz-title-input");
  const questionsContainer = document.getElementById("questions-container");
  const builderOutput = document.getElementById("output");

  const addQuestionBtn = document.getElementById("add-question");
  const testQuizBtn = document.getElementById("test-quiz");
  const burnToggleBtn = document.getElementById("burn-toggle");
  const burnQuizBtn = document.getElementById("burn-quiz");
  const exitBuilderBtn = document.getElementById("exit-builder");

  const burnPasscodeDiv = document.getElementById("burn-passcode");
  const builderPasscodeInput = document.getElementById("builder-passcode");
  const passcodeStatus = document.getElementById("passcode-status");

  // ====== Optional UI stubs (add in HTML if you want)
  const achievementsEl = document.getElementById("achievements");
  const filterBarEl = document.getElementById("filter-bar");

  // ====== State ======
  const state = {
    // admin gates
    builderUnlocked: false,
    adminUnlocked: loadAdminUnlocked(),
    burnUnlocked: false, // burn action in builder
    // app data
    quizzes: loadQuizzes() || defaultQuizzes(),
    settings: loadSettings() || {
      shuffleOptions: false,
      timerPerQuestion: 0,
      persist: true
    },
    achievements: loadAchievements() || [],
    filterCategory: "All",

    // runner
    currentKey: null,
    currentQuizRef: null,
    currentIndex: 0,
    score: 0,
    selectedOriginalIndex: null,
    optionMap: [],
    timerId: null,
    timeLeft: 0,

    // builder modes
    builderEditIndex: null, // null: new quiz; number: editing burned[i]
  };

  // ====== Startup ======
  renderHome();
  renderFilterBar();
  renderAchievements();
  wireHomeListeners();
  wireRunnerListeners();
  wireBuilderListeners();
  renderAdminBadge();

  // ====== Defaults ======
  function defaultQuizzes() {
    return {
      builtIns: {
        heroes: {
          title: "Heroes of Olympus Quiz",
          category: "Percy Jackson",
          preview: "Test your knowledge of the Seven!",
          quizData: [
            {
              question: "Question 1: Who built the Argo II?",
              options: ["Leo Valdez", "Hazel Levesque", "Frank Zhang", "Percy Jackson"],
              answer: [0]
            },
            {
              question: "Question 2: Who is from the past?",
              options: ["Annabeth Chase", "Nico di Angelo", "Hazel Levesque", "Gleeson Hedge"],
              answer: [1, 2]
            },
            {
              question: "Question 3: Who are the Romans of the seven?",
              options: [
                "None of them",
                "Hazel Levesque, Frank Zhang, and Jason Grace",
                "Leo Valdez, Percy Jackson, and Annabeth Chase",
                "Piper McLean, Coach Hedge, and Nico di Angelo"
              ],
              answer: [1]
            },
            {
              question: "Question 4: What was one of the ingredients they needed to fix the Argo II?",
              options: ["Imperial Gold", "Wood", "Electricity", "Lime"],
              answer: [3]
            },
            {
              question: "Question 5: Which God helped Percy defeat Polybotes?",
              options: ["Zeus", "Mars", "Terminus", "Nike"],
              answer: [2]
            }
          ]
        }
      },
      burned: [] // user-created quizzes
    };
  }

function defaultQuizzes() {
  return {
    builtIns: {
      heroes: { /* existing Heroes quiz */ },
      kane: {
        title: "Kane Chronicles",
        category: "Custom",
        preview: "Question 1: What is Sadie and Carter's dad named?",
        quizData: [
          {
            question: "Question 1: What is Sadie and Carter's dad named?",
            options: ["Jeffery Kane","Walt Kane","Julius Kane","Tut Kane"],
            answer: [2]
          },
          {
            question: "Question 2: What Gods do the Carter siblings host?",
            options: [
              "Sadie: Horus. Carter: Shu.",
              "Sadie: Isis. Carter: Horus.",
              "Sadie: Nekhbet. Carter: Ra."
            ],
            answer: [1]
          },
          {
            question: "Question 3: What is Set's secret name?",
            options: ["Chaos man","Hatshepsututankhamun","Monday","Evil Day"],
            answer: [3]
          }
        ]
      }
    },
    burned: []
  };
}

  // ====== Persistence ======
  function loadQuizzes() {
    try {
      const raw = localStorage.getItem(STORAGE.quizzes);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function saveQuizzes() {
    if (!state.settings.persist) return;
    try {
      localStorage.setItem(STORAGE.quizzes, JSON.stringify(state.quizzes));
    } catch {}
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE.settings);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
  function saveSettings() {
    try {
      localStorage.setItem(STORAGE.settings, JSON.stringify(state.settings));
    } catch {}
  }
  function loadAchievements() {
    try {
      const raw = localStorage.getItem(STORAGE.achievements);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
  function saveAchievements() {
    try {
      localStorage.setItem(STORAGE.achievements, JSON.stringify(state.achievements));
    } catch {}
  }
  function loadAdminUnlocked() {
    try {
      const raw = localStorage.getItem(STORAGE.admin);
      return raw ? JSON.parse(raw) : false;
    } catch {
      return false;
    }
  }
  function saveAdminUnlocked(val) {
    try {
      localStorage.setItem(STORAGE.admin, JSON.stringify(val));
    } catch {}
  }

  // ====== Home render ======
  function renderHome() {
    quizListEl.innerHTML = "";

    const cat = state.filterCategory;

    // built-ins (no delete/edit; you can clone to builder in admin mode)
    Object.entries(state.quizzes.builtIns).forEach(([key, quiz]) => {
      if (cat === "All" || quiz.category === cat) {
        addQuizCard({
          key,
          title: quiz.title,
          desc: quiz.preview,
          category: quiz.category,
          type: "builtIn"
        });
      }
    });

    // burned (editable/deletable in admin mode)
    state.quizzes.burned.forEach((quiz, i) => {
      if (cat === "All" || quiz.category === cat) {
        addQuizCard({
          key: `burned-${i}`,
          title: quiz.title,
          desc: quiz.preview || "Custom quiz",
          category: quiz.category || "Custom",
          type: "burned",
          adminControls: state.adminUnlocked
        });
      }
    });

    builderLockIcon.textContent = state.builderUnlocked ? "🔓" : "🔒";
  }

  function addQuizCard({ key, title, desc, category, type, adminControls = false }) {
    const card = document.createElement("div");
    card.className = "quiz-card";
    card.setAttribute("data-quiz", key);

    const previewHtml = makePreview(key, type);

    const adminHtml =
      adminControls && type === "burned"
        ? `
      <div class="admin-controls">
        <button class="small-btn admin-edit">Edit</button>
        <button class="small-btn admin-delete">Delete</button>
      </div>
    `
        : adminControls && type === "builtIn"
        ? `
      <div class="admin-controls">
        <button class="small-btn admin-clone">Clone to Builder</button>
      </div>
    `
        : "";

    card.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p class="category-tag">${escapeHtml(category || "Uncategorized")}</p>
      <p>${escapeHtml(desc || "")}</p>
      ${previewHtml}
      <button class="start-quiz">Start Quiz</button>
      ${adminHtml}
    `;
    quizListEl.appendChild(card);
  }

  function makePreview(key, type) {
    const ref = resolveQuizRef(key, type);
    const first = ref?.quizData?.[0];
    if (!first) return "";
    const firstOpt = first.options?.[0] || "Option A";
    return `
      <div class="preview-card" aria-hidden="true">
        <div class="preview-q">${escapeHtml(first.question)}</div>
        <div class="preview-opt">${escapeHtml(firstOpt)}</div>
      </div>
    `;
  }

  // ====== Admin badge & unlock button (floating) ======
  function renderAdminBadge() {
    // Add a floating admin button if not present
    if (document.getElementById("admin-toggle")) return;
    const btn = document.createElement("button");
    btn.id = "admin-toggle";
    btn.textContent = state.adminUnlocked ? "Admin: ON" : "Admin: OFF";
    btn.style.position = "fixed";
    btn.style.bottom = "16px";
    btn.style.right = "16px";
    btn.style.zIndex = "999";
    btn.style.background = state.adminUnlocked ? "#155724" : "#555";
    btn.style.color = "#fff";
    btn.style.borderRadius = "8px";
    btn.style.padding = "8px 12px";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
      const code = prompt("Enter admin/burn code:");
      if (code === ADMIN_BURN_CODE) {
        state.adminUnlocked = true;
        saveAdminUnlocked(true);
        btn.textContent = "Admin: ON";
        btn.style.background = "#155724";
        renderHome();
        alert("Admin mode unlocked. You can now Edit/Delete burned quizzes.");
      } else {
        alert("Wrong code.");
      }
    });
  }

  // ====== Wiring: Home ======
  function wireHomeListeners() {
    // Start quiz
    quizListEl.addEventListener("click", (e) => {
      const startBtn = e.target.closest(".start-quiz");
      if (startBtn) {
        const key = startBtn.closest(".quiz-card").getAttribute("data-quiz");
        startQuiz(key);
        return;
      }

      // Admin edit/delete/clone
      const editBtn = e.target.closest(".admin-edit");
      const delBtn = e.target.closest(".admin-delete");
      const cloneBtn = e.target.closest(".admin-clone");

      if (editBtn) {
        if (!state.adminUnlocked) return;
        const key = editBtn.closest(".quiz-card").getAttribute("data-quiz");
        const idx = parseInt(key.split("-")[1], 10);
        loadQuizIntoBuilderForEdit(idx);
        return;
      }
      if (delBtn) {
        if (!state.adminUnlocked) return;
        const key = delBtn.closest(".quiz-card").getAttribute("data-quiz");
        const idx = parseInt(key.split("-")[1], 10);
        if (confirm("Delete this quiz?")) {
          state.quizzes.burned.splice(idx, 1);
          saveQuizzes();
          renderHome();
          alert("Deleted.");
        }
        return;
      }
      if (cloneBtn) {
        if (!state.adminUnlocked) return;
        const key = cloneBtn.closest(".quiz-card").getAttribute("data-quiz");
        const src = resolveQuizRef(key, "builtIn");
        loadQuizIntoBuilderForClone(src);
        return;
      }
    });

    // Builder gate
    openBuilderBtn.addEventListener("click", () => {
      if (!state.builderUnlocked) {
        const entered = prompt("Enter builder access code to open Quiz Builder:");
        if (entered !== BUILDER_ACCESS_CODE) {
          alert("Wrong code. Builder remains locked.");
          return;
        }
        state.builderUnlocked = true;
        builderLockIcon.textContent = "🔓";
      }
      showBuilderNew();
    });
  }

  // ====== Quiz runner ======
  function startQuiz(key) {
    state.currentKey = key;
    state.currentQuizRef = resolveQuizRef(key);
    state.currentIndex = 0;
    state.score = 0;
    state.selectedOriginalIndex = null;
    state.optionMap = [];
    clearTimer();

    quizTitleEl.textContent = state.currentQuizRef.title;
    resultBox.textContent = "";

    homePage.style.display = "none";
    builderContainer.style.display = "none";
    quizContainer.style.display = "block";

    prepareTimer();
    loadQuestion();
  }

  function resolveQuizRef(key, typeHint = null) {
    if (typeHint === "builtIn" || (!typeHint && !key.startsWith("burned"))) {
      return state.quizzes.builtIns[key];
    }
    if (key.startsWith("burned")) {
      const idx = parseInt(key.split("-")[1], 10);
      return state.quizzes.burned[idx];
    }
    return state.quizzes.builtIns[key];
  }

  function loadQuestion() {
    const q = state.currentQuizRef.quizData[state.currentIndex];
    questionBox.textContent = q.question;
    optionsBox.innerHTML = "";
    nextBtn.style.display = "none";
    state.selectedOriginalIndex = null;

    // Shuffle-safe mapping
    state.optionMap = q.options.map((text, originalIndex) => ({ text, originalIndex }));
    if (state.settings.shuffleOptions) shuffleArray(state.optionMap);

    state.optionMap.forEach(({ text, originalIndex }) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.textContent = text;
      btn.addEventListener("click", () => {
        optionsBox.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        state.selectedOriginalIndex = originalIndex; // original index preserved
        nextBtn.style.display = "inline-block";
      });
      optionsBox.appendChild(btn);
    });
  }

  function wireRunnerListeners() {
    nextBtn.addEventListener("click", () => {
      const q = state.currentQuizRef.quizData[state.currentIndex];
      const correctSet = new Set(q.answer || []);
      const isRight =
        state.selectedOriginalIndex !== null && correctSet.has(state.selectedOriginalIndex);
      if (isRight) state.score++;

      state.currentIndex++;
      clearTimer();

      if (state.currentIndex < state.currentQuizRef.quizData.length) {
        prepareTimer();
        loadQuestion();
      } else {
        finishQuiz();
      }
    });

    leaveBtn.addEventListener("click", () => {
      if (!confirm("Leave quiz and return to home?")) return;
      clearTimer();
      quizContainer.style.display = "none";
      homePage.style.display = "block";
    });

    // Simple keyboard navigation
    optionsBox.addEventListener("keydown", (e) => {
      const opts = Array.from(optionsBox.querySelectorAll(".option-btn"));
      if (!opts.length) return;
      const currentIdx = opts.findIndex(b => b.classList.contains("selected"));
      if (e.key === "ArrowDown") {
        const nextIdx = Math.min(opts.length - 1, currentIdx + 1);
        opts[nextIdx].click(); opts[nextIdx].focus();
      } else if (e.key === "ArrowUp") {
        const prevIdx = Math.max(0, currentIdx - 1);
        opts[prevIdx].click(); opts[prevIdx].focus();
      } else if (e.key === "Enter") {
        if (nextBtn.style.display !== "none") nextBtn.click();
      }
    });
  }

  function finishQuiz() {
    quizContainer.style.display = "none";
    homePage.style.display = "block";

    const total = state.currentQuizRef.quizData.length;
    const msg = `You scored ${state.score} out of ${total}!`;
    alert(msg);

    // Perfect score achievement + reveal builder code
    if (state.score === total) {
      const ach = `Perfect score: ${state.currentQuizRef.title}`;
      if (!state.achievements.includes(ach)) {
        state.achievements.push(ach);
        saveAchievements();
        renderAchievements();
      }
      alert(`Builder access code: ${BUILDER_ACCESS_CODE}`);
    }
  }

  // ====== Timer (optional) ======
  function prepareTimer() {
    clearTimer();
    const perQ = state.settings.timerPerQuestion || 0;
    if (perQ > 0) {
      state.timeLeft = perQ;
      state.timerId = setInterval(() => {
        state.timeLeft--;
        if (state.timeLeft <= 0) {
          nextBtn.click(); // auto-advance
        }
      }, 1000);
    }
  }
  function clearTimer() {
    if (state.timerId) {
      clearInterval(state.timerId);
      state.timerId = null;
    }
  }

  // ====== Builder wiring ======
  function wireBuilderListeners() {
    addQuestionBtn.addEventListener("click", addQuestionBlock);
    testQuizBtn.addEventListener("click", testDraft);

    burnToggleBtn.addEventListener("click", () => {
      burnPasscodeDiv.style.display = "block";
      builderPasscodeInput.placeholder = pick([
        "••••",
        "Enter code",
        "Top secret",
        "Access code",
        "Not 9859 😉"
      ]);
    });

    builderPasscodeInput.addEventListener("input", () => {
      // Admin/Burn code gate
      if (builderPasscodeInput.value === ADMIN_BURN_CODE) {
        passcodeStatus.textContent = "Burn unlocked 🔓";
        burnQuizBtn.disabled = false;
        state.burnUnlocked = true;
        // Also unlock admin mode globally
        if (!state.adminUnlocked) {
          state.adminUnlocked = true;
          saveAdminUnlocked(true);
          renderHome();
        }
      } else {
        passcodeStatus.textContent = "Burn locked 🔒";
        burnQuizBtn.disabled = true;
        state.burnUnlocked = false;
      }
    });

    burnQuizBtn.addEventListener("click", () => {
      if (state.builderEditIndex !== null) {
        saveEditedQuiz();
      } else {
        burnDraft();
      }
    });

    exitBuilderBtn.addEventListener("click", () => {
      builderContainer.style.display = "none";
      homePage.style.display = "block";
    });
  }

  // ====== Builder modes ======
  function showBuilderNew() {
    builderContainer.style.display = "block";
    homePage.style.display = "none";
    resetBuilderUI();
    state.builderEditIndex = null;
    burnQuizBtn.textContent = "Burn Into Code";
  }

  function loadQuizIntoBuilderForEdit(burnIndex) {
    const quiz = state.quizzes.burned[burnIndex];
    if (!quiz) return;
    builderContainer.style.display = "block";
    homePage.style.display = "none";

    resetBuilderUI();
    state.builderEditIndex = burnIndex;
    burnQuizBtn.textContent = "Save Changes";

    // Populate builder with quiz data
    quizTitleInput.value = quiz.title || "";
    quiz.quizData.forEach((q) => {
      const block = addQuestionBlock(true); // returns block
      block.querySelector(".question-text").value = q.question.replace(/^Question \d+:\s*/, "");
      const answersContainerEl = block.querySelector(".answers-container");
      q.options.forEach((optText, idx) => {
        const ans = document.createElement("div");
        ans.className = "answer-block";
        ans.innerHTML = `
          <input type="text" class="answer-text" value="${escapeAttr(optText)}">
          <label><input type="checkbox" class="correct-check" ${q.answer.includes(idx) ? "checked" : ""}> Correct?</label>
          <button class="small-btn remove-answer">Remove</button>
        `;
        answersContainerEl.appendChild(ans);
        ans.querySelector(".remove-answer").addEventListener("click", () => {
          ans.remove();
          updateDraftJSON();
        });
      });
    });

    updateDraftJSON();
  }

  function loadQuizIntoBuilderForClone(srcQuiz) {
    builderContainer.style.display = "block";
    homePage.style.display = "none";

    resetBuilderUI();
    state.builderEditIndex = null;
    burnQuizBtn.textContent = "Burn Into Code";

    quizTitleInput.value = `${srcQuiz.title} (Clone)`;
    srcQuiz.quizData.forEach((q) => {
      const block = addQuestionBlock(true);
      block.querySelector(".question-text").value = q.question.replace(/^Question \d+:\s*/, "");
      const answersContainerEl = block.querySelector(".answers-container");
      q.options.forEach((optText, idx) => {
        const ans = document.createElement("div");
        ans.className = "answer-block";
        ans.innerHTML = `
          <input type="text" class="answer-text" value="${escapeAttr(optText)}">
          <label><input type="checkbox" class="correct-check" ${q.answer.includes(idx) ? "checked" : ""}> Correct?</label>
          <button class="small-btn remove-answer">Remove</button>
        `;
        answersContainerEl.appendChild(ans);
        ans.querySelector(".remove-answer").addEventListener("click", () => {
          ans.remove();
          updateDraftJSON();
        });
      });
    });

    updateDraftJSON();
  }

  // ====== Builder core ======
  function resetBuilderUI() {
    questionsContainer.innerHTML = "";
    quizTitleInput.value = "";
    builderOutput.textContent = JSON.stringify(collectBuilderData(), null, 2);
    burnPasscodeDiv.style.display = "none";
    builderPasscodeInput.value = "";
    passcodeStatus.textContent = "Burn locked 🔒";
    burnQuizBtn.disabled = true;
    state.burnUnlocked = false;
  }

  function addQuestionBlock(returnBlock = false) {
    const num = questionsContainer.querySelectorAll(".question-block").length + 1;
    const block = document.createElement("div");
    block.className = "question-block";
    block.innerHTML = `
      <div class="question-header">
        <span><strong>Question ${num}:</strong></span>
        <input type="text" class="question-text" placeholder="Enter question text">
        <button class="small-btn remove-question">Remove</button>
      </div>
      <div class="answers-container"></div>
      <div class="builder-tools">
        <button class="small-btn add-answer">Add Answer</button>
      </div>
    `;
    questionsContainer.appendChild(block);

    const answersContainerEl = block.querySelector(".answers-container");
    const addAnsBtn = block.querySelector(".add-answer");
    addAnsBtn.addEventListener("click", () => {
      const ans = document.createElement("div");
      ans.className = "answer-block";
      ans.innerHTML = `
        <input type="text" class="answer-text" placeholder="Answer option">
        <label><input type="checkbox" class="correct-check"> Correct?</label>
        <button class="small-btn remove-answer">Remove</button>
      `;
      answersContainerEl.appendChild(ans);
      ans.querySelector(".remove-answer").addEventListener("click", () => {
        ans.remove();
        updateDraftJSON();
      });
      updateDraftJSON();
    });

    block.querySelector(".remove-question").addEventListener("click", () => {
      block.remove();
      renumberQuestions();
      updateDraftJSON();
    });

    updateDraftJSON();
    return returnBlock ? block : undefined;
  }

  function renumberQuestions() {
    const blocks = questionsContainer.querySelectorAll(".question-block");
    blocks.forEach((block, i) => {
      const hdr = block.querySelector(".question-header span");
      if (hdr) hdr.innerHTML = `<strong>Question ${i + 1}:</strong>`;
    });
  }

  function collectBuilderData() {
    const title = (quizTitleInput.value || "").trim() || "Untitled Quiz";
    const blocks = questionsContainer.querySelectorAll(".question-block");
    const quizData = [];

    blocks.forEach((block, qIndex) => {
      const qText = (block.querySelector(".question-text").value || "").trim();
      const answers = block.querySelectorAll(".answer-block");
      const options = [];
      const answer = [];
      answers.forEach((ansBlock, aIndex) => {
        const ansText = (ansBlock.querySelector(".answer-text").value || "").trim();
        const isCorrect = ansBlock.querySelector(".correct-check").checked;
        if (ansText.length > 0) {
          options.push(ansText);
          if (isCorrect) answer.push(aIndex);
        }
      });

      quizData.push({
        question: `Question ${qIndex + 1}: ${qText || "Untitled question"}`,
        options,
        answer
      });
    });

    return {
      title,
      category: "Custom",
      preview: quizData[0]?.question || "Custom quiz",
      quizData
    };
  }

  function updateDraftJSON() {
    builderOutput.textContent = JSON.stringify(collectBuilderData(), null, 2);
  }

  function validateDraft(draft) {
    if (!draft.quizData.length) {
      alert("Add at least one question.");
      return false;
    }
    for (const q of draft.quizData) {
      if (!q.options.length) {
        alert("Each question needs at least one answer option.");
        return false;
      }
      if (!Array.isArray(q.answer)) q.answer = [];
    }
    return true;
  }

  function testDraft() {
    const draft = collectBuilderData();
    if (!validateDraft(draft)) return;

    state.currentKey = "__draft__";
    state.currentQuizRef = draft;
    state.currentIndex = 0;
    state.score = 0;
    state.selectedOriginalIndex = null;
    state.optionMap = [];
    clearTimer();

    quizTitleEl.textContent = `${draft.title} (Test)`;
    resultBox.textContent = "";

    homePage.style.display = "none";
    builderContainer.style.display = "none";
    quizContainer.style.display = "block";

    prepareTimer();
    loadQuestion();
  }

  function burnDraft() {
    if (!state.burnUnlocked) {
      alert("Burn remains locked. Enter the admin/burn code to proceed.");
      return;
    }
    const draft = collectBuilderData();
    if (!validateDraft(draft)) return;

    state.quizzes.burned.push(draft);
    saveQuizzes();

    alert("✅ Quiz burned! It now appears on the home page.");
    builderContainer.style.display = "none";
    homePage.style.display = "block";
    renderHome();
  }

  function saveEditedQuiz() {
    if (!state.burnUnlocked) {
      alert("Burn/save remains locked. Enter the admin/burn code to proceed.");
      return;
    }
    const idx = state.builderEditIndex;
    if (idx === null || idx < 0 || idx >= state.quizzes.burned.length) {
      alert("Invalid edit index.");
      return;
    }
    const updated = collectBuilderData();
    if (!validateDraft(updated)) return;

    state.quizzes.burned[idx] = updated;
    saveQuizzes();

    alert("✅ Changes saved!");
    builderContainer.style.display = "none";
    homePage.style.display = "block";
    renderHome();
    state.builderEditIndex = null;
    burnQuizBtn.textContent = "Burn Into Code";
  }

  // ====== Filter + Achievements ======
  function renderFilterBar() {
    if (!filterBarEl) return;
    const cats = collectCategories();
    filterBarEl.innerHTML = `
      <strong>Filter:</strong>
      <select id="category-filter">
        <option>All</option>
        ${cats.map(c => `<option>${escapeHtml(c)}</option>`).join("")}
      </select>
    `;
    const sel = document.getElementById("category-filter");
    sel.value = state.filterCategory || "All";
    sel.addEventListener("change", () => {
      state.filterCategory = sel.value;
      renderHome();
    });
  }
  function collectCategories() {
    const s = new Set();
    Object.values(state.quizzes.builtIns).forEach(q => q.category && s.add(q.category));
    state.quizzes.burned.forEach(q => q.category && s.add(q.category));
    return Array.from(s);
  }

  function renderAchievements() {
    if (!achievementsEl) return;
    achievementsEl.innerHTML = "<h3>Achievements</h3>";
    if (!state.achievements.length) {
      achievementsEl.innerHTML += "<p>No achievements yet.</p>";
      return;
    }
    const ul = document.createElement("ul");
    state.achievements.forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    });
    achievementsEl.appendChild(ul);
  }

  // ====== Utilities ======
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
});
