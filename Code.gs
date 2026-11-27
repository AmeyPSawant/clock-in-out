// Clock in / clock out -> "Timesheet" tab.
// Paste into Extensions > Apps Script inside the workbook.
const PIN = 'change-me'; // must match the PIN you type on the site
const TAB = 'Timesheet';
const AUTO_OUT_HOURS = 13; // forgot to clock out? the shift closes itself after this many hours

// Run once (safe to run again): creates the Timesheet tab and the 10-minute auto clock-out timer.
function setup() {
  sheet_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoClockOut')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoClockOut').timeBased().everyMinutes(10).create();
}

// Closes any open shift older than AUTO_OUT_HOURS, at exactly that length, and flags the row.
function autoClockOut() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const n = sh.getLastRow();
    if (n < 2) return;
    const limit = AUTO_OUT_HOURS * 3600000;
    const now = Date.now();
    sh.getRange(2, 2, n - 1, 2).getValues().forEach((r, i) => {
      if (r[0] !== '' && r[1] === '' && now - r[0].getTime() >= limit) {
        const row = i + 2;
        const note = sh.getRange(row, 5);
        sh.getRange(row, 3).setValue(new Date(r[0].getTime() + limit));
        note.setValue((note.getValue() ? note.getValue() + ' | ' : '') + 'Automatic Clock Out - adjust times');
        sh.getRange(row, 3, 1, 3).setBackground('#fff4cc');
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) { return json_(handle_({ action: 'status', pin: e.parameter.pin })); }

function doPost(e) {
  let req = {};
  try { req = JSON.parse(e.postData.contents); } catch (err) {}
  return json_(handle_(req));
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(TAB);
  if (!sh) sh = ss.insertSheet(TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, 5).setValues([['Shift date', 'Clock in', 'Clock out', 'Hours', 'Note']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('ddd, mmm d');
    sh.getRange('B:C').setNumberFormat('mmm d, h:mm AM/PM');
    sh.getRange('D:D').setNumberFormat('0.00');
    sh.setColumnWidths(1, 4, 150);
  }
  return sh;
}

// Last row with a clock in but no clock out (an open shift), or 0.
function openRow_(sh) {
  const n = sh.getLastRow();
  if (n < 2) return 0;
  const v = sh.getRange(2, 2, n - 1, 2).getValues();
  for (let i = v.length - 1; i >= 0; i--) {
    if (v[i][0] !== '' && v[i][1] === '') return i + 2;
  }
  return 0;
}

function since_(sh, row) { return sh.getRange(row, 2).getValue().getTime(); }

function handle_(req) {
  if (req.pin !== PIN) return { error: 'Wrong PIN' };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const row = openRow_(sh);
    const now = new Date(); // server time, so the phone clock never matters

    if (req.action === 'in') {
      if (row) return { state: 'in', since: since_(sh, row), error: 'Already clocked in' };
      const r = sh.getLastRow() + 1;
      sh.appendRow([
        '=INT(B' + r + ')',                                        // Shift date = day the shift started
        now,                                                       // Clock in (full date and time)
        '',
        '=IF(C' + r + '="","",ROUND((C' + r + '-B' + r + ')*24,2))' // Hours
      ]);
      return { state: 'in', since: now.getTime() };
    }

    if (req.action === 'out') {
      if (!row) return { state: 'out', error: 'Not clocked in' };
      const start = since_(sh, row);
      sh.getRange(row, 3).setValue(now); // lands on the next calendar day for night shifts
      return { state: 'out', at: now.getTime(), hours: Math.round((now.getTime() - start) / 36000) / 100 };
    }

    return row ? { state: 'in', since: since_(sh, row) } : { state: 'out' };
  } finally {
    lock.releaseLock();
  }
}
