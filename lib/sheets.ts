import { google } from "googleapis";
import { Run, NutritionEntry, DailyReview, PlannedDay, QAEntry, DailyNote } from "./types";

// ─── Auth ─────────────────────────────────────────────────────────────────────

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

function getSheets() {
  return google.sheets({ version: "v4", auth: getAuth() });
}

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID!;

// ─── Tab names ────────────────────────────────────────────────────────────────

const TABS = {
  plan:      "Plan",
  runs:      "Runs",
  nutrition: "Nutrition",
  reviews:   "Reviews",
  qa:        "QA",
  notes:     "Notes",
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function colsToRun(row: string[]): Run {
  return {
    id:          row[0],
    date:        row[1],
    distanceKm:  parseFloat(row[2]) || 0,
    durationSec: parseInt(row[3])   || 0,
    pacePerKm:   row[4] || "",
    hrAvg:       row[5] ? parseInt(row[5]) : null,
    effort:      row[6] ? parseInt(row[6]) : null,
    source:      (row[7] as Run["source"]) || "manual",
    stravaId:    row[8] || null,
    notes:       row[9] || "",
  };
}

function runToCols(r: Run): string[] {
  return [
    r.id, r.date, String(r.distanceKm), String(r.durationSec),
    r.pacePerKm, String(r.hrAvg ?? ""), String(r.effort ?? ""),
    r.source, r.stravaId ?? "", r.notes,
  ];
}

function colsToNutrition(row: string[]): NutritionEntry {
  return {
    id:           row[0],
    date:         row[1],
    time:         row[2],
    mealType:     (row[3] as NutritionEntry["mealType"]) || "general",
    items:        row[4] ? row[4].split("|") : [],
    caloriesKcal: row[5] ? parseFloat(row[5]) : null,
    carbsG:       row[6] ? parseFloat(row[6]) : null,
    proteinG:     row[7] ? parseFloat(row[7]) : null,
    fatG:         row[8] ? parseFloat(row[8]) : null,
    fluidMl:      row[9] ? parseFloat(row[9]) : null,
    photoUrl:     row[10] || null,
    aiAnalyzed:   row[11] === "true",
  };
}

function nutritionToCols(n: NutritionEntry): string[] {
  return [
    n.id, n.date, n.time, n.mealType,
    n.items.join("|"),
    String(n.caloriesKcal ?? ""), String(n.carbsG ?? ""),
    String(n.proteinG ?? ""), String(n.fatG ?? ""),
    String(n.fluidMl ?? ""), n.photoUrl ?? "",
    String(n.aiAnalyzed),
  ];
}

function colsToReview(row: string[]): DailyReview {
  return {
    id:        row[0],
    date:      row[1],
    summary:   row[2],
    score:     row[3] ? parseFloat(row[3]) : null,
    flags:     row[4] ? row[4].split("|") : [],
    source:    (row[5] as DailyReview["source"]) || "auto",
    createdAt: row[6] || "",
  };
}

function colsToPlan(row: string[]): PlannedDay {
  return {
    week:        parseInt(row[0]) || 0,
    day:         row[1],
    date:        row[2],
    type:        (row[3] as PlannedDay["type"]) || "rest",
    distanceKm:  row[4] ? parseFloat(row[4]) : null,
    paceTarget:  row[5] || null,
    notes:       row[6] || "",
  };
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export async function getPlan(): Promise<PlannedDay[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.plan}!A2:G`,
  });
  return (res.data.values || []).map(r => colsToPlan(r.map(String)));
}

export async function getPlanDay(date: string): Promise<PlannedDay | null> {
  const plan = await getPlan();
  return plan.find(d => d.date === date) ?? null;
}

// ─── Runs ─────────────────────────────────────────────────────────────────────

export async function getRuns(): Promise<Run[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.runs}!A2:J`,
  });
  return (res.data.values || []).map(r => colsToRun(r.map(String)));
}

export async function getRunByDate(date: string): Promise<Run | null> {
  const runs = await getRuns();
  return runs.find(r => r.date === date) ?? null;
}

export async function getRunsByDate(date: string): Promise<Run[]> {
  const runs = await getRuns();
  return runs.filter(r => r.date === date && r.distanceKm >= 1);
}

export async function upsertRun(run: Run): Promise<void> {
  const sheets = getSheets();
  const all = await getRuns();
  const idx = all.findIndex(r => r.id === run.id || r.stravaId === run.stravaId);

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.runs}!A:J`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [runToCols(run)] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.runs}!A${idx + 2}:J${idx + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [runToCols(run)] },
    });
  }
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export async function getNutritionByDate(date: string): Promise<NutritionEntry[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.nutrition}!A2:L`,
  });
  return (res.data.values || [])
    .map(r => colsToNutrition(r.map(String)))
    .filter(n => n.date === date);
}

export async function addNutritionEntry(entry: NutritionEntry): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.nutrition}!A:L`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [nutritionToCols(entry)] },
  });
}

export async function getNutritionHistory(days = 30): Promise<NutritionEntry[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.nutrition}!A2:L`,
  });
  return (res.data.values || []).map(r => colsToNutrition(r.map(String)));
}

// ─── Reviews ─────────────────────────────────────────────────────────────────

export async function getReviews(): Promise<DailyReview[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.reviews}!A2:G`,
  });
  return (res.data.values || []).map(r => colsToReview(r.map(String)));
}

export async function getReviewByDate(date: string): Promise<DailyReview | null> {
  const reviews = await getReviews();
  return reviews.find(r => r.date === date) ?? null;
}

export async function saveReview(review: DailyReview): Promise<void> {
  const sheets = getSheets();
  const all = await getReviews();
  const idx = all.findIndex(r => r.date === review.date);
  const cols = [
    review.id, review.date, review.summary,
    String(review.score ?? ""), review.flags.join("|"),
    review.source, review.createdAt,
  ];

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.reviews}!A:G`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [cols] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.reviews}!A${idx + 2}:G${idx + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [cols] },
    });
  }
}

// ─── Q&A ──────────────────────────────────────────────────────────────────────

export async function saveQA(entry: QAEntry): Promise<void> {
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.qa}!A:E`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[entry.id, entry.date, entry.question, entry.answer, entry.createdAt]],
    },
  });
}

export async function getQAHistory(): Promise<QAEntry[]> {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.qa}!A2:E`,
  });
  return (res.data.values || []).map(r => ({
    id: r[0], date: r[1], question: r[2], answer: r[3], createdAt: r[4],
  }));
}

// ─── Daily Notes ─────────────────────────────────────────────────────────────

export async function getNoteByDate(date: string): Promise<DailyNote | null> {
  const sheets = getSheets();
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.notes}!A2:C`,
    });
    const row = (res.data.values || []).find(r => r[0] === date);
    if (!row) return null;
    return { date: row[0], note: row[1] || "", updatedAt: row[2] || "" };
  } catch { return null; }
}

export async function saveNote(note: DailyNote): Promise<void> {
  const sheets = getSheets();
  // Ensure Notes tab exists
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const exists = meta.data.sheets?.some(s => s.properties?.title === TABS.notes);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        requestBody: { requests: [{ addSheet: { properties: { title: TABS.notes } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${TABS.notes}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["Date", "Note", "UpdatedAt"]] },
      });
    }
  } catch { /* tab may already exist */ }

  const all = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TABS.notes}!A2:C`,
  });
  const rows = all.data.values || [];
  const idx  = rows.findIndex(r => r[0] === note.date);
  const cols = [note.date, note.note, note.updatedAt];

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.notes}!A:C`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [cols] },
    });
  } else {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${TABS.notes}!A${idx + 2}:C${idx + 2}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [cols] },
    });
  }
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

export async function getCompletedDaysCount(): Promise<number> {
  const runs = await getRuns();
  return runs.length;
}

export async function getWeeklyStats(weekNumber: number) {
  const plan   = await getPlan();
  const runs   = await getRuns();
  const weekPlan = plan.filter(d => d.week === weekNumber);
  const weekDates = weekPlan.map(d => d.date);
  const weekRuns  = runs.filter(r => weekDates.includes(r.date));

  const totalPlanned = weekPlan.reduce((s, d) => s + (d.distanceKm ?? 0), 0);
  const totalActual  = weekRuns.reduce((s, r) => s + r.distanceKm, 0);

  return { weekPlan, weekRuns, totalPlanned, totalActual };
}
