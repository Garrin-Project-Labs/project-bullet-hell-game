const SHEET_NAME = 'Leaderboard';
const LIMIT = 10;

function doGet(e) {
  const sheet = getLeaderboardSheet_();
  if (e && e.parameter && e.parameter.action === 'submit') {
    const entry = sanitizeEntry_(e.parameter);
    sheet.appendRow([entry.date, entry.name, entry.score, entry.level, entry.grazes]);
    trimSheet_(sheet);
  }
  return json_({ scores: topScores_(sheet) });
}

function doPost(e) {
  const sheet = getLeaderboardSheet_();
  const body = parseBody_(e);
  const entry = sanitizeEntry_(body);
  sheet.appendRow([entry.date, entry.name, entry.score, entry.level, entry.grazes]);
  trimSheet_(sheet);
  return json_({ scores: topScores_(sheet) });
}

function getLeaderboardSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['date', 'name', 'score', 'level', 'grazes']);
  }
  return sheet;
}

function parseBody_(e) {
  try {
    return JSON.parse(e.postData && e.postData.contents ? e.postData.contents : '{}');
  } catch (_) {
    return {};
  }
}

function sanitizeEntry_(input) {
  const name = String(input && input.name ? input.name : 'BANANA')
    .toUpperCase()
    .replace(/[^A-Z0-9 _-]/g, '')
    .slice(0, 12) || 'BANANA';
  return {
    date: new Date().toISOString(),
    name,
    score: clampInt_(input && input.score, 0, 999999999),
    level: clampInt_(input && input.level, 1, 10),
    grazes: clampInt_(input && input.grazes, 0, 999999999)
  };
}

function clampInt_(value, min, max) {
  const n = Math.floor(Number(value || 0));
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function topScores_(sheet) {
  const rows = sheet.getDataRange().getValues().slice(1);
  return rows
    .map((row) => ({
      date: String(row[0] || ''),
      name: String(row[1] || 'BANANA'),
      score: Number(row[2] || 0),
      level: Number(row[3] || 1),
      grazes: Number(row[4] || 0)
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || b.level - a.level || b.grazes - a.grazes)
    .slice(0, LIMIT);
}

function trimSheet_(sheet) {
  const scores = topScores_(sheet);
  sheet.clearContents();
  sheet.appendRow(['date', 'name', 'score', 'level', 'grazes']);
  scores.forEach((entry) => sheet.appendRow([entry.date, entry.name, entry.score, entry.level, entry.grazes]));
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
