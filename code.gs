var ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  var type = (e && e.parameter) ? e.parameter.type : null;

  // ดึงข้อมูลทุกชีตพร้อมกัน
  if (!type) {
    var typeMap = {
      "sites": "Sites",
      "schedules": "Schedules",
      "forms": "Forms",
      "studentStatuses": "StudentStatuses",
      "admins": "Admins"
    };
    var result = {};
    Object.keys(typeMap).forEach(function(key) {
      var sheet = ss.getSheetByName(typeMap[key]) || ss.getSheetByName(key);
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        if (data.length > 0) {
          var headers = data[0];
          result[key] = data.slice(1).map(function(row) {
            var obj = {};
            headers.forEach(function(header, i) { obj[header] = row[i]; });
            return obj;
          });
        } else {
          result[key] = [];
        }
      }
    });
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheetName = (type === "admins") ? "Admins" : (type === "studentStatuses" ? "StudentStatuses" : type);
  var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName(type);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Sheet not found: " + sheetName }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var headers = data[0];
  var rows = data.slice(1);
  
  var result = rows.map(function(row) {
    var obj = {};
    headers.forEach(function(header, i) {
      obj[header] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var params = JSON.parse(e.postData.contents);
  var type = params.type;
  var action = params.action || "all";
  
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
    
    if (colIndex !== -1) {
      for (var i = 1; i < data.length; i++) {
        if (data[i][colIndex] == item[searchKey]) {
          rowIndex = i + 1;
          break;
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
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}
