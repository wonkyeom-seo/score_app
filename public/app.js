const state = {
  user: null,
  subjects: [],
  scores: {},
  saveTimer: null,
  isDirty: false
};

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");
const authForm = document.getElementById("authForm");
const nameInput = document.getElementById("nameInput");
const passwordInput = document.getElementById("passwordInput");
const registerButton = document.getElementById("registerButton");
const logoutButton = document.getElementById("logoutButton");
const authMessage = document.getElementById("authMessage");
const currentUserName = document.getElementById("currentUserName");
const saveStatus = document.getElementById("saveStatus");
const subjectsRoot = document.getElementById("subjectsRoot");
const summaryGrid = document.getElementById("summaryGrid");
const naeshinPanel = document.getElementById("naeshinPanel");
const THREE_LEVEL_GRADE_SUBJECTS = new Set(["art", "music", "pe"]);
const GENERAL_GRADE_POINTS = { A: 5, B: 4, C: 3, D: 2, E: 1 };

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});

registerButton.addEventListener("click", register);
logoutButton.addEventListener("click", logout);

document.addEventListener("input", (event) => {
  const input = event.target.closest("[data-score-input]");
  if (!input) return;

  const value = input.value.trim();
  state.scores[input.dataset.itemId] = value === "" ? "" : Number(value);
  calculateAndRender();
  queueSave();
});

init();

async function init() {
  const result = await requestJson("/api/me");
  if (result.success) {
    enterApp(result);
    return;
  }

  showAuth();
}

async function login() {
  await authenticate("/api/login");
}

async function register() {
  await authenticate("/api/register");
}

async function authenticate(url) {
  authMessage.textContent = "";
  const name = nameInput.value.trim();
  const password = passwordInput.value;

  if (!name || !password) {
    authMessage.textContent = "이름과 비밀번호를 입력하세요.";
    return;
  }

  const result = await requestJson(url, {
    method: "POST",
    body: JSON.stringify({ name, password })
  });

  if (!result.success) {
    authMessage.textContent = result.message || "처리하지 못했습니다.";
    return;
  }

  passwordInput.value = "";
  enterApp(result);
}

async function logout() {
  if (state.saveTimer) {
    clearTimeout(state.saveTimer);
    state.saveTimer = null;
  }

  if (state.isDirty) await saveNow();
  await requestJson("/api/logout", { method: "POST" });

  state.user = null;
  state.subjects = [];
  state.scores = {};
  showAuth();
}

function enterApp(payload) {
  state.user = payload.user;
  state.subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  state.scores = payload.scores && typeof payload.scores === "object" ? payload.scores : {};
  state.isDirty = false;

  currentUserName.textContent = `${state.user.name}님`;
  authView.hidden = true;
  appView.hidden = false;
  setSaveStatus("저장됨", "saved");
  renderSubjects();
  calculateAndRender();
}

function showAuth() {
  authView.hidden = false;
  appView.hidden = true;
  authMessage.textContent = "";
  currentUserName.textContent = "";
  setSaveStatus("저장됨", "saved");
  summaryGrid.innerHTML = "";
  naeshinPanel.innerHTML = "";
  subjectsRoot.innerHTML = "";
  nameInput.focus();
}

function renderSubjects() {
  subjectsRoot.innerHTML = "";

  for (const subject of state.subjects) {
    const section = document.createElement("section");
    section.className = "subject-card";
    section.dataset.subjectId = subject.id;
    section.innerHTML = `
      <header class="subject-header">
        <div>
          <h2>${escapeHtml(subject.name)}</h2>
          <p>${subject.items.length}개 평가</p>
        </div>
        <div class="subject-score">
          <strong data-total-for="${subject.id}">0.0</strong>
          <span data-grade-for="${subject.id}">D</span>
        </div>
      </header>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>과목명</th>
              <th>반영점수</th>
              <th>만점</th>
              <th>평가 방법</th>
              <th>평가 내용</th>
              <th>받은 점수</th>
              <th>과목 점수</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    const tbody = section.querySelector("tbody");
    subject.items.forEach((item, index) => {
      const row = document.createElement("tr");
      const inputValue = state.scores[item.id] ?? "";
      const max = item.kind === "exam" ? item.maxScore : item.weight;
      row.innerHTML = `
        <td data-label="과목명">${index === 0 ? escapeHtml(subject.name) : ""}</td>
        <td data-label="반영점수">${formatWeight(item.weight)}</td>
        <td data-label="만점">${item.maxScore ?? "-"}</td>
        <td data-label="평가 방법">${escapeHtml(item.method)}</td>
        <td data-label="평가 내용">${escapeHtml(item.content)}</td>
        <td data-label="받은 점수">
          <input
            data-score-input
            data-item-id="${item.id}"
            inputmode="decimal"
            type="number"
            min="0"
            ${Number.isFinite(max) ? `max="${max}"` : ""}
            step="0.1"
            value="${escapeHtml(String(inputValue))}"
            aria-label="${escapeHtml(subject.name)} ${escapeHtml(item.content)} 받은 점수">
        </td>
        <td data-label="과목 점수">
          <span class="item-result" data-result-for="${item.id}">0.0</span>
        </td>
      `;
      tbody.appendChild(row);
    });

    subjectsRoot.appendChild(section);
  }
}

function calculateAndRender() {
  summaryGrid.innerHTML = "";
  const subjectResults = [];

  for (const subject of state.subjects) {
    const result = calculateSubject(subject);
    subjectResults.push({ subject, ...result });
    const totalNode = document.querySelector(`[data-total-for="${subject.id}"]`);
    const gradeNode = document.querySelector(`[data-grade-for="${subject.id}"]`);

    if (totalNode) totalNode.textContent = String(result.roundedTotal);
    if (gradeNode) {
      gradeNode.textContent = result.grade;
      gradeNode.className = `grade grade-${result.grade.toLowerCase()}`;
    }

    for (const itemResult of result.items) {
      const node = document.querySelector(`[data-result-for="${itemResult.id}"]`);
      if (!node) continue;
      node.textContent = itemResult.unknownWeight ? "배점 미정" : itemResult.score.toFixed(1);
      node.classList.toggle("unknown", itemResult.unknownWeight);
    }

    const summary = document.createElement("article");
    summary.className = "summary-card";
    summary.innerHTML = `
      <span>${escapeHtml(subject.name)}</span>
      <strong>${result.roundedTotal}</strong>
      <em class="grade grade-${result.grade.toLowerCase()}">${result.grade}</em>
      ${result.hasUnknownWeight ? '<small>배점 미정 있음</small>' : ""}
    `;
    summaryGrid.appendChild(summary);
  }

  renderNaeshin(subjectResults);
}

function calculateSubject(subject) {
  let total = 0;
  let hasUnknownWeight = false;
  const items = subject.items.map((item) => {
    const raw = state.scores[item.id];
    const received = raw === "" || raw == null ? 0 : Number(raw);

    if (item.weight == null) {
      hasUnknownWeight = true;
      return { id: item.id, score: 0, unknownWeight: true };
    }

    const score = item.kind === "exam"
      ? received * (Number(item.weight) / Number(item.maxScore || 100))
      : received;

    total += Number.isFinite(score) ? score : 0;
    return { id: item.id, score: Number.isFinite(score) ? score : 0, unknownWeight: false };
  });

  return {
    total,
    roundedTotal: Math.round(total),
    grade: gradeFor(subject, Math.round(total)),
    hasUnknownWeight,
    items
  };
}

function gradeFor(subject, roundedTotal) {
  if (THREE_LEVEL_GRADE_SUBJECTS.has(subject.id)) {
    if (roundedTotal >= 80) return "A";
    if (roundedTotal >= 60) return "B";
    return "C";
  }

  if (roundedTotal >= 90) return "A";
  if (roundedTotal >= 80) return "B";
  if (roundedTotal >= 70) return "C";
  if (roundedTotal >= 60) return "D";
  return "E";
}

function renderNaeshin(subjectResults) {
  const result = calculateNaeshin(subjectResults);
  const unknownText = result.unknownSubjectNames.length
    ? `<p class="naeshin-warning">배점 미정: ${escapeHtml(result.unknownSubjectNames.join(", "))}</p>`
    : "";

  naeshinPanel.innerHTML = `
    <div class="naeshin-main">
      <span>3-1 기준 가내신점수</span>
      <div>
        <strong>${formatScore(result.totalScore)}</strong>
        <em>/ 60</em>
      </div>
    </div>
    <div class="naeshin-breakdown">
      <article>
        <span>3-1 산출</span>
        <strong>${formatScore(result.generalSemesterScore)} / 30</strong>
      </article>
      <article>
        <span>2배 환산</span>
        <strong>${formatScore(result.totalScore)} / 60</strong>
      </article>
      <article>
        <span>평균 원점수</span>
        <strong>${formatScore(result.generalRawAverage, 1)}</strong>
      </article>
      <article>
        <span>평균 성취도</span>
        <strong>${formatScore(result.generalAchievementAverage, 2)}</strong>
      </article>
    </div>
    <div class="naeshin-meta">
      <span>일반교과만 반영</span>
      <span>미술·음악·체육 제외</span>
      <span>미입력 0점 처리</span>
    </div>
    ${unknownText}
  `;
}

function calculateNaeshin(subjectResults) {
  const generalSubjects = subjectResults.filter(({ subject }) => !THREE_LEVEL_GRADE_SUBJECTS.has(subject.id));
  const generalCount = generalSubjects.length;

  const generalRawAverage = generalCount
    ? generalSubjects.reduce((sum, item) => sum + item.roundedTotal, 0) / generalCount
    : 0;
  const generalAchievementAverage = generalCount
    ? generalSubjects.reduce((sum, item) => sum + (GENERAL_GRADE_POINTS[item.grade] || 0), 0) / generalCount
    : 0;
  const generalSemesterScore = generalCount
    ? round3(10 + generalAchievementAverage * 2 + generalRawAverage * 0.1)
    : 0;
  const totalScore = round3(generalSemesterScore * 2);
  const unknownSubjectNames = generalSubjects
    .filter((item) => item.hasUnknownWeight)
    .map((item) => item.subject.name);

  return {
    totalScore,
    generalSemesterScore,
    generalRawAverage,
    generalAchievementAverage,
    unknownSubjectNames
  };
}

function round3(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function formatScore(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
}

function queueSave() {
  state.isDirty = true;
  setSaveStatus("저장 대기", "pending");
  if (state.saveTimer) clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(saveNow, 500);
}

async function saveNow() {
  if (!state.user) return;

  setSaveStatus("저장 중", "saving");
  const result = await requestJson("/api/save", {
    method: "POST",
    body: JSON.stringify({ scores: state.scores })
  });

  if (result.success) {
    state.isDirty = false;
    setSaveStatus("저장됨", "saved");
    return;
  }

  setSaveStatus("저장 실패", "error");
}

function setSaveStatus(text, status) {
  saveStatus.textContent = text;
  saveStatus.dataset.status = status;
}

async function requestJson(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      credentials: "same-origin",
      ...options
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? data : { success: false, ...data };
  } catch (error) {
    return { success: false, message: "서버에 연결할 수 없습니다." };
  }
}

function formatWeight(weight) {
  return weight == null ? '<span class="unknown">미정</span>' : weight;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
