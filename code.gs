var ss = SpreadsheetApp.getActiveSpreadsheet();

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

    var sheet = ss.getSheetByName("StudentStatuses") || ss.getSheetByName("studentStatuses");
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
    return { status: "success", lastUpdated: now };
  });
}

function handleLive() {
  var sheet = ss.getSheetByName("StudentStatuses") || ss.getSheetByName("studentStatuses");
  var rows = [];
  if (sheet) {
    rows = sheetToObjects(sheet).map(function(r) {
      return { id: r.id, studentId: r.studentId, supervisor: r.supervisor || "", lastUpdated: r.lastUpdated };
    });
  }
  return { serverTime: Date.now(), rows: rows, locks: readLocks() };
}

/* ------------------------------------------------------------------ */
/* Site settings (logo / favicon / title) - key/value sheet           */
/* ------------------------------------------------------------------ */

function handleSettingsSave(params) {
  var sheet = ss.getSheetByName("Settings");
  if (!sheet) sheet = ss.insertSheet("Settings");
  sheet.clearContents();
  sheet.appendRow(["key", "value"]);
  var items = params.data || [];
  if (items.length > 0) {
    var values = items.map(function(it) { return [String(it.key), String(it.value || "")]; });
    sheet.getRange(2, 1, values.length, 2).setValues(values);
  }
  return { status: "success" };
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

function getUploadFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("UPLOAD_FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) {}
  }
  var folder = DriveApp.createFolder("WISE - เอกสารดาวน์โหลด");
  props.setProperty("UPLOAD_FOLDER_ID", folder.getId());
  return folder;
}

// params.fileName, params.data (data URL or bare base64) -> { status, id, url }
function handleUpload(params) {
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

  var file = getUploadFolder().createFile(Utilities.newBlob(bytes, "application/pdf", name));
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Some Workspace domains block public links; fall back to people in the domain
    try { file.setSharing(DriveApp.Access.DOMAIN_WITH_LINK, DriveApp.Permission.VIEW); } catch (err2) {}
  }
  return { status: "success", id: file.getId(), url: "https://drive.google.com/file/d/" + file.getId() + "/view" };
}

/* ------------------------------------------------------------------ */
/* HTTP entry points                                                   */
/* ------------------------------------------------------------------ */

function doGet(e) {
  var type = (e && e.parameter) ? e.parameter.type : null;

  if (type === "live") return jsonOut(handleLive());
  // Capability probe: lets the web app know this deployment can translate
  if (type === "translate") return jsonOut({ status: "success", translate: true });
  if (type === "upload") return jsonOut({ status: "success", upload: true });

  // ดึงข้อมูลทุกชีตพร้อมกัน
  if (!type) {
    var typeMap = {
      "sites": "Sites",
      "schedules": "Schedules",
      "forms": "Forms",
      "studentStatuses": "StudentStatuses",
      "admins": "Admins",
      "settings": "Settings"
    };
    var result = {};
    Object.keys(typeMap).forEach(function(key) {
      var sheet = ss.getSheetByName(typeMap[key]) || ss.getSheetByName(key);
      if (sheet) result[key] = sheetToObjects(sheet);
    });
    result.locks = readLocks();
    return jsonOut(result);
  }

  var sheetName = (type === "admins") ? "Admins" : (type === "studentStatuses" ? "StudentStatuses" : type);
  var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName(type);

  if (!sheet) {
    return jsonOut({ status: "error", message: "Sheet not found: " + sheetName });
  }
  return jsonOut(sheetToObjects(sheet));
}

function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var type = params.type;
  var action = params.action || "all";

  if (type === "lock") return jsonOut(handleLock(params));
  if (type === "supervisor") return jsonOut(handleSupervisorSave(params));
  if (type === "settings") return jsonOut(handleSettingsSave(params));
  if (type === "translate") return jsonOut(handleTranslate(params));
  if (type === "upload") return jsonOut(handleUpload(params));

  var sheetName = (type === "admins") ? "Admins" : (type === "studentStatuses" ? "StudentStatuses" : type);
  var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName(type);

  var defaultHeaders = (type === "studentStatuses")
    ? ["id", "studentId", "name", "status", "major", "internshipType", "location", "position", "term", "academicYear", "startDate", "endDate", "lastUpdated", "remarks", "supervisor"]
    : ["password"];

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(defaultHeaders);
  } else if (type === "studentStatuses") {
    var lastCol = Math.max(sheet.getLastColumn(), 1);
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (currentHeaders.indexOf("supervisor") === -1) {
      sheet.getRange(1, currentHeaders.length + 1).setValue("supervisor");
    }
  }

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

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

  return jsonOut({ status: "success" });
}
