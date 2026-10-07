var _ssInstance = null;
function getSS() {
  if (!_ssInstance) {
    _ssInstance = SpreadsheetApp.getActiveSpreadsheet();
  }
  return _ssInstance;
}

function getDataVersion() {
  return CacheService.getScriptCache().get("data_version") || "1";
}

function bumpDataVersion(sheetType) {
  var v = String(Date.now());
  var cache = CacheService.getScriptCache();
  cache.put("data_version", v, 21600);
  if (sheetType) {
    cache.put("last_changed_sheet", String(sheetType), 21600);
  }
  return v;
}

var BACKEND_VERSION = "2026-10-07";

/* ================================================================== */
/* ขั้นตอนครั้งแรก: อนุญาตให้สคริปต์ใช้ Google Drive                   */
/* 0. Project Settings (รูปเฟือง) → Script Properties → Add property   */
/*    ชื่อ DRIVE_ROOT_ID ค่า = ลิงก์หรือ ID ของโฟลเดอร์ Drive ที่เก็บไฟล์  */
/* 1. เลือกฟังก์ชัน setupDrive ในแถบด้านบน แล้วกด Run                  */
/* 2. Google จะขอสิทธิ์ → Review permissions → เลือกบัญชี → Allow       */
/*    (ถ้าขึ้น "Google hasn't verified this app" ให้กด Advanced →        */
/*     Go to ... (unsafe) เพราะเป็นสคริปต์ของเราเอง)                     */
/* 3. ดูผลใน Execution log ว่าขึ้น "พร้อมใช้งาน"                         */
/* 4. Deploy → Manage deployments → ดินสอ → New version → Deploy          */
/* ================================================================== */
function setupDrive() {
  CacheService.getScriptCache().remove("drive_status");
  // Forget cached folder ids, in case the shared folder became reachable
  CacheService.getScriptCache().removeAll(Object.keys(DRIVE_FOLDERS).map(function(k) { return "fld_" + k; }));
  var root = driveRoot();
  var head = root.fallback
    ? "⚠ เปิดโฟลเดอร์ที่กำหนดไม่ได้ (" + root.reason + ")\n" +
      (driveRootId()
        ? "  บัญชี " + Session.getEffectiveUser().getEmail() + " ต้องมีสิทธิ์ Editor ในโฟลเดอร์ https://drive.google.com/drive/folders/" + driveRootId() + "\n"
        : "  ไปที่ Project Settings (รูปเฟือง) → Script Properties → Add script property: DRIVE_ROOT_ID = ลิงก์หรือ ID ของโฟลเดอร์\n") +
      "  ระหว่างนี้ไฟล์จะถูกเก็บที่ " + root.folder.getUrl() + " แทน"
    : "✓ โฟลเดอร์หลัก: " + root.folder.getName();
  var lines = Object.keys(DRIVE_FOLDERS).map(function(k) {
    var folder = driveFolder(k);
    // Create and remove a small test file so every Drive permission the site needs is granted now
    var test = folder.createFile(Utilities.newBlob("WISE test", "text/plain", "wise-permission-test.txt"));
    shareByLink(test);
    test.setTrashed(true);
    return "พร้อมใช้งาน · " + DRIVE_FOLDERS[k] + " · " + folder.getUrl();
  });
  lines.unshift(head);
  Logger.log(lines.join("\n"));
  return lines;
}

// ระยะเวลาที่ช่อง "อาจารย์นิเทศ" ถูกล็อกไว้ให้ผู้กรอก (ต่ออายุอัตโนมัติด้วย heartbeat จากหน้าเว็บ)
var LOCK_TTL_MS = 45 * 1000;
var LOCK_CACHE_KEY = "supervisor_locks";

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) { obj[header] = row[i]; });
    return obj;
  });
}

/* ------------------------------------------------------------------ */
/* Supervisor field locks (stored in CacheService, auto-expire)        */
/* ------------------------------------------------------------------ */

function readLocks() {
  var raw = CacheService.getScriptCache().get(LOCK_CACHE_KEY);
  var locks = raw ? JSON.parse(raw) : {};
  var now = Date.now();
  Object.keys(locks).forEach(function(id) {
    if (!locks[id] || locks[id].until < now) delete locks[id];
  });
  return locks;
}

function writeLocks(locks) {
  // cache max lifetime 6 hours; individual entries carry their own expiry
  CacheService.getScriptCache().put(LOCK_CACHE_KEY, JSON.stringify(locks), 21600);
}

function withScriptLock(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function handleLock(params) {
  var id = String(params.id || "");
  var clientId = String(params.clientId || "");
  if (!id || !clientId) return { status: "error", message: "missing id/clientId" };

  return withScriptLock(function() {
    var locks = readLocks();
    var current = locks[id];
    if (params.action === "release") {
      if (current && current.by === clientId) {
        delete locks[id];
        writeLocks(locks);
      }
      return { status: "success" };
    }
    // acquire / heartbeat
    if (current && current.by !== clientId) {
      return { status: "locked", lock: current };
    }
    locks[id] = { by: clientId, name: String(params.name || ""), until: Date.now() + LOCK_TTL_MS };
    writeLocks(locks);
    return { status: "success", until: locks[id].until };
  });
}

function handleSupervisorSave(params) {
  var id = String(params.id || "");
  var clientId = String(params.clientId || "");
  return withScriptLock(function() {
    var locks = readLocks();
    if (locks[id] && locks[id].by !== clientId) {
      return { status: "locked", lock: locks[id] };
    }

    var sheet = getSS().getSheetByName("StudentStatuses") || getSS().getSheetByName("studentStatuses");
    if (!sheet) return { status: "error", message: "Sheet not found" };
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (headers.indexOf("supervisor") === -1) {
      sheet.getRange(1, headers.length + 1).setValue("supervisor");
      headers.push("supervisor");
    }
    var idCol = headers.indexOf("id");
    var sidCol = headers.indexOf("studentId");
    var supCol = headers.indexOf("supervisor");
    var updCol = headers.indexOf("lastUpdated");

    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (idCol !== -1 && String(data[i][idCol]).trim() === id) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1 && params.studentId && sidCol !== -1) {
      for (var j = 1; j < data.length; j++) {
        if (String(data[j][sidCol]).trim() === String(params.studentId).trim()) { rowIndex = j + 1; break; }
      }
    }
    if (rowIndex === -1) return { status: "error", message: "Row not found" };

    var now = Date.now();
    sheet.getRange(rowIndex, supCol + 1).setValue(String(params.supervisor || ""));
    if (updCol !== -1) sheet.getRange(rowIndex, updCol + 1).setValue(now);

    if (locks[id]) {
      delete locks[id];
      writeLocks(locks);
    }
    invalidateSheetCache("studentStatuses");
    var v = bumpDataVersion("studentStatuses");
    if (params.studentId) {
      invalidateStudentCheck(params.studentId);
      invalidateStudentBundle(params.studentId);
    }
    return { status: "success", lastUpdated: now, version: v };
  });
}

function handleLive(params) {
  var cache = CacheService.getScriptCache();
  var currentVersion = getDataVersion();
  var clientVersion = (params && params.v) ? String(params.v).trim() : "";
  var locks = readLocks();

  if (clientVersion && clientVersion === currentVersion) {
    return {
      status: "success",
      serverTime: Date.now(),
      version: currentVersion,
      unchanged: true,
      locks: locks
    };
  }

  var statuses = getCachedSheet("studentStatuses", "StudentStatuses");
  var changedSheet = cache.get("last_changed_sheet") || "studentStatuses";
  return {
    status: "success",
    serverTime: Date.now(),
    version: currentVersion,
    unchanged: false,
    changedSheet: changedSheet,
    studentStatuses: statuses,
    rows: statuses.map(function(r) {
      return { id: r.id, studentId: r.studentId, supervisor: r.supervisor || "", lastUpdated: r.lastUpdated };
    }),
    locks: locks
  };
}

/* ------------------------------------------------------------------ */
/* Site settings (logo / favicon / title) - key/value sheet           */
/* ------------------------------------------------------------------ */

function handleSettingsSave(params) {
  var sheet = getSS().getSheetByName("Settings");
  if (!sheet) sheet = getSS().insertSheet("Settings");
  sheet.clearContents();
  sheet.appendRow(["key", "value"]);
  var items = params.data || [];
  if (items.length > 0) {
    var values = items.map(function(it) { return [String(it.key), String(it.value || "")]; });
    sheet.getRange(2, 1, values.length, 2).setValues(values);
  }
  invalidateSheetCache("settings");
  var v = bumpDataVersion("settings");
  return { status: "success", version: v };
}

/* ------------------------------------------------------------------ */
/* Translation (Google's built-in LanguageApp: free, no API key)       */
/* ------------------------------------------------------------------ */

var TRANSLATE_LANGS = ["th", "en", "ar", "ms"];

// params.items = { key: "text", ... }, params.source = "th" (default)
// returns { status, data: { key: { th, en, ar, ms } } }
function handleTranslate(params) {
  var items = params.items || {};
  var source = TRANSLATE_LANGS.indexOf(params.source) >= 0 ? params.source : "th";
  var cache = CacheService.getScriptCache();
  var out = {};
  Object.keys(items).forEach(function(key) {
    var text = String(items[key] == null ? "" : items[key]).trim();
    var result = { th: "", en: "", ar: "", ms: "" };
    result[source] = text;
    TRANSLATE_LANGS.forEach(function(lang) {
      if (lang === source || !text) { result[lang] = text; return; }
      var cacheKey = "tr_" + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, source + ">" + lang + ":" + text, Utilities.Charset.UTF_8));
      var hit = cache.get(cacheKey);
      if (hit !== null) { result[lang] = hit; return; }
      try {
        result[lang] = LanguageApp.translate(text, source, lang);
        cache.put(cacheKey, result[lang], 21600);
      } catch (err) {
        result[lang] = text;
      }
    });
    out[key] = result;
  });
  return { status: "success", data: out };
}

/* ------------------------------------------------------------------ */
/* PDF upload to Google Drive (documents centre)                       */
/* ------------------------------------------------------------------ */

var UPLOAD_MAX_BYTES = 20 * 1024 * 1024;

// All uploads live in this Drive folder, one sub-folder per kind of file
var DRIVE_ROOT_ID = "1Tmz9c0uTuXyR2Qq6Z0UZF2Km23nQ5kpr";

function driveRootId() {
  var v = String(PropertiesService.getScriptProperties().getProperty("DRIVE_ROOT_ID") || DRIVE_ROOT_ID || "").trim();
  var m = /folders\/([\w-]+)/.exec(v);
  return m ? m[1] : v;
}
var DRIVE_FOLDERS = {
  documents: "เอกสารดาวน์โหลด",
  photos: "รูปภาพนักศึกษา"
};

// The shared WISE folder; if the script owner cannot open it, a "WISE uploads" folder in the
// owner's own Drive is used instead so uploads still work (the admin page says which one is in use)
function driveRoot() {
  try {
    if (!driveRootId()) throw new Error("ยังไม่ได้ตั้ง DRIVE_ROOT_ID ใน Script Properties");
    return { folder: DriveApp.getFolderById(driveRootId()), fallback: false };
  } catch (err) {
    if (/permission.*DriveApp|auth\/drive/i.test(String(err && err.message || err))) throw err; // Drive not authorised yet
    var props = PropertiesService.getScriptProperties();
    var id = props.getProperty("WISE_FALLBACK_ROOT");
    if (id) { try { return { folder: DriveApp.getFolderById(id), fallback: true, reason: String(err.message || err) }; } catch (e2) {} }
    var made = DriveApp.createFolder("WISE uploads");
    props.setProperty("WISE_FALLBACK_ROOT", made.getId());
    return { folder: made, fallback: true, reason: String(err.message || err) };
  }
}

// Folder ids are cached, so an upload opens its folder in one Drive call instead of a search
function cachedFolder(key, find) {
  var cache = CacheService.getScriptCache();
  var id = cache.get("fld_" + key);
  if (id) { try { return DriveApp.getFolderById(id); } catch (err) {} }
  var folder = find();
  cache.put("fld_" + key, folder.getId(), 21600);
  return folder;
}

function subFolder(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function driveFolder(kind) {
  return cachedFolder(kind, function() { return subFolder(driveRoot().folder, DRIVE_FOLDERS[kind]); });
}

// Read-only health check shown on the admin upload screen
function driveStatus() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get("drive_status");
  if (hit) {
    try { return JSON.parse(hit); } catch (e) {}
  }
  var res;
  if (!driveRootId()) {
    res = { status: "success", drive: true, fallback: true, reason: "no_folder" };
  } else {
    try {
      var r = DriveApp.getFolderById(driveRootId());
      res = { status: "success", drive: true, fallback: false, folder: r.getName() };
    } catch (err) {
      var msg = String(err && err.message || err);
      if (/permission.*DriveApp|auth\/drive/i.test(msg)) res = { status: "success", drive: false, reason: "not_authorized" };
      else res = { status: "success", drive: true, fallback: true, reason: "no_access" };
    }
  }
  try { cache.put("drive_status", JSON.stringify(res), 1800); } catch (e) {}
  return res;
}

function shareByLink(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Some Workspace domains block public links; fall back to people in the domain
    try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (err2) {}
  }
}


// params.fileName, params.data (data URL or bare base64) -> { status, id, url }
function handleUpload(params) {
  try {
    return uploadPdf(params);
  } catch (err) {
    return { status: "error", message: "drive: " + String(err && err.message || err) };
  }
}

function uploadPdf(params) {
  var name = String(params.fileName || "document.pdf").replace(/[\\\/:*?"<>|]/g, "_");
  if (!/\.pdf$/i.test(name)) name += ".pdf";
  var b64 = String(params.data || "");
  var comma = b64.indexOf(",");
  if (comma >= 0) b64 = b64.slice(comma + 1);
  var bytes = Utilities.base64Decode(b64);
  if (!bytes.length) return { status: "error", message: "empty file" };
  if (bytes.length > UPLOAD_MAX_BYTES) return { status: "error", message: "file too large" };
  // PDF files start with "%PDF"
  if (!(bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70)) return { status: "error", message: "not a pdf" };

  // One sub-folder per document category, e.g. เอกสารดาวน์โหลด/เอกสารสมัครงาน
  var sub = String(params.folder || "").replace(/[\\\/:*?"<>|]/g, "_").trim().slice(0, 60);
  var folder = driveFolder("documents");
  if (sub) { var parent = folder; folder = cachedFolder(parent.getId() + "/" + sub, function() { return subFolder(parent, sub); }); }
  var file = folder.createFile(Utilities.newBlob(bytes, "application/pdf", name));
  shareByLink(file);
  invalidateSheetCache("forms");
  return { status: "success", id: file.getId(), url: "https://drive.google.com/file/d/" + file.getId() + "/view" };
}

/* ------------------------------------------------------------------ */
/* Staff authentication (checked on the server, never in the browser)  */
/* ------------------------------------------------------------------ */

function adminPasswords() {
  var sheet = getSS().getSheetByName("Admins") || getSS().getSheetByName("admins");
  if (!sheet) return [];
  return sheetToObjects(sheet)
    .map(function(a) { return String(a.password || "").trim(); })
    .filter(function(p) { return p.length > 0; });
}

function isAdminKey(key) {
  var list = adminPasswords();
  if (!list.length) return true; // fresh install: first admin can set things up
  return list.indexOf(String(key || "").trim()) >= 0;
}

function handleAdminLogin(params) {
  var pass = String(params.password || "").trim();
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get("admin_fails") || 0);
  if (fails >= 20) return { status: "locked" }; // slows down guessing across all clients
  var list = adminPasswords();
  if (!pass || list.indexOf(pass) < 0) {
    cache.put("admin_fails", String(fails + 1), 600);
    return { status: "error" };
  }
  return { status: "success", admins: list };
}

/* ------------------------------------------------------------------ */
/* Students: PIN login, logbook, weekly diary, attendance, evaluation  */
/* ------------------------------------------------------------------ */

var TZ = "Asia/Bangkok";
var SESSION_TTL = 21600; // 6 hours (CacheService maximum)
var PIN_MAX_FAILS = 5;
var PIN_LOCK_MS = 15 * 60 * 1000;
var SHEETS = {
  auth: ["studentId", "pinHash", "salt", "failed", "lockedUntil", "updatedAt"],
  logbook: ["studentId", "recordId", "data", "updatedAt"],
  diary: ["studentId", "recordId", "date", "text", "updatedAt"],
  workplace: ["studentId", "recordId", "lat", "lng", "radius", "address", "workStart", "workEnd", "lockedAt", "updatedAt"],
  attendance: ["studentId", "recordId", "date", "inTime", "inLat", "inLng", "inAcc", "inDist", "outTime", "outLat", "outLng", "outAcc", "outDist"],
  evalLinks: ["token", "studentId", "recordId", "createdAt"],
  evaluations: ["token", "studentId", "recordId", "evaluatorName", "evaluatorPosition", "scores", "comment", "avg", "percent", "level", "submittedAt"],
  photo: ["studentId", "fileId", "updatedAt"]
};
var SHEET_NAMES = {
  auth: "StudentAuth", logbook: "Logbooks", diary: "Diary", workplace: "Workplaces",
  attendance: "Attendance", evalLinks: "EvalLinks", evaluations: "Evaluations", photo: "StudentPhotos"
};

var PHOTO_MAX_BYTES = 2 * 1024 * 1024;
function photoUrl(fileId) { return fileId ? "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w400" : ""; }

// Saves the student's profile photo in Drive: รูปภาพนักศึกษา/<studentId> <name>.jpg, replacing the old one
function savePhoto(studentId, dataUrl) {
  var m = /^data:(image\/(jpeg|png|webp));base64,(.+)$/.exec(String(dataUrl || ""));
  if (!m) return { status: "error", message: "photo_format" };
  var bytes = Utilities.base64Decode(m[3]);
  if (!bytes.length || bytes.length > PHOTO_MAX_BYTES) return { status: "error", message: "photo_size" };
  var rec = studentRecords(studentId)[0];
  var ext = m[2] === "jpeg" ? "jpg" : m[2];
  var name = (String(studentId) + " " + String(rec ? rec.name : "")).trim().replace(/[\\\/:*?"<>|]/g, "_") + "." + ext;
  var file;
  try {
    file = driveFolder("photos").createFile(Utilities.newBlob(bytes, m[1], name));
    shareByLink(file);
  } catch (err) {
    return { status: "error", message: "drive: " + String(err && err.message || err) };
  }
  return withScriptLock(function() {
    var row = null;
    privRows("photo").forEach(function(r) { if (sameId(r.studentId, studentId)) row = r; });
    if (row && row.fileId) { try { DriveApp.getFileById(String(row.fileId)).setTrashed(true); } catch (err) {} }
    privWrite("photo", row && row._row, { studentId: studentId, fileId: file.getId(), updatedAt: Date.now() });
    invalidateStudentBundle(studentId);
    return { status: "success", photo: photoUrl(file.getId()) };
  });
}

function studentPhoto(studentId) {
  var url = "";
  privRows("photo").forEach(function(r) { if (sameId(r.studentId, studentId) && r.fileId) url = photoUrl(String(r.fileId)); });
  return url;
}

var _memPrivRows = {};
var _memStatusRows = null;

function invalidateStudentBundle(studentId) {
  try {
    var sidNorm = normId(studentId);
    CacheService.getScriptCache().remove("st_bnd_" + sidNorm);
  } catch (e) {}
}

function invalidateStudentCheck(studentId) {
  try {
    var sidNorm = normId(studentId);
    CacheService.getScriptCache().remove("st_chk_" + sidNorm);
  } catch (e) {}
}

function getCachedSheet(key, sheetName) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("pub_sheet_" + key);
  if (cached) {
    try { return JSON.parse(cached); } catch (e) {}
  }
  var sheet = getSS().getSheetByName(sheetName) || getSS().getSheetByName(key);
  var rows = sheet ? sheetToObjects(sheet) : [];
  try {
    var str = JSON.stringify(rows);
    if (str.length < 95000) {
      cache.put("pub_sheet_" + key, str, 1800);
    }
  } catch (e) {}
  return rows;
}

function invalidateSheetCache(key) {
  try {
    var cache = CacheService.getScriptCache();
    if (key) {
      cache.remove("pub_sheet_" + key);
    } else {
      ["sites", "schedules", "forms", "studentStatuses", "settings"].forEach(function(k) {
        cache.remove("pub_sheet_" + k);
      });
    }
  } catch (e) {}
}

function privSheet(key) {
  var name = SHEET_NAMES[key];
  var sheet = getSS().getSheetByName(name);
  if (!sheet) {
    sheet = getSS().insertSheet(name);
    sheet.appendRow(SHEETS[key]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Rows as objects, each with _row (1-based sheet row)
function privRows(key) {
  if (_memPrivRows[key]) return _memPrivRows[key];
  var sheet = privSheet(key);
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var out = [];
  for (var i = 1; i < data.length; i++) {
    var o = { _row: i + 1 };
    headers.forEach(function(h, j) { o[h] = data[i][j]; });
    out.push(o);
  }
  _memPrivRows[key] = out;
  return out;
}

// Columns Sheets must keep as plain text (IDs with leading zeros, dates, clock times, tokens)
var TEXT_COLS = { studentId: 1, recordId: 1, date: 1, workStart: 1, workEnd: 1, token: 1 };

function privWrite(key, row, obj) {
  delete _memPrivRows[key];
  var sheet = privSheet(key);
  var headers = SHEETS[key];
  var values = [headers.map(function(h) {
    var v = obj[h] === undefined || obj[h] === null ? "" : obj[h];
    if (TEXT_COLS[h] && v !== "") { v = String(v); if (v.charAt(0) !== "'") v = "'" + v; }
    return v;
  })];
  if (row) sheet.getRange(row, 1, 1, headers.length).setValues(values);
  else sheet.appendRow(values[0]);
}

// Sheets may store a numeric ID as a number and drop leading zeros, so compare digits loosely
function normId(v) {
  var s = String(v === null || v === undefined ? "" : v).trim();
  return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
}
function sameId(a, b) { return normId(a) === normId(b); }

function sha256Hex(text) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  var hex = "";
  for (var i = 0; i < bytes.length; i++) {
    var b = bytes[i];
    if (b < 0) b += 256;
    var s = b.toString(16);
    hex += (s.length === 1 ? "0" + s : s);
  }
  return hex;
}

function hashPin(pin, salt) {
  var h = salt + ":" + pin;
  for (var i = 0; i < 300; i++) h = sha256Hex(h + salt);
  return h;
}

function newToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ""); }

function statusRows() {
  if (_memStatusRows) return _memStatusRows;
  var sheet = getSS().getSheetByName("StudentStatuses") || getSS().getSheetByName("studentStatuses");
  _memStatusRows = sheet ? sheetToObjects(sheet) : [];
  return _memStatusRows;
}

function studentRecords(studentId) {
  return statusRows().filter(function(r) { return sameId(r.studentId, studentId); });
}

function startSession(studentId) {
  var token = newToken();
  CacheService.getScriptCache().put("st_" + token, String(studentId), SESSION_TTL);
  return token;
}

function sessionStudent(token) {
  if (!token) return null;
  return CacheService.getScriptCache().get("st_" + token);
}

function todayStr() { return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd"); }

function haversine(lat1, lng1, lat2, lng2) {
  var R = 6371000, toRad = Math.PI / 180;
  var dLat = (lat2 - lat1) * toRad, dLng = (lng2 - lng1) * toRad;
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

var DEFAULT_CRITERIA = [
  { id: "work", title: "การปฏิบัติงาน", items: [] },
  { id: "skill", title: "ความรู้ความสามารถ", items: [] },
  { id: "duty", title: "ความรับผิดชอบต่อหน้าที่", items: [] },
  { id: "person", title: "ลักษณะส่วนบุคคล", items: [] }
];

function evalCriteria() {
  var sheet = getSS().getSheetByName("Settings");
  if (sheet) {
    var rows = sheetToObjects(sheet);
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].key) === "evalCriteria" && rows[i].value) {
        try {
          var c = JSON.parse(rows[i].value);
          if (Array.isArray(c) && c.length) return c;
        } catch (err) {}
      }
    }
  }
  return DEFAULT_CRITERIA;
}

// A category with no sub-items is scored as a single question
function criteriaQuestions(criteria) {
  var qs = [];
  criteria.forEach(function(cat) {
    var items = (cat.items || []).filter(function(it) { return it && String(it.title || "").trim(); });
    if (!items.length) qs.push({ id: cat.id, cat: cat.id });
    else items.forEach(function(it) { qs.push({ id: cat.id + "." + it.id, cat: cat.id }); });
  });
  return qs;
}

function evalLevel(avg) {
  if (avg >= 4.5) return "ดีมาก";
  if (avg >= 3.5) return "ดี";
  if (avg >= 2.5) return "ปานกลาง";
  if (avg >= 1.5) return "พอใช้";
  return "ควรปรับปรุง";
}

// Overall average = mean of the category averages (each ด้าน weighs the same)
function scoreEvaluation(criteria, scores) {
  var qs = criteriaQuestions(criteria);
  var byCat = {};
  for (var i = 0; i < qs.length; i++) {
    var v = Number(scores[qs[i].id]);
    if (!(v >= 1 && v <= 5)) return null;
    (byCat[qs[i].cat] = byCat[qs[i].cat] || []).push(v);
  }
  var cats = Object.keys(byCat).map(function(k) {
    var arr = byCat[k];
    return arr.reduce(function(a, b) { return a + b; }, 0) / arr.length;
  });
  var avg = cats.reduce(function(a, b) { return a + b; }, 0) / cats.length;
  avg = Math.round(avg * 100) / 100;
  return { avg: avg, percent: Math.round(avg / 5 * 10000) / 100, level: evalLevel(avg) };
}

function cleanRecord(r) {
  return {
    id: r.id, studentId: r.studentId, name: r.name, status: r.status, major: r.major,
    internshipType: r.internshipType, location: r.location, position: r.position, term: r.term,
    academicYear: r.academicYear, startDate: r.startDate, endDate: r.endDate, supervisor: r.supervisor || ""
  };
}

function parseJson(s, fallback) { try { return s ? JSON.parse(s) : fallback; } catch (err) { return fallback; } }

// Everything one student owns, grouped by status record id
function studentBundle(studentId) {
  var sidNorm = normId(studentId);
  var cache = CacheService.getScriptCache();
  var cached = cache.get("st_bnd_" + sidNorm);
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      parsed.serverTime = Date.now();
      parsed.today = todayStr();
      return parsed;
    } catch (e) {}
  }

  var records = studentRecords(studentId).map(cleanRecord);
  var mine = function(key) { return privRows(key).filter(function(r) { return sameId(r.studentId, studentId); }); };
  var out = { studentId: String(studentId), photo: studentPhoto(studentId), records: records, logbooks: {}, diary: {}, workplaces: {}, attendance: {}, evalLinks: {}, evaluations: {}, criteria: evalCriteria(), today: todayStr(), serverTime: Date.now() };
  mine("logbook").forEach(function(r) { out.logbooks[r.recordId] = { data: parseJson(r.data, {}), updatedAt: r.updatedAt }; });
  mine("diary").forEach(function(r) { (out.diary[r.recordId] = out.diary[r.recordId] || {})[String(r.date)] = String(r.text || ""); });
  mine("workplace").forEach(function(r) {
    out.workplaces[r.recordId] = { lat: Number(r.lat), lng: Number(r.lng), radius: Number(r.radius), address: r.address, workStart: r.workStart, workEnd: r.workEnd, locked: !!r.lockedAt };
  });
  mine("attendance").forEach(function(r) {
    (out.attendance[r.recordId] = out.attendance[r.recordId] || []).push({
      date: String(r.date), inTime: Number(r.inTime) || null, outTime: Number(r.outTime) || null,
      inDist: Number(r.inDist) || 0, outDist: Number(r.outDist) || 0,
      inLat: Number(r.inLat) || null, inLng: Number(r.inLng) || null, outLat: Number(r.outLat) || null, outLng: Number(r.outLng) || null
    });
  });
  mine("evalLinks").forEach(function(r) { out.evalLinks[r.recordId] = String(r.token); });
  mine("evaluations").forEach(function(r) {
    (out.evaluations[r.recordId] = out.evaluations[r.recordId] || []).push({
      evaluatorName: r.evaluatorName, evaluatorPosition: r.evaluatorPosition, scores: parseJson(r.scores, {}),
      comment: r.comment, avg: Number(r.avg), percent: Number(r.percent), level: r.level, submittedAt: Number(r.submittedAt)
    });
  });

  try {
    var str = JSON.stringify(out);
    if (str.length < 95000) {
      cache.put("st_bnd_" + sidNorm, str, 1800);
    }
  } catch (e) {}

  return out;
}

function ownsRecord(studentId, recordId) {
  return studentRecords(studentId).some(function(r) { return sameId(r.id, recordId); });
}

function handleStudent(params) {
  var op = String(params.op || "");
  var sid = String(params.studentId || "").trim();

  if (op === "check") {
    if (!sid) return { status: "error", message: "missing" };
    var sidNorm = normId(sid);
    var cache = CacheService.getScriptCache();
    var cached = cache.get("st_chk_" + sidNorm);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    var found = studentRecords(sid);
    var hasPin = privRows("auth").some(function(r) { return sameId(r.studentId, sid) && r.pinHash; });
    var res = { status: "success", exists: found.length > 0, hasPin: hasPin, name: found.length ? String(found[0].name || "") : "" };
    if (found.length > 0) {
      try { cache.put("st_chk_" + sidNorm, JSON.stringify(res), 3600); } catch (e) {}
    }
    return res;
  }

  if (op === "setup" || op === "login") {
    var pin = String(params.pin || "");
    if (!sid || !/^\d{4,6}$/.test(pin)) return { status: "error", message: "pin_format" };
    var recs = studentRecords(sid);
    if (!recs.length) return { status: "error", message: "not_found" };

    var authResult = withScriptLock(function() {
      var row = null;
      privRows("auth").forEach(function(r) { if (sameId(r.studentId, sid)) row = r; });
      var now = Date.now();
      if (op === "setup") {
        if (row && row.pinHash) return { status: "error", message: "has_pin" };
        var salt = newToken().slice(0, 16);
        privWrite("auth", row && row._row, { studentId: sid, pinHash: hashPin(pin, salt), salt: salt, failed: 0, lockedUntil: "", updatedAt: now });
        invalidateStudentCheck(sid);
        invalidateStudentBundle(sid);
        return { status: "success", token: startSession(sid) };
      }
      if (!row || !row.pinHash) return { status: "error", message: "no_pin" };
      if (Number(row.lockedUntil) > now) return { status: "error", message: "locked", until: Number(row.lockedUntil) };
      if (hashPin(pin, String(row.salt)) !== String(row.pinHash)) {
        var failed = Number(row.failed || 0) + 1;
        row.failed = failed >= PIN_MAX_FAILS ? 0 : failed;
        row.lockedUntil = failed >= PIN_MAX_FAILS ? now + PIN_LOCK_MS : "";
        privWrite("auth", row._row, row);
        return { status: "error", message: failed >= PIN_MAX_FAILS ? "locked" : "wrong_pin", left: PIN_MAX_FAILS - failed, until: Number(row.lockedUntil) || null };
      }
      row.failed = 0; row.lockedUntil = ""; row.updatedAt = now;
      privWrite("auth", row._row, row);
      return { status: "success", token: startSession(sid) };
    });

    if (authResult.status !== "success") return authResult;
    return { status: "success", token: authResult.token, bundle: studentBundle(sid) };
  }

  // Everything else needs a valid session
  var me = sessionStudent(params.token);
  if (!me) return { status: "expired" };

  if (op === "logout") { CacheService.getScriptCache().remove("st_" + params.token); return { status: "success" }; }
  if (op === "me") return { status: "success", bundle: studentBundle(me) };
  if (op === "setPhoto") return savePhoto(me, params.data);

  var recordId = String(params.recordId || "");
  if (!ownsRecord(me, recordId)) return { status: "error", message: "record" };
  var now2 = Date.now();

  return withScriptLock(function() {
    if (op === "saveLogbook") {
      var data = JSON.stringify(params.data || {});
      if (data.length > 45000) return { status: "error", message: "too_long" };
      var lb = null;
      privRows("logbook").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId)) lb = r; });
      privWrite("logbook", lb && lb._row, { studentId: me, recordId: recordId, data: data, updatedAt: now2 });
      invalidateStudentBundle(me);
      return { status: "success", updatedAt: now2 };
    }

    if (op === "saveDiary") {
      var date = String(params.date || "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { status: "error", message: "date" };
      if (date > todayStr()) return { status: "error", message: "future" };
      var text = String(params.text || "").slice(0, 5000);
      var dr = null;
      privRows("diary").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId) && String(r.date) === date) dr = r; });
      // Keep dates as text so Sheets does not turn them into Date objects
      privWrite("diary", dr && dr._row, { studentId: me, recordId: recordId, date: date, text: text, updatedAt: now2 });
      invalidateStudentBundle(me);
      return { status: "success", updatedAt: now2 };
    }

    if (op === "setWorkplace") {
      var lat = Number(params.lat), lng = Number(params.lng), radius = Math.round(Number(params.radius) || 200);
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || (lat === 0 && lng === 0)) return { status: "error", message: "coords" };
      radius = Math.max(50, Math.min(radius, 1000));
      var wp = null;
      privRows("workplace").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId)) wp = r; });
      if (wp && wp.lockedAt) return { status: "error", message: "locked" };
      privWrite("workplace", wp && wp._row, {
        studentId: me, recordId: recordId, lat: lat, lng: lng, radius: radius, address: String(params.address || "").slice(0, 500),
        workStart: wp ? wp.workStart : "", workEnd: wp ? wp.workEnd : "", lockedAt: now2, updatedAt: now2
      });
      invalidateStudentBundle(me);
      return { status: "success" };
    }

    if (op === "setHours") {
      var okTime = function(t) { return t === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(t); };
      var ws = String(params.workStart || ""), we = String(params.workEnd || "");
      if (!okTime(ws) || !okTime(we)) return { status: "error", message: "time" };
      var wp2 = null;
      privRows("workplace").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId)) wp2 = r; });
      if (!wp2) return { status: "error", message: "no_workplace" };
      wp2.workStart = ws; wp2.workEnd = we; wp2.updatedAt = now2;
      privWrite("workplace", wp2._row, wp2);
      invalidateStudentBundle(me);
      return { status: "success" };
    }

    if (op === "clock") {
      var kind = params.kind === "out" ? "out" : "in";
      var plat = Number(params.lat), plng = Number(params.lng), acc = Math.max(0, Number(params.acc) || 0);
      var place = null;
      privRows("workplace").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId)) place = r; });
      if (!place) return { status: "error", message: "no_workplace" };
      if (!(Math.abs(plat) <= 90 && Math.abs(plng) <= 180)) return { status: "error", message: "coords" };
      var dist = Math.round(haversine(Number(place.lat), Number(place.lng), plat, plng));
      // Allow for GPS error, capped so a vague fix cannot stretch the area too far
      if (dist > Number(place.radius) + Math.min(acc, 75)) return { status: "error", message: "outside", distance: dist, radius: Number(place.radius) };
      var day = todayStr();
      var att = null;
      privRows("attendance").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId) && String(r.date) === day) att = r; });
      if (kind === "in") {
        if (att && att.inTime) return { status: "error", message: "already_in", time: Number(att.inTime) };
        privWrite("attendance", att && att._row, { studentId: me, recordId: recordId, date: day, inTime: now2, inLat: plat, inLng: plng, inAcc: Math.round(acc), inDist: dist });
      } else {
        if (!att || !att.inTime) return { status: "error", message: "not_in" };
        if (att.outTime) return { status: "error", message: "already_out", time: Number(att.outTime) };
        att.date = day; att.outTime = now2; att.outLat = plat; att.outLng = plng; att.outAcc = Math.round(acc); att.outDist = dist;
        privWrite("attendance", att._row, att);
      }
      invalidateStudentBundle(me);
      return { status: "success", time: now2, distance: dist };
    }

    if (op === "evalLink") {
      var link = null;
      privRows("evalLinks").forEach(function(r) { if (sameId(r.studentId, me) && sameId(r.recordId, recordId)) link = r; });
      if (link) return { status: "success", token: String(link.token) };
      var t = newToken().slice(0, 24);
      privWrite("evalLinks", null, { token: t, studentId: me, recordId: recordId, createdAt: now2 });
      invalidateStudentBundle(me);
      return { status: "success", token: t };
    }

    return { status: "error", message: "unknown op" };
  });
}

/* Mentor evaluation: public, but only with the unguessable link token */
function handleEval(params) {
  var t = String(params.t || "").trim();
  if (!t) return { status: "error", message: "missing" };
  var link = null;
  privRows("evalLinks").forEach(function(r) { if (String(r.token) === t) link = r; });
  if (!link) return { status: "error", message: "not_found" };
  var rec = null;
  studentRecords(link.studentId).forEach(function(r) { if (sameId(r.id, link.recordId)) rec = r; });
  var criteria = evalCriteria();
  var done = null;
  privRows("evaluations").forEach(function(r) { if (String(r.token) === t) done = r; });

  if (params.op === "submit") {
    if (done) return { status: "error", message: "already" };
    var name = String(params.evaluatorName || "").trim().slice(0, 200);
    if (!name) return { status: "error", message: "name" };
    var result = scoreEvaluation(criteria, params.scores || {});
    if (!result) return { status: "error", message: "incomplete" };
    return withScriptLock(function() {
      privWrite("evaluations", null, {
        token: t, studentId: link.studentId, recordId: link.recordId, evaluatorName: name,
        evaluatorPosition: String(params.evaluatorPosition || "").slice(0, 200), scores: JSON.stringify(params.scores),
        comment: String(params.comment || "").slice(0, 5000), avg: result.avg, percent: result.percent, level: result.level, submittedAt: Date.now()
      });
      invalidateStudentBundle(link.studentId);
      return { status: "success", result: result };
    });
  }

  var lb = null;
  privRows("logbook").forEach(function(r) { if (sameId(r.studentId, link.studentId) && sameId(r.recordId, link.recordId)) lb = r; });
  var lbData = lb ? parseJson(lb.data, {}) : {};
  return {
    status: "success",
    student: rec ? { name: rec.name, studentId: rec.studentId, major: rec.major, internshipType: rec.internshipType, position: rec.position, startDate: rec.startDate, endDate: rec.endDate } : null,
    org: lbData.orgName || (rec && rec.location) || "",
    mentor: { name: lbData.mentorName || "", position: lbData.mentorPosition || "" },
    criteria: criteria,
    submitted: done ? { evaluatorName: done.evaluatorName, submittedAt: Number(done.submittedAt), avg: Number(done.avg), percent: Number(done.percent), level: done.level } : null
  };
}

/* Staff tools for student records */
function handleStudentAdmin(params) {
  if (!isAdminKey(params.adminKey)) return { status: "unauthorized" };
  var op = String(params.op || "");
  var sid = String(params.studentId || "").trim();

  if (op === "list") {
    var sum = {};
    var touch = function(id) { id = String(id).trim(); return (sum[id] = sum[id] || { hasPin: false, logbook: 0, diary: 0, days: 0, evals: 0, avg: null, level: "" }); };
    privRows("auth").forEach(function(r) { if (r.pinHash) touch(r.studentId).hasPin = true; });
    privRows("logbook").forEach(function(r) { touch(r.studentId).logbook++; });
    privRows("diary").forEach(function(r) { if (String(r.text || "").trim()) touch(r.studentId).diary++; });
    privRows("attendance").forEach(function(r) { if (r.inTime) touch(r.studentId).days++; });
    privRows("evaluations").forEach(function(r) { var s = touch(r.studentId); s.evals++; s.avg = Number(r.avg); s.level = r.level; });
    return { status: "success", summary: sum };
  }
  if (op === "view") return { status: "success", bundle: studentBundle(sid) };
  if (op === "resetPin") {
    return withScriptLock(function() {
      privRows("auth").forEach(function(r) { if (sameId(r.studentId, sid)) privSheet("auth").getRange(r._row, 1, 1, SHEETS.auth.length).clearContent(); });
      delete _memPrivRows["auth"];
      invalidateStudentCheck(sid);
      invalidateStudentBundle(sid);
      return { status: "success" };
    });
  }
  if (op === "unlockWorkplace") {
    return withScriptLock(function() {
      privRows("workplace").forEach(function(r) {
        if (sameId(r.studentId, sid) && sameId(r.recordId, params.recordId)) { r.lockedAt = ""; privWrite("workplace", r._row, r); }
      });
      invalidateStudentBundle(sid);
      return { status: "success" };
    });
  }
  return { status: "error", message: "unknown op" };
}

/* ------------------------------------------------------------------ */
/* HTTP entry points                                                   */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var type = (e && e.parameter) ? e.parameter.type : null;

  if (type === "live") return jsonOut(handleLive(e ? e.parameter : null));
  // Capability probe: lets the web app know this deployment can translate
  if (type === "translate") return jsonOut({ status: "success", translate: true });
  if (type === "upload") return jsonOut({ status: "success", upload: true, version: BACKEND_VERSION });
  if (type === "student") return jsonOut({ status: "success", student: true, adminLogin: true, version: BACKEND_VERSION });
  if (type === "drive") return jsonOut(driveStatus());

  // Public sheets only: admin passwords and student records stay on the server
  var typeMap = {
    "sites": "Sites",
    "schedules": "Schedules",
    "forms": "Forms",
    "studentStatuses": "StudentStatuses",
    "settings": "Settings"
  };

  // ดึงข้อมูลทุกชีตพร้อมกัน
  if (!type) {
    var result = {};
    Object.keys(typeMap).forEach(function(key) {
      result[key] = getCachedSheet(key, typeMap[key]);
    });
    result.version = getDataVersion();
    result.locks = readLocks();
    return jsonOut(result);
  }

  if (!typeMap[type]) return jsonOut({ status: "error", message: "Not available: " + type });
  return jsonOut(getCachedSheet(type, typeMap[type]));
}

// Always answer with JSON, so the web page can show what went wrong
function doPost(e) {
  try {
    return handlePost(e);
  } catch (err) {
    return jsonOut({ status: "error", message: String(err && err.message || err) });
  }
}

function handlePost(e) {
  var params = JSON.parse(e.postData.contents);
  var type = params.type;
  var action = params.action || "all";

  if (type === "lock") return jsonOut(handleLock(params));
  if (type === "supervisor") return jsonOut(handleSupervisorSave(params));
  if (type === "translate") return jsonOut(handleTranslate(params));
  if (type === "adminLogin") return jsonOut(handleAdminLogin(params));
  if (type === "student") return jsonOut(handleStudent(params));
  if (type === "eval") return jsonOut(handleEval(params));
  if (type === "studentAdmin") return jsonOut(handleStudentAdmin(params));

  // Everything below changes shared data: staff only
  if (!isAdminKey(params.adminKey)) return jsonOut({ status: "unauthorized" });
  if (type === "settings") return jsonOut(handleSettingsSave(params));
  if (type === "upload") return jsonOut(handleUpload(params));
  if (["sites", "schedules", "forms", "studentStatuses", "admins"].indexOf(type) < 0) {
    return jsonOut({ status: "error", message: "Unknown type: " + type });
  }

  var SHEET_OF = { sites: "Sites", schedules: "Schedules", forms: "Forms", studentStatuses: "StudentStatuses", admins: "Admins" };
  var DEFAULT_HEADERS = {
    studentStatuses: ["id", "studentId", "name", "status", "major", "internshipType", "location", "position", "term", "academicYear", "startDate", "endDate", "lastUpdated", "remarks", "supervisor"],
    forms: ["id", "title", "category", "url"],
    sites: ["id", "name", "location", "description", "position", "status", "major", "contactLink", "email", "phone", "createdAt"],
    schedules: ["id", "event", "startDate", "endDate", "rawStartDate", "rawEndDate", "status", "createdAt"],
    admins: ["password"]
  };
  var sheetName = SHEET_OF[type];
  var sheet = getSS().getSheetByName(sheetName) || getSS().getSheetByName(type);

  if (!sheet) {
    sheet = getSS().insertSheet(sheetName);
    sheet.appendRow(DEFAULT_HEADERS[type]);
  }

  // Add a column for any field the sheet does not have yet, so nothing is silently dropped
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].filter(function(h) { return String(h) !== ""; });
  var incoming = action === "all" ? (params.data || []) : (params.item ? [params.item] : []);
  var wanted = DEFAULT_HEADERS[type].slice();
  incoming.forEach(function(it) { Object.keys(it || {}).forEach(function(k) { if (k.charAt(0) !== "_" && wanted.indexOf(k) < 0) wanted.push(k); }); });
  wanted.forEach(function(h) {
    if (headers.indexOf(h) < 0) {
      sheet.getRange(1, headers.length + 1).setValue(h);
      headers.push(h);
    }
  });

  if (action === "all") {
    sheet.clearContents();
    sheet.appendRow(headers);

    if (params.data && params.data.length > 0) {
      var values = params.data.map(function(item) {
        return headers.map(function(h) { return item[h] !== undefined ? item[h] : ""; });
      });
      sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    }
  } else if (action === "add" || action === "update") {
    var item = params.item;
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;

    var searchKey = (type === "admins") ? "password" : "id";
    var colIndex = headers.indexOf(searchKey);

    if (colIndex !== -1 && item[searchKey]) {
      var targetVal = String(item[searchKey]).trim();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][colIndex]).trim() === targetVal) {
          rowIndex = i + 1;
          break;
        }
      }
    }

    // Fallback for studentStatuses: search by studentId (รหัสนักศึกษา)
    if (rowIndex === -1 && type === "studentStatuses" && item.studentId) {
      var studentIdCol = headers.indexOf("studentId");
      if (studentIdCol !== -1) {
        var targetStudentId = String(item.studentId).trim();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][studentIdCol]).trim() === targetStudentId) {
            rowIndex = i + 1;
            break;
          }
        }
      }
    }

    var rowData = headers.map(function(h) { return item[h] !== undefined ? item[h] : ""; });
    if (rowIndex !== -1) {
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  } else if (action === "delete") {
    var item = params.item;
    var data = sheet.getDataRange().getValues();
    var searchKey = (type === "admins") ? "password" : "id";
    var colIndex = headers.indexOf(searchKey);

    if (colIndex !== -1) {
      for (var i = data.length - 1; i >= 1; i--) {
        if (data[i][colIndex] == item[searchKey]) {
          sheet.deleteRow(i + 1);
        }
      }
    }
  }

  var v = "1";
  if (type) {
    invalidateSheetCache(type);
    v = bumpDataVersion(type);
  }
  if (type === "studentStatuses") {
    _memStatusRows = null;
    if (params.item && params.item.studentId) {
      invalidateStudentCheck(params.item.studentId);
      invalidateStudentBundle(params.item.studentId);
    }
  }

  return jsonOut({ status: "success", version: v });
}
