const TASK_HEADERS = ["id","title","description","status","priority","tags","deadline","estimatedMinutes","createdAt","updatedAt","completedAt"];
const TX_HEADERS = ["id","date","type","category","amount","note","createdAt","updatedAt"];
const TARGET_HEADERS = ["id","date","activity","targetMinutes","createdAt","updatedAt"];
const LOG_HEADERS = ["id","date","activity","durationMinutes","note","createdAt"];

function doGet(e) {
  try {
    assertAuth_(e.parameter.token);
    const action = e.parameter.action || "bootstrap";
    if (action === "bootstrap") return json_({ ok:true, data: bootstrap_() });
    return json_({ ok:false, error:"Unknown GET action" });
  } catch (err) {
    return json_({ ok:false, error:String(err.message || err) });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    assertAuth_(body.token);
    const action = body.action;

    if (action === "createTask") return ok_(createTask_(body.task));
    if (action === "updateTask") return ok_(updateTask_(body.id, body.patch || {}));
    if (action === "deleteTask") return ok_(deleteById_("Tasks", body.id));

    if (action === "createTransaction") return ok_(createTransaction_(body.transaction));
    if (action === "updateTransaction") return ok_(updateTransaction_(body.id, body.patch || {}));
    if (action === "deleteTransaction") return ok_(deleteById_("Transactions", body.id));

    if (action === "upsertDailyTarget") return ok_(upsertDailyTarget_(body.target));
    if (action === "addTimeLog") return ok_(addTimeLog_(body.log));
    if (action === "deleteTimeLog") return ok_(deleteById_("TimeLogs", body.id));

    throw new Error("Unknown POST action: " + action);
  } catch (err) {
    return json_({ ok:false, error:String(err.message || err) });
  }
}

function setup() {
  const props = PropertiesService.getScriptProperties();
  const sheetId = props.getProperty("SHEET_ID");
  if (!sheetId) throw new Error("Isi Script Property SHEET_ID terlebih dahulu.");

  ensureSheet_("Tasks", TASK_HEADERS);
  ensureSheet_("Transactions", TX_HEADERS);
  ensureSheet_("DailyTargets", TARGET_HEADERS);
  ensureSheet_("TimeLogs", LOG_HEADERS);

  SpreadsheetApp.openById(sheetId).setSpreadsheetTimeZone("Asia/Jakarta");
  return "Setup selesai.";
}

function bootstrap_() {
  const tasks = read_("Tasks");
  const transactions = read_("Transactions").map(x => ({...x, amount:Number(x.amount || 0)}));
  const targets = read_("DailyTargets").map(x => ({...x, targetMinutes:Number(x.targetMinutes || 0)}));
  const timeLogs = read_("TimeLogs").map(x => ({...x, durationMinutes:Number(x.durationMinutes || 0)}));
  return { tasks, transactions, targets, timeLogs, dashboard: dashboard_(tasks, transactions, targets, timeLogs) };
}

function dashboard_(tasks, txs, targets, logs) {
  const today = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
  const income = txs.filter(x => x.type === "INCOME").reduce((s,x)=>s+Number(x.amount||0),0);
  const expense = txs.filter(x => x.type === "EXPENSE").reduce((s,x)=>s+Number(x.amount||0),0);
  const done = tasks.filter(x => x.status === "DONE").length;
  const active = tasks.length - done;
  const minutesToday = logs.filter(x => x.date === today).reduce((s,x)=>s+Number(x.durationMinutes||0),0);
  return { balance: income-expense, income, expense, done, active, minutesToday };
}

function createTask_(task) {
  if (!task || !task.title) throw new Error("Judul task wajib.");
  const now = new Date().toISOString();
  const row = {
    id: Utilities.getUuid(),
    title: task.title,
    description: task.description || "",
    status: task.status || "TODO",
    priority: task.priority || "MEDIUM",
    tags: task.tags || "",
    deadline: task.deadline || "",
    estimatedMinutes: Number(task.estimatedMinutes || 0),
    createdAt: now,
    updatedAt: now,
    completedAt: ""
  };
  append_("Tasks", TASK_HEADERS, row);
  return row;
}

function updateTask_(id, patch) {
  const existing = getById_("Tasks", id);
  if (!existing) throw new Error("Task tidak ditemukan.");
  const now = new Date().toISOString();
  patch.updatedAt = now;
  if (patch.status === "DONE" && existing.status !== "DONE") patch.completedAt = now;
  if (patch.status && patch.status !== "DONE") patch.completedAt = "";
  return updateById_("Tasks", id, patch);
}

function createTransaction_(tx) {
  if (!tx || !tx.date || !tx.category) throw new Error("Tanggal dan kategori wajib.");
  const now = new Date().toISOString();
  const row = {
    id: Utilities.getUuid(),
    date: tx.date,
    type: tx.type === "INCOME" ? "INCOME" : "EXPENSE",
    category: tx.category,
    amount: Number(tx.amount || 0),
    note: tx.note || "",
    createdAt: now,
    updatedAt: now
  };
  append_("Transactions", TX_HEADERS, row);
  return row;
}

function updateTransaction_(id, patch) {
  patch.updatedAt = new Date().toISOString();
  if ("amount" in patch) patch.amount = Number(patch.amount || 0);
  return updateById_("Transactions", id, patch);
}

function upsertDailyTarget_(target) {
  if (!target || !target.date || !target.activity) throw new Error("Tanggal dan aktivitas wajib.");
  const rows = read_("DailyTargets");
  const existing = rows.find(x => x.date === target.date && String(x.activity).toLowerCase() === String(target.activity).toLowerCase());
  const now = new Date().toISOString();

  if (existing) {
    return updateById_("DailyTargets", existing.id, {
      targetMinutes: Number(target.targetMinutes || 0),
      updatedAt: now
    });
  }

  const row = {
    id: Utilities.getUuid(),
    date: target.date,
    activity: target.activity,
    targetMinutes: Number(target.targetMinutes || 0),
    createdAt: now,
    updatedAt: now
  };
  append_("DailyTargets", TARGET_HEADERS, row);
  return row;
}

function addTimeLog_(log) {
  if (!log || !log.date || !log.activity) throw new Error("Tanggal dan aktivitas wajib.");
  const row = {
    id: Utilities.getUuid(),
    date: log.date,
    activity: log.activity,
    durationMinutes: Number(log.durationMinutes || 0),
    note: log.note || "",
    createdAt: new Date().toISOString()
  };
  append_("TimeLogs", LOG_HEADERS, row);
  return row;
}

function assertAuth_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty("API_TOKEN");
  if (!expected || token !== expected) throw new Error("Unauthorized");
}

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  if (!id) throw new Error("SHEET_ID belum diisi.");
  return SpreadsheetApp.openById(id);
}

function ensureSheet_(name, headers) {
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1,1,1,headers.length).setValues([headers]);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,headers.length).setFontWeight("bold");
  }
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error("Sheet " + name + " belum ada. Jalankan setup().");
  return sh;
}

function read_(name) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  return values.slice(1).filter(r => r.some(v => v !== "")).map(r => {
    const o = {};
    headers.forEach((h,i) => o[h] = normalize_(r[i]));
    return o;
  });
}

function normalize_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "Asia/Jakarta", "yyyy-MM-dd");
  return v;
}

function append_(name, headers, obj) {
  sheet_(name).appendRow(headers.map(h => obj[h] ?? ""));
}

function getById_(name, id) {
  return read_(name).find(x => String(x.id) === String(id)) || null;
}

function updateById_(name, id, patch) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  const headers = values[0].map(String);
  const idCol = headers.indexOf("id");
  for (let i=1; i<values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      Object.keys(patch).forEach(k => {
        const c = headers.indexOf(k);
        if (c >= 0) values[i][c] = patch[k];
      });
      sh.getRange(i+1,1,1,headers.length).setValues([values[i]]);
      const out = {};
      headers.forEach((h,j)=>out[h]=normalize_(values[i][j]));
      return out;
    }
  }
  throw new Error("Data tidak ditemukan.");
}

function deleteById_(name, id) {
  const sh = sheet_(name);
  const values = sh.getDataRange().getValues();
  if (!values.length) return false;
  const headers = values[0].map(String);
  const idCol = headers.indexOf("id");
  for (let i=1; i<values.length; i++) {
    if (String(values[i][idCol]) === String(id)) {
      sh.deleteRow(i+1);
      return true;
    }
  }
  return false;
}

function ok_(data) { return json_({ok:true, data:data}); }
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
