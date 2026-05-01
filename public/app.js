const MS_SUBJECTS = [
  "국어",
  "도덕",
  "사회",
  "역사",
  "수학",
  "과학",
  "기술·가정",
  "영어",
  "중국어",
  "체육",
  "미술",
  "음악"
];

const MS_ART_SUBJECTS = ["체육", "미술", "음악"];
const MS_THIRD_SEMESTER_TOGGLE_ID = "useThirdGradeSecondSemester";
const MS_THIRD_SEMESTER_KEY = "3_2";
const MS_SEMESTERS = [
  { key: "1_2", label: "1학년 2학기", base: 4, achWeight: 0.8, rawWeight: 0.04, maxScore: 12 },
  { key: "2_1", label: "2학년 1학기", base: 8, achWeight: 1.6, rawWeight: 0.08, maxScore: 24 },
  { key: "2_2", label: "2학년 2학기", base: 8, achWeight: 1.6, rawWeight: 0.08, maxScore: 24 },
  { key: "3_1", label: "3학년 1학기", base: 10, achWeight: 2, rawWeight: 0.1, maxScore: 30 },
  { key: "3_2", label: "3학년 2학기", base: 10, achWeight: 2, rawWeight: 0.1, maxScore: 30 }
];

const state = {
  user: null,
  subjects: [],
  scores: {},
  saveTimer: null,
  msData: createDefaultMsData(),
  msSaveTimer: null,
  isDirty: false,
  isMsDirty: false
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
const tabButtons = document.querySelectorAll("[data-tab-target]");
const tabPanels = document.querySelectorAll(".tab-panel");
const msForm = document.getElementById("msForm");
const msResult = document.getElementById("msResult");
const THREE_LEVEL_GRADE_SUBJECTS = new Set(["art", "music", "pe"]);

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  login();
});

registerButton.addEventListener("click", register);
logoutButton.addEventListener("click", logout);

tabButtons.forEach((button) => {
  button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
});

document.addEventListener("input", (event) => {
  const scoreInput = event.target.closest("[data-score-input]");
  if (scoreInput) {
    const value = scoreInput.value.trim();
    state.scores[scoreInput.dataset.itemId] = value === "" ? "" : Number(value);
    calculateAndRender();
    queueSave();
    return;
  }

  if (event.target.closest("[data-ms-raw], #extraInputs input")) {
    handleMsChange();
  }
});

document.addEventListener("change", (event) => {
  if (event.target.closest("[data-ms-grade]") || event.target.id === MS_THIRD_SEMESTER_TOGGLE_ID) {
    handleMsChange();
  }
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
  if (state.msSaveTimer) {
    clearTimeout(state.msSaveTimer);
    state.msSaveTimer = null;
  }

  if (state.isDirty) await saveNow();
  if (state.isMsDirty) await saveMsNow();
  await requestJson("/api/logout", { method: "POST" });

  state.user = null;
  state.subjects = [];
  state.scores = {};
  state.msData = createDefaultMsData();
  showAuth();
}

function enterApp(payload) {
  state.user = payload.user;
  state.subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  state.scores = payload.scores && typeof payload.scores === "object" ? payload.scores : {};
  state.msData = normalizeMsData(payload.msData || {});
  state.isDirty = false;
  state.isMsDirty = false;

  currentUserName.textContent = `${state.user.name}님`;
  authView.hidden = true;
  appView.hidden = false;
  setSaveStatus("저장됨", "saved");
  activateTab("grade31Panel");
  renderSubjects();
  calculateAndRender();
  buildMsForm();
  populateMsForm();
  renderMsCalculation();
}

function showAuth() {
  authView.hidden = false;
  appView.hidden = true;
  authMessage.textContent = "";
  currentUserName.textContent = "";
  setSaveStatus("저장됨", "saved");
  summaryGrid.innerHTML = "";
  subjectsRoot.innerHTML = "";
  msForm.innerHTML = "";
  msResult.innerHTML = "";
  nameInput.focus();
}

function activateTab(targetId) {
  tabButtons.forEach((button) => {
    const active = button.dataset.tabTarget === targetId;
    button.classList.toggle("is-active", active);
    button.classList.toggle("secondary", !active);
  });

  tabPanels.forEach((panel) => {
    panel.hidden = panel.id !== targetId;
  });
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

  for (const subject of state.subjects) {
    const result = calculateSubject(subject);
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

function buildMsForm() {
  msForm.innerHTML = "";

  MS_SEMESTERS.forEach((sem, semIndex) => {
    const details = document.createElement("details");
    details.className = "semester-card";
    details.id = `semester_${sem.key}`;
    details.dataset.semKey = sem.key;
    details.open = semIndex === 0;

    details.innerHTML = `
      <summary>
        <span>${escapeHtml(sem.label)}</span>
        <em>
          <span data-ms-sem-count="${sem.key}">0개 입력</span>
          <span data-ms-sem-score="${sem.key}">${formatScore(sem.base)}점</span>
        </em>
      </summary>
      <div class="semester-subject-list"></div>
    `;

    const list = details.querySelector(".semester-subject-list");
    MS_SUBJECTS.forEach((subject, subjectIndex) => {
      const isArtSubject = MS_ART_SUBJECTS.includes(subject);
      const gradeOptions = isArtSubject
        ? ["", "A", "B", "C", "@"]
        : ["", "A", "B", "C", "D", "E", "@"];
      const row = document.createElement("article");
      row.className = "ms-subject-row";
      row.innerHTML = `
        <strong>${escapeHtml(subject)}</strong>
        <label>
          <span>${isArtSubject ? "원점수 미반영" : "원점수"}</span>
          <input
            id="${msFieldId("raw", sem.key, subjectIndex)}"
            ${isArtSubject ? "disabled" : "data-ms-raw"}
            type="number"
            min="0"
            max="100"
            step="0.1"
            inputmode="decimal"
            placeholder="${isArtSubject ? "미반영" : "0~100"}"
            aria-label="${escapeHtml(sem.label)} ${escapeHtml(subject)} 원점수">
        </label>
        <label>
          <span>성취도</span>
          <select
            id="${msFieldId("grade", sem.key, subjectIndex)}"
            data-ms-grade
            aria-label="${escapeHtml(sem.label)} ${escapeHtml(subject)} 성취도">
            ${gradeOptions.map((grade) => {
              const label = grade === "" ? (isArtSubject ? "선택" : "자동") : (grade === "@" ? "@ 제외" : grade);
              return `<option value="${grade}">${label}</option>`;
            }).join("")}
          </select>
        </label>
      `;
      list.appendChild(row);
    });

    msForm.appendChild(details);
  });

  updateThirdSemesterVisibility();
}

function populateMsForm() {
  const toggle = document.getElementById(MS_THIRD_SEMESTER_TOGGLE_ID);
  if (toggle) toggle.checked = Boolean(state.msData.useThirdGradeSecondSemester);

  MS_SEMESTERS.forEach((sem) => {
    const semData = state.msData.grades[sem.key] || {};
    MS_SUBJECTS.forEach((subject, subjectIndex) => {
      const row = semData[subject] || {};
      const rawInput = document.getElementById(msFieldId("raw", sem.key, subjectIndex));
      const gradeSelect = document.getElementById(msFieldId("grade", sem.key, subjectIndex));
      const isArtSubject = MS_ART_SUBJECTS.includes(subject);

      if (rawInput) rawInput.value = !isArtSubject && typeof row.raw === "number" ? String(row.raw) : "";
      if (gradeSelect) gradeSelect.value = row.grade || "";
    });
  });

  [1, 2, 3].forEach((year) => {
    const attendance = state.msData.attendance[year] || {};
    setInputValue(`tardy${year}`, attendance.tardy);
    setInputValue(`absent${year}`, attendance.absent);
  });

  setInputValue("volunteerHours", state.msData.volunteerHours);
  setInputValue("awards", state.msData.awards);
  setInputValue("councilMonths", state.msData.councilMonths);
  updateThirdSemesterVisibility();
}

function handleMsChange() {
  if (!state.user) return;

  state.msData = collectMsFormData();
  renderMsCalculation();
  queueMsSave();
}

function collectMsFormData() {
  const grades = {};

  MS_SEMESTERS.forEach((sem) => {
    const semObj = {};
    MS_SUBJECTS.forEach((subject, subjectIndex) => {
      const isArtSubject = MS_ART_SUBJECTS.includes(subject);
      const rawInput = document.getElementById(msFieldId("raw", sem.key, subjectIndex));
      const gradeSelect = document.getElementById(msFieldId("grade", sem.key, subjectIndex));
      const rawValue = rawInput ? rawInput.value.trim() : "";
      const parsedRaw = rawValue === "" ? null : Number(rawValue);

      semObj[subject] = {
        raw: !isArtSubject && Number.isFinite(parsedRaw) ? parsedRaw : null,
        grade: gradeSelect ? gradeSelect.value.trim().toUpperCase() : ""
      };
    });
    grades[sem.key] = semObj;
  });

  const attendance = {};
  [1, 2, 3].forEach((year) => {
    attendance[year] = {
      tardy: parseNumberInput(`tardy${year}`),
      absent: parseNumberInput(`absent${year}`)
    };
  });

  return {
    grades,
    attendance,
    volunteerHours: parseNumberInput("volunteerHours"),
    awards: parseNumberInput("awards"),
    councilMonths: parseNumberInput("councilMonths"),
    useThirdGradeSecondSemester: Boolean(document.getElementById(MS_THIRD_SEMESTER_TOGGLE_ID)?.checked)
  };
}

function renderMsCalculation() {
  updateThirdSemesterVisibility();
  const result = calculateMsTotal(state.msData);
  renderMsResult(result);
  updateMsSemesterSummaries(result);
}

function renderMsResult(result) {
  const thirdSemesterNote = result.useThirdGradeSecondSemester
    ? "3-1, 3-2를 각각 반영"
    : "3-2는 3-1 성적으로 대체";

  msResult.innerHTML = `
    <div class="ms-result-main">
      <div>
        <span>전체 가내신 총점</span>
        <strong>${formatScore(result.total)}</strong>
        <em>/ 200</em>
      </div>
      <p>감점 ${formatScore(result.minus)}점 · ${thirdSemesterNote}</p>
    </div>
    <div class="ms-result-grid">
      <article><span>1-2 일반교과</span><strong>${formatScore(result.semesterScores["1_2"])} / 12</strong></article>
      <article><span>2-1 일반교과</span><strong>${formatScore(result.semesterScores["2_1"])} / 24</strong></article>
      <article><span>2-2 일반교과</span><strong>${formatScore(result.semesterScores["2_2"])} / 24</strong></article>
      <article><span>3-1 일반교과</span><strong>${formatScore(result.semesterScores["3_1"])} / 30</strong></article>
      <article><span>3-2 일반교과</span><strong>${formatScore(result.semesterScores["3_2"])} / 30</strong></article>
      <article><span>체육·예술</span><strong>${formatScore(result.artScore)} / 30</strong></article>
      <article><span>출결</span><strong>${formatScore(result.attendanceScore)} / 20</strong></article>
      <article><span>봉사</span><strong>${formatScore(result.volunteerScore)} / 20</strong></article>
      <article><span>학교활동</span><strong>${formatScore(result.schoolActivityScore)} / 10</strong></article>
    </div>
  `;
}

function updateMsSemesterSummaries(result) {
  const effectiveGrades = buildEffectiveGrades(
    state.msData.grades,
    state.msData.useThirdGradeSecondSemester
  );

  MS_SEMESTERS.forEach((sem) => {
    const countNode = document.querySelector(`[data-ms-sem-count="${sem.key}"]`);
    const scoreNode = document.querySelector(`[data-ms-sem-score="${sem.key}"]`);
    const inputCount = countSemesterInputs(effectiveGrades[sem.key]);

    if (countNode) countNode.textContent = `${inputCount}개 입력`;
    if (scoreNode) scoreNode.textContent = `${formatScore(result.semesterScores[sem.key])}점`;
  });
}

function updateThirdSemesterVisibility() {
  const enabled = Boolean(document.getElementById(MS_THIRD_SEMESTER_TOGGLE_ID)?.checked);
  const section = document.getElementById(`semester_${MS_THIRD_SEMESTER_KEY}`);
  if (section) section.hidden = !enabled;

  const stateNode = document.getElementById("thirdSemesterState");
  if (stateNode) stateNode.textContent = enabled ? "O" : "X";

  const helper = document.getElementById("thirdSemesterHelper");
  if (helper) {
    helper.textContent = enabled
      ? "O면 3학년 1학기와 2학기를 각각 반영합니다."
      : "X면 3학년 2학기를 숨기고 1학기 성적으로 3학년 전체를 계산합니다.";
  }
}

function calculateMsTotal(data) {
  const {
    grades,
    attendance,
    volunteerHours,
    awards,
    councilMonths,
    useThirdGradeSecondSemester
  } = normalizeMsData(data);

  const effectiveGrades = buildEffectiveGrades(grades, useThirdGradeSecondSemester);
  const semesterScores = {};
  let gradeSum = 0;

  MS_SEMESTERS.forEach((sem) => {
    const score = calculateSemesterScore(
      effectiveGrades[sem.key],
      sem.base,
      sem.achWeight,
      sem.rawWeight
    );
    semesterScores[sem.key] = score;
    gradeSum += score;
  });

  const artScore = calculateArtScore(effectiveGrades);
  const attendanceScore = calculateAttendanceScore(attendance);
  const volunteerScore = calculateVolunteerScore(volunteerHours);
  const schoolActivityScore = calculateSchoolActivityScore(awards, councilMonths);
  const total = round3(gradeSum + artScore + attendanceScore + volunteerScore + schoolActivityScore);

  let minus = 0;

  MS_SEMESTERS.forEach((sem) => {
    if (semesterHasData(effectiveGrades[sem.key])) {
      const diff = sem.maxScore - semesterScores[sem.key];
      if (diff > 0) minus += diff;
    }
  });

  if (MS_SEMESTERS.some((sem) => semesterHasData(effectiveGrades[sem.key], true))) {
    const diffArt = 30 - artScore;
    if (diffArt > 0) minus += diffArt;
  }

  const diffAttendance = 20 - attendanceScore;
  if (diffAttendance > 0) minus += diffAttendance;

  const diffVolunteer = 20 - volunteerScore;
  if (diffVolunteer > 0) minus += diffVolunteer;

  const diffSchool = 10 - schoolActivityScore;
  if (diffSchool > 0) minus += diffSchool;

  return {
    semesterScores,
    artScore,
    attendanceScore,
    volunteerScore,
    schoolActivityScore,
    total,
    minus: round3(minus),
    useThirdGradeSecondSemester
  };
}

function calculateSemesterScore(semData = {}, base, achWeight, rawWeight) {
  let sumAch = 0;
  let sumRaw = 0;
  let count = 0;

  MS_SUBJECTS.forEach((subject) => {
    if (MS_ART_SUBJECTS.includes(subject)) return;

    const info = semData[subject] || {};
    if (isExcludedSubject(info)) return;

    const raw = rawToNumber(info.raw);
    if (raw === null) return;

    const gradePoint = gradeToPoint(resolveGeneralGrade(raw, info.grade));

    if (gradePoint > 0) sumAch += gradePoint;
    sumRaw += raw;
    count += 1;
  });

  if (count === 0) return base;

  const avgAch = sumAch / count;
  const avgRaw = sumRaw / count;
  return round3(base + avgAch * achWeight + avgRaw * rawWeight);
}

function calculateArtScore(gradesData) {
  let aCount = 0;
  let bCount = 0;
  let cCount = 0;
  let subjectCount = 0;

  MS_SEMESTERS.forEach((sem) => {
    const semData = gradesData[sem.key] || {};
    MS_ART_SUBJECTS.forEach((subject) => {
      const info = semData[subject] || {};
      if (isExcludedSubject(info)) return;

      const grade = (info.grade || "").trim().toUpperCase();
      if (grade === "A" || grade === "B" || grade === "C") {
        subjectCount += 1;
        if (grade === "A") aCount += 1;
        else if (grade === "B") bCount += 1;
        else cCount += 1;
      }
    });
  });

  if (subjectCount === 0) return 16.667;

  const weightedSum = 3 * aCount + 2 * bCount + cCount;
  return round3(10 + 20 * (weightedSum / (3 * subjectCount)));
}

function calculateAttendanceScore(attendance) {
  let total = 0;

  [1, 2, 3].forEach((year) => {
    const { tardy = 0, absent = 0 } = attendance[year] || {};
    const tardyCount = Math.max(0, Math.floor(tardy || 0));
    const absentDays = Math.max(0, Math.floor(absent || 0));
    const extraAbs = Math.floor(tardyCount / 3);
    const totalAbs = absentDays + extraAbs;
    const ratio = totalAbs >= 6 ? 0.4 : [1.0, 0.9, 0.8, 0.7, 0.6, 0.5][totalAbs] ?? 0.4;

    total += (year === 1 ? 6 : 7) * ratio;
  });

  return round3(total);
}

function calculateVolunteerScore(hours) {
  const recognizedHours = Math.max(0, Math.floor(hours || 0));
  if (recognizedHours >= 15) return 20;
  if (recognizedHours <= 7) return 12;
  return 12 + (recognizedHours - 7);
}

function calculateSchoolActivityScore(awards, months) {
  const awardCount = Math.max(0, Math.floor(awards || 0));
  const monthCount = Math.max(0, Math.floor(months || 0));
  return round3(8 + Math.min(awardCount * 0.5 + monthCount * 0.1, 2));
}

function semesterHasData(semData = {}, isArtSemester = false) {
  return MS_SUBJECTS.some((subject) => {
    if (!isArtSemester && MS_ART_SUBJECTS.includes(subject)) return false;

    const info = semData[subject] || {};
    if (isExcludedSubject(info)) return false;

    const raw = rawToNumber(info.raw);
    const grade = isArtSemester
      ? (info.grade || "").trim().toUpperCase()
      : resolveGeneralGrade(raw, info.grade);

    return isArtSemester
      ? grade === "A" || grade === "B" || grade === "C"
      : raw !== null;
  });
}

function countSemesterInputs(semData = {}) {
  return MS_SUBJECTS.filter((subject) => {
    const info = semData[subject] || {};
    if (isExcludedSubject(info)) return false;

    const raw = rawToNumber(info.raw);
    const grade = (info.grade || "").trim();
    return MS_ART_SUBJECTS.includes(subject)
      ? grade === "A" || grade === "B" || grade === "C"
      : raw !== null;
  }).length;
}

function buildEffectiveGrades(grades = {}, useThirdGradeSecondSemester = false) {
  const effectiveGrades = {};
  MS_SEMESTERS.forEach((sem) => {
    effectiveGrades[sem.key] = cloneSemesterData(grades[sem.key]);
  });

  if (!useThirdGradeSecondSemester) {
    effectiveGrades[MS_THIRD_SEMESTER_KEY] = cloneSemesterData(grades["3_1"]);
  }

  return effectiveGrades;
}

function cloneSemesterData(semData = {}) {
  const cloned = {};
  MS_SUBJECTS.forEach((subject) => {
    const row = semData[subject] || {};
    cloned[subject] = {
      raw: row.raw ?? null,
      grade: row.grade ?? ""
    };
  });
  return cloned;
}

function createDefaultMsData() {
  const grades = {};
  MS_SEMESTERS.forEach((sem) => {
    grades[sem.key] = cloneSemesterData();
  });

  return {
    grades,
    attendance: {
      1: { tardy: 0, absent: 0 },
      2: { tardy: 0, absent: 0 },
      3: { tardy: 0, absent: 0 }
    },
    volunteerHours: 0,
    awards: 0,
    councilMonths: 0,
    useThirdGradeSecondSemester: false
  };
}

function normalizeMsData(data = {}) {
  const defaults = createDefaultMsData();
  const source = data && typeof data === "object" ? data : {};

  MS_SEMESTERS.forEach((sem) => {
    const semData = source.grades?.[sem.key] || {};
    MS_SUBJECTS.forEach((subject) => {
      const row = semData[subject] || {};
      const excludedByRaw = row.raw === "@";
      defaults.grades[sem.key][subject] = {
        raw: typeof row.raw === "number" && Number.isFinite(row.raw) ? row.raw : null,
        grade: excludedByRaw ? "@" : (typeof row.grade === "string" ? row.grade.trim().toUpperCase() : "")
      };
    });
  });

  [1, 2, 3].forEach((year) => {
    defaults.attendance[year] = {
      tardy: toSafeNumber(source.attendance?.[year]?.tardy),
      absent: toSafeNumber(source.attendance?.[year]?.absent)
    };
  });

  defaults.volunteerHours = toSafeNumber(source.volunteerHours);
  defaults.awards = toSafeNumber(source.awards);
  defaults.councilMonths = toSafeNumber(source.councilMonths);
  defaults.useThirdGradeSecondSemester = Boolean(source.useThirdGradeSecondSemester);
  return defaults;
}

function isExcludedSubject(info = {}) {
  return info.raw === "@" || (info.grade || "").trim() === "@";
}

function rawToNumber(raw) {
  if (typeof raw !== "number") return null;
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : null;
}

function inferGradeFromRaw(raw) {
  const numericRaw = rawToNumber(raw);
  if (numericRaw === null) return "";
  if (numericRaw >= 90) return "A";
  if (numericRaw >= 80) return "B";
  if (numericRaw >= 70) return "C";
  if (numericRaw >= 60) return "D";
  return "E";
}

function resolveGeneralGrade(raw, grade) {
  const normalizedGrade = (grade || "").trim().toUpperCase();
  if (normalizedGrade) return normalizedGrade === "@" ? "" : normalizedGrade;
  return inferGradeFromRaw(raw);
}

function gradeToPoint(grade) {
  switch ((grade || "").toUpperCase()) {
    case "A": return 5;
    case "B": return 4;
    case "C": return 3;
    case "D": return 2;
    case "E": return 1;
    default: return 0;
  }
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
    setSaveStatus(state.isMsDirty ? "저장 대기" : "저장됨", state.isMsDirty ? "pending" : "saved");
    return;
  }

  setSaveStatus("저장 실패", "error");
}

function queueMsSave() {
  state.isMsDirty = true;
  setSaveStatus("저장 대기", "pending");
  if (state.msSaveTimer) clearTimeout(state.msSaveTimer);
  state.msSaveTimer = setTimeout(saveMsNow, 500);
}

async function saveMsNow() {
  if (!state.user) return;

  setSaveStatus("저장 중", "saving");
  const result = await requestJson("/api/ms", {
    method: "POST",
    body: JSON.stringify({ msData: state.msData })
  });

  if (result.success) {
    state.isMsDirty = false;
    setSaveStatus(state.isDirty ? "저장 대기" : "저장됨", state.isDirty ? "pending" : "saved");
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

function msFieldId(kind, semKey, subjectIndex) {
  return `ms_${kind}_${semKey}_${subjectIndex}`;
}

function parseNumberInput(id) {
  const value = document.getElementById(id)?.value.trim() ?? "";
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (!input) return;
  input.value = Number.isFinite(Number(value)) ? String(value) : "0";
}

function toSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round3(value) {
  return Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;
}

function formatScore(value, digits = 3) {
  return Number.isFinite(value) ? value.toFixed(digits) : "0.000";
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
