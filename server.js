const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const express = require("express");

const app = express();
const PORT = process.env.PORT || 12345;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, "data.json");
const USERS_FILE = path.join(ROOT, "data", "users.json");
const USER_DATA_DIR = path.join(ROOT, "data", "users");

const sessions = new Map();

const DEFAULT_SUBJECTS = [
  {
    id: "science",
    name: "과학",
    items: [
      { id: "science_perf_1", kind: "performance", weight: null, maxScore: null, method: "논술형", content: "운동과 에너지의 관계 해석하기" },
      { id: "science_perf_2", kind: "performance", weight: null, maxScore: null, method: "포트폴리오", content: "포트폴리오" },
      { id: "science_exam_1", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "science_exam_2", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "korean",
    name: "국어",
    items: [
      { id: "korean_perf_1", kind: "performance", weight: 15, maxScore: null, method: "논술형", content: "주장하는 글쓰기" },
      { id: "korean_perf_2", kind: "performance", weight: 15, maxScore: null, method: "논술형", content: "독서 신문 만들기" },
      { id: "korean_exam_1", kind: "exam", weight: 35, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "korean_exam_2", kind: "exam", weight: 35, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "tech_home",
    name: "기술가정",
    items: [
      { id: "tech_home_perf_1", kind: "performance", weight: 20, maxScore: null, method: "논술형", content: "저출산·고령사회에 대해 논하기" },
      { id: "tech_home_perf_2", kind: "performance", weight: 30, maxScore: null, method: "실습형 논술", content: "나의 생애 설계 그래프 만들기" },
      { id: "tech_home_exam_2", kind: "exam", weight: 50, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "art",
    name: "미술",
    items: [
      { id: "art_perf_1", kind: "performance", weight: 40, maxScore: null, method: "실기형", content: "팜플렛 제작하기" },
      { id: "art_perf_2", kind: "performance", weight: 40, maxScore: null, method: "실기형", content: "명화 그리기" },
      { id: "art_perf_3", kind: "performance", weight: 20, maxScore: null, method: "논술형", content: "서양 미술작품 분석하기" }
    ]
  },
  {
    id: "social",
    name: "사회",
    items: [
      { id: "social_perf_1", kind: "performance", weight: 10, maxScore: null, method: "탐구활동", content: "인권 지도 만들기" },
      { id: "social_perf_2", kind: "performance", weight: 30, maxScore: null, method: "논술형", content: "기본권 갈등 논술" },
      { id: "social_exam_1", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "social_exam_2", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "math",
    name: "수학",
    items: [
      { id: "math_perf_1", kind: "performance", weight: 15, maxScore: null, method: "논술형", content: "제곱근의 연산과 실생활 문제 풀이" },
      { id: "math_perf_2", kind: "performance", weight: 15, maxScore: null, method: "논술형", content: "이차함수의 그래프 그리기" },
      { id: "math_perf_3", kind: "performance", weight: 10, maxScore: null, method: "포트폴리오", content: "포트폴리오" },
      { id: "math_exam_1", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "math_exam_2", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "history",
    name: "역사",
    items: [
      { id: "history_perf_1", kind: "performance", weight: null, maxScore: null, method: "논술형", content: "삼국 통일 의의 논술하기" },
      { id: "history_perf_2", kind: "performance", weight: null, maxScore: null, method: "논술형", content: "역사 신문 만들기" },
      { id: "history_exam_1", kind: "exam", weight: 35, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "history_exam_2", kind: "exam", weight: 35, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "english",
    name: "영어",
    items: [
      { id: "english_perf_1", kind: "performance", weight: 20, maxScore: null, method: "논술형", content: "관계 회복을 위한 행동 계획서 작성하기" },
      { id: "english_perf_2", kind: "performance", weight: 10, maxScore: null, method: "논술형", content: "관계 회목을 위한 행동 계획 말하기" },
      { id: "english_perf_3", kind: "performance", weight: 10, maxScore: null, method: "포트폴리오", content: "포트폴리오" },
      { id: "english_exam_1", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "1차 정기고사" },
      { id: "english_exam_2", kind: "exam", weight: 30, maxScore: 100, method: "정기고사", content: "2차 정기고사" }
    ]
  },
  {
    id: "music",
    name: "음악",
    items: [
      { id: "music_perf_1", kind: "performance", weight: 40, maxScore: null, method: "실기형", content: "사물 놀이 악기 연주하기" },
      { id: "music_perf_2", kind: "performance", weight: 30, maxScore: null, method: "실기형", content: "노래 부르기" },
      { id: "music_perf_3", kind: "performance", weight: 30, maxScore: null, method: "논술형", content: "서양 음악 감상문 작성하기" }
    ]
  },
  {
    id: "pe",
    name: "체육",
    items: [
      { id: "pe_perf_1", kind: "performance", weight: 20, maxScore: null, method: "실기형", content: "농구 바운드패스 하기" },
      { id: "pe_perf_2", kind: "performance", weight: 20, maxScore: null, method: "실기형", content: "농구 레이업슛하기" },
      { id: "pe_perf_3", kind: "performance", weight: 20, maxScore: null, method: "실기형", content: "왕복 오래달리기하기" },
      { id: "pe_perf_4", kind: "performance", weight: 20, maxScore: null, method: "실기형", content: "발레의 동작 및 작품발표 하기" },
      { id: "pe_perf_5", kind: "performance", weight: 20, maxScore: null, method: "논술형", content: "전통 표현 작품 비평하기" }
    ]
  }
];

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(ROOT, "public")));

function ensureDirs() {
  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
}

function atomicWriteJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(tmpPath, filePath);
}

function loadData() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = { subjects: DEFAULT_SUBJECTS };
    atomicWriteJson(DATA_FILE, initialData);
    return initialData;
  }

  const raw = fs.readFileSync(DATA_FILE, "utf8").trim();
  const data = raw ? JSON.parse(raw) : {};
  let changed = false;

  if (Object.prototype.hasOwnProperty.call(data, "users")) {
    migrateLegacyUsers(data.users);
    delete data.users;
    changed = true;
  }

  if (!Array.isArray(data.subjects) || data.subjects.length === 0) {
    data.subjects = DEFAULT_SUBJECTS;
    changed = true;
  }

  if (changed) atomicWriteJson(DATA_FILE, data);
  return data;
}

function saveData(data) {
  const safeData = data && typeof data === "object" ? { ...data } : {};
  delete safeData.users;
  atomicWriteJson(DATA_FILE, safeData);
}

function migrateLegacyUsers(legacyUsers) {
  if (!Array.isArray(legacyUsers) || legacyUsers.length === 0) return;

  const users = mergeUsers(loadUsers(), legacyUsers);
  saveUsers(users);
}

function mergeUsers(primaryUsers, secondaryUsers) {
  const merged = [];
  const seenIds = new Set();
  const seenNames = new Set();

  [...primaryUsers, ...secondaryUsers].forEach((user) => {
    if (!user || typeof user !== "object") return;

    const id = typeof user.id === "string" ? user.id.trim() : "";
    const name = typeof user.name === "string" ? user.name.trim().toLowerCase() : "";
    if ((id && seenIds.has(id)) || (name && seenNames.has(name))) return;

    if (id) seenIds.add(id);
    if (name) seenNames.add(name);
    merged.push(user);
  });

  return merged;
}

function loadUsers() {
  ensureDirs();
  if (!fs.existsSync(USERS_FILE)) return [];

  const raw = fs.readFileSync(USERS_FILE, "utf8").trim();
  if (!raw) return [];

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.users)) return parsed.users;
  return [];
}

function saveUsers(users) {
  atomicWriteJson(USERS_FILE, Array.isArray(users) ? users : []);
}

function userScoresPath(userId) {
  return path.join(USER_DATA_DIR, `${userId}.json`);
}

function loadUserScores(user) {
  const filePath = userScoresPath(user.id);
  if (!fs.existsSync(filePath)) {
    return { userId: user.id, name: user.name, scores: {}, msData: {}, updatedAt: null };
  }

  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return { userId: user.id, name: user.name, scores: {}, msData: {}, updatedAt: null };

  const parsed = JSON.parse(raw);
  return {
    userId: user.id,
    name: user.name,
    scores: parsed && typeof parsed.scores === "object" && parsed.scores ? parsed.scores : {},
    msData: parsed && typeof parsed.msData === "object" && parsed.msData ? parsed.msData : {},
    updatedAt: parsed.updatedAt || null
  };
}

function saveUserScores(user, scores) {
  const existing = loadUserScores(user);
  const payload = {
    userId: user.id,
    name: user.name,
    scores: scores && typeof scores === "object" ? scores : {},
    msData: existing.msData,
    updatedAt: new Date().toISOString()
  };
  atomicWriteJson(userScoresPath(user.id), payload);
  return payload;
}

function saveUserMsData(user, msData) {
  const existing = loadUserScores(user);
  const payload = {
    userId: user.id,
    name: user.name,
    scores: existing.scores,
    msData: msData && typeof msData === "object" ? msData : {},
    updatedAt: new Date().toISOString()
  };
  atomicWriteJson(userScoresPath(user.id), payload);
  return payload;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user.passwordHash || !user.passwordSalt) return false;
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId: user.id, createdAt: Date.now() });
  return token;
}

function parseCookies(req) {
  const header = req.headers.cookie || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function setSessionCookie(res, token) {
  res.cookie("score_session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24 * 30
  });
}

function clearSessionCookie(res) {
  res.clearCookie("score_session", { httpOnly: true, sameSite: "lax" });
}

function getSessionUser(req) {
  const data = loadData();
  const users = loadUsers();
  const token = parseCookies(req).score_session;
  const session = token ? sessions.get(token) : null;
  if (!session) return { data, user: null, token: null };

  const user = users.find((candidate) => candidate.id === session.userId);
  if (!user) {
    sessions.delete(token);
    return { data, user: null, token: null };
  }

  return { data, user, token };
}

function publicUser(user) {
  return { id: user.id, name: user.name };
}

function normalizeName(name) {
  return String(name || "").trim();
}

function normalizePassword(password) {
  return String(password || "");
}

app.get("/api/template", (req, res) => {
  const data = loadData();
  res.json({ success: true, subjects: data.subjects });
});

app.get("/api/me", (req, res) => {
  const { data, user } = getSessionUser(req);
  if (!user) return res.json({ success: false });

  const saved = loadUserScores(user);
  res.json({ success: true, user: publicUser(user), subjects: data.subjects, scores: saved.scores, msData: saved.msData });
});

app.post("/api/register", (req, res) => {
  const name = normalizeName(req.body.name || req.body.username);
  const password = normalizePassword(req.body.password);

  if (name.length < 1 || password.length < 1) {
    return res.status(400).json({ success: false, message: "이름과 비밀번호를 입력하세요." });
  }

  const data = loadData();
  const users = loadUsers();
  const existing = users.find((user) => user.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return res.status(409).json({ success: false, message: "이미 있는 이름입니다." });
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name,
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  saveUsers(users);
  saveUserScores(user, {});

  const token = createSession(user);
  setSessionCookie(res, token);

  res.json({ success: true, user: publicUser(user), subjects: data.subjects, scores: {} });
});

app.post("/api/login", (req, res) => {
  const name = normalizeName(req.body.name || req.body.username);
  const password = normalizePassword(req.body.password);
  const data = loadData();
  const users = loadUsers();
  const user = users.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());

  if (!user || !verifyPassword(password, user)) {
    return res.status(401).json({ success: false, message: "이름 또는 비밀번호가 맞지 않습니다." });
  }

  const token = createSession(user);
  setSessionCookie(res, token);

  const saved = loadUserScores(user);
  res.json({ success: true, user: publicUser(user), subjects: data.subjects, scores: saved.scores });
});

app.post("/api/save", (req, res) => {
  const { user } = getSessionUser(req);
  if (!user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });

  const saved = saveUserScores(user, req.body.scores || {});
  res.json({ success: true, updatedAt: saved.updatedAt });
});

app.get("/api/ms", (req, res) => {
  const { user } = getSessionUser(req);
  if (!user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });

  const saved = loadUserScores(user);
  res.json({ success: true, msData: saved.msData });
});

app.post("/api/ms", (req, res) => {
  const { user } = getSessionUser(req);
  if (!user) return res.status(401).json({ success: false, message: "로그인이 필요합니다." });

  const saved = saveUserMsData(user, req.body.msData || {});
  res.json({ success: true, updatedAt: saved.updatedAt });
});

app.post("/api/logout", (req, res) => {
  const { token } = getSessionUser(req);
  if (token) sessions.delete(token);
  clearSessionCookie(res);
  res.json({ success: true });
});

// Backward-compatible redirects for older buttons/scripts.
app.post("/register", (req, res, next) => {
  req.url = "/api/register";
  next();
});

app.post("/login", (req, res, next) => {
  req.url = "/api/login";
  next();
});

app.post("/save", (req, res, next) => {
  req.url = "/api/save";
  next();
});

loadData();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
