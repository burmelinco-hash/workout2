/**
 * setup-sheets.js — node scripts/setup-sheets.js
 * 26-week marathon plan: May 31, 2026 → November 29, 2026
 * Race: Amazing Thailand Marathon Bangkok — Nov 29, 2026
 *
 * Schedule: 4 days/week
 *   SUN (0): Long run  — 9:15–9:45/km — start 6:00AM
 *   MON (1): REST
 *   TUE (2): Easy      — 8:45–9:15/km — start 6:45AM
 *   WED (3): REST
 *   THU (4): Medium    — 9:00–9:30/km — start 6:45AM
 *   FRI (5): Easy      — 8:45–9:15/km — start 6:45AM
 *   SAT (6): REST
 */

require("dotenv").config({ path: ".env.local" });
const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDS          = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const auth   = new google.auth.GoogleAuth({ credentials: CREDS, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });

// ─── Constants ────────────────────────────────────────────────────────────────
const START_DATE = new Date("2026-05-31"); // Sunday — Week 1, Day 1
const DAY_NAMES  = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

const TABS = [
  { name: "Plan",      headers: ["Week","Day","Date","Type","DistanceKm","PaceTarget","Notes"] },
  { name: "Runs",      headers: ["ID","Date","DistanceKm","DurationSec","PacePerKm","HRAvg","Effort","Source","StravaID","Notes"] },
  { name: "Nutrition", headers: ["ID","Date","Time","MealType","Items","CaloriesKcal","CarbsG","ProteinG","FatG","FluidMl","PhotoUrl","AIAnalyzed"] },
  { name: "Reviews",   headers: ["ID","Date","Summary","Score","Flags","Source","CreatedAt"] },
  { name: "QA",        headers: ["ID","Date","Question","Answer","CreatedAt"] },
  { name: "Notes",     headers: ["Date","Note","UpdatedAt"] },
];

function dateOfDay(week, dayIndex) {
  const d = new Date(START_DATE);
  d.setDate(d.getDate() + (week - 1) * 7 + dayIndex);
  return d.toISOString().slice(0, 10);
}

// ─── 26-WEEK PLAN ─────────────────────────────────────────────────────────────
// [week, dayIndex, type, distKm|null, paceTarget|null, notes]
// Only running days listed — rest days auto-filled below
//
// Phases:
//  Base    Weeks  1–8  (May 31 – Jul 25)  — easy + long run only
//  Build   Weeks  9–17 (Jul 26 – Sep 26)  — add medium effort, long runs to 30km
//  Peak    Weeks 18–22 (Sep 27 – Nov  1)  — peak volume + long runs to 32km
//  Taper   Weeks 23–26 (Nov  2 – Nov 29)  — race week

const RUNNING_DAYS = [

  // ═══════════════════════════════════════════════════════
  // PHASE 1 — BASE (Weeks 1–8, May 31 – Jul 25)
  // Build aerobic foundation. Easy runs only.
  // Long run builds 12 → 21km. Pace discipline is everything.
  // ═══════════════════════════════════════════════════════

  // Week 1 (May 31 – Jun 6) — First week of official plan
  [1, 0, "long",  12, "9:15–9:45/km", "Week 1 long run. Run embarrassingly slow. Start 6:00AM. This pace feels wrong — it's not."],
  [1, 2, "easy",   6, "8:45–9:15/km", "Easy aerobic run. Nasal breathing test: if you must breathe through your mouth, slow down."],
  [1, 4, "easy",   7, "8:45–9:15/km", "Easy medium run. Same effort as Tuesday — controlled, comfortable."],
  [1, 5, "easy",   5, "8:45–9:15/km", "Short easy run. Legs prep for Sunday."],

  // Week 2 (Jun 7–13)
  [2, 0, "long",  14, "9:15–9:45/km", "14km. Start 6:00AM. Bring water. Takes ~2:15h. No watch-staring."],
  [2, 2, "easy",   6, "8:45–9:15/km", "Easy run. Focus on relaxed shoulders and steady breathing."],
  [2, 4, "easy",   8, "8:45–9:15/km", "Easy medium. Midweek aerobic work."],
  [2, 5, "easy",   6, "8:45–9:15/km", "Easy shakeout before Sunday."],

  // Week 3 (Jun 14–20)
  [3, 0, "long",  16, "9:15–9:45/km", "16km. Start 6:00AM. Gel at km 10. First run over 15km — slow from km 1."],
  [3, 2, "easy",   7, "8:45–9:15/km", "Easy run. Body is adapting — let it."],
  [3, 4, "easy",   9, "8:45–9:15/km", "Easy medium run. Longest midweek so far."],
  [3, 5, "easy",   6, "8:45–9:15/km", "Easy run. Rest well tonight."],

  // Week 4 — DELOAD (Jun 21–27)
  [4, 0, "long",  12, "9:15–9:45/km", "Deload long run. 12km only. Body consolidates gains during rest — not during runs."],
  [4, 2, "easy",   5, "8:45–9:15/km", "Short easy. Deload week."],
  [4, 4, "easy",   6, "8:45–9:15/km", "Easy medium. Keep it light."],
  [4, 5, "easy",   4, "8:45–9:15/km", "Very short easy run. Legs should feel fresh."],

  // Week 5 (Jun 28 – Jul 4)
  [5, 0, "long",  17, "9:15–9:45/km", "17km. Start 6:00AM. Gel at km 10 and km 15. Back to building after deload."],
  [5, 2, "easy",   7, "8:45–9:15/km", "Easy run. Post-deload energy — don't go faster."],
  [5, 4, "easy",   9, "8:45–9:15/km", "Easy medium run."],
  [5, 5, "easy",   6, "8:45–9:15/km", "Easy run."],

  // Week 6 (Jul 5–11)
  [6, 0, "long",  19, "9:15–9:45/km", "19km. Start 6:00AM. Gel at 10km and 16km. Takes ~3h. This is serious long run territory now."],
  [6, 2, "easy",   7, "8:45–9:15/km", "Easy run. 19km takes 2 days to absorb."],
  [6, 4, "easy",  10, "8:45–9:15/km", "Easy medium. Longest midweek yet."],
  [6, 5, "easy",   6, "8:45–9:15/km", "Easy run."],

  // Week 7 (Jul 12–18)
  [7, 0, "long",  21, "9:15–9:45/km", "MILESTONE: 21km — half marathon. Start 6:00AM. Gel every 45min from km 0. You've run this before — now do it slow and in control."],
  [7, 2, "easy",   7, "8:45–9:15/km", "Easy run. Half marathon day after needs easy recovery."],
  [7, 4, "easy",  10, "8:45–9:15/km", "Easy medium run."],
  [7, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 8 — DELOAD (Jul 19–25)
  [8, 0, "long",  14, "9:15–9:45/km", "Deload long run. 14km. Your fitness is growing — deload protects it."],
  [8, 2, "easy",   5, "8:45–9:15/km", "Short easy. Deload week."],
  [8, 4, "easy",   7, "8:45–9:15/km", "Easy medium. Keep it easy."],
  [8, 5, "easy",   4, "8:45–9:15/km", "Short easy run."],

  // ═══════════════════════════════════════════════════════
  // PHASE 2 — BUILD (Weeks 9–17, Jul 26 – Sep 26)
  // Long runs push past 21km. Medium runs get slightly harder.
  // Goal: aerobic engine development, time on feet.
  // ═══════════════════════════════════════════════════════

  // Week 9 (Jul 26 – Aug 1)
  [9, 0, "long",  22, "9:15–9:45/km", "22km — beyond half marathon. Start 5:45AM. Gel every 40 min from start. Walk 30s every 5km is smart, not weak."],
  [9, 2, "easy",   8, "8:45–9:15/km", "Easy run. 22km leaves residual fatigue for 2 days."],
  [9, 4, "medium", 10, "9:00–9:30/km", "Medium run. Slightly more effort than easy — controlled, steady."],
  [9, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 10 (Aug 2–8)
  [10, 0, "long",  24, "9:15–9:45/km", "24km. Start 5:45AM. Gel at km 0, 10, 18. Takes ~3:50h. Mental strength workout."],
  [10, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [10, 4, "medium", 11, "9:00–9:30/km", "Medium run."],
  [10, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 11 (Aug 9–15)
  [11, 0, "long",  26, "9:15–9:45/km", "26km. Start 5:30AM. Bangkok heat is serious — gels every 40min, 500ml/hour. This is your longest ever. Go slow from km 1."],
  [11, 2, "easy",   8, "8:45–9:15/km", "Easy run. 26km takes 3 full days to recover from."],
  [11, 4, "medium", 11, "9:00–9:30/km", "Medium run."],
  [11, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 12 — DELOAD (Aug 16–22)
  [12, 0, "long",  16, "9:15–9:45/km", "Deload long run. After 26km last week, 16km feels like recovery — it IS recovery."],
  [12, 2, "easy",   6, "8:45–9:15/km", "Short easy. Deload."],
  [12, 4, "medium",  8, "9:00–9:30/km", "Easy medium. Keep volume low."],
  [12, 5, "easy",   5, "8:45–9:15/km", "Short easy run."],

  // Week 13 (Aug 23–29)
  [13, 0, "long",  27, "9:15–9:45/km", "27km. Start 5:30AM. Full race-day nutrition protocol. You are building the marathon engine."],
  [13, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [13, 4, "medium", 12, "9:00–9:30/km", "Medium run. Longest midweek run."],
  [13, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 14 (Aug 30 – Sep 5)
  [14, 0, "long",  28, "9:15–9:45/km", "28km. Start 5:30AM. This is elite-amateur long run territory. Gel at 0, 10, 18, 24km."],
  [14, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [14, 4, "medium", 12, "9:00–9:30/km", "Medium run."],
  [14, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 15 (Sep 6–12)
  [15, 0, "long",  30, "9:15–9:45/km", "30km. Start 5:15AM. RACE-DAY SIMULATION: same breakfast, same gels, same kit. Takes ~4:45h. After this run, your body knows the marathon distance."],
  [15, 2, "easy",   8, "8:45–9:15/km", "Easy run. 30km needs 3 days of easy movement."],
  [15, 4, "medium", 12, "9:00–9:30/km", "Medium run."],
  [15, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 16 — DELOAD (Sep 13–19)
  [16, 0, "long",  18, "9:15–9:45/km", "Deload after 30km. 18km feels short now — your aerobic engine has grown."],
  [16, 2, "easy",   6, "8:45–9:15/km", "Short easy. Deload."],
  [16, 4, "medium",  8, "9:00–9:30/km", "Easy medium."],
  [16, 5, "easy",   5, "8:45–9:15/km", "Short easy."],

  // Week 17 (Sep 20–26)
  [17, 0, "long",  29, "9:15–9:45/km", "29km. Start 5:30AM. One of your last big long runs. Trust the pace — slow now, fast on race day."],
  [17, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [17, 4, "medium", 12, "9:00–9:30/km", "Medium run."],
  [17, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // ═══════════════════════════════════════════════════════
  // PHASE 3 — PEAK (Weeks 18–22, Sep 27 – Nov 1)
  // Maximum long runs. Volume peaks. Race fitness builds.
  // ═══════════════════════════════════════════════════════

  // Week 18 (Sep 27 – Oct 3)
  [18, 0, "long",  31, "9:15–9:45/km", "31km. Start 5:15AM. Second biggest training run. Full race-day protocol. Gel every 40min from start. This is what the race feels like at km 31."],
  [18, 2, "easy",   8, "8:45–9:15/km", "Easy run. Your body needs 3-4 days to recover from 31km."],
  [18, 4, "medium", 12, "9:00–9:30/km", "Medium run."],
  [18, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 19 — DELOAD (Oct 4–10)
  [19, 0, "long",  19, "9:15–9:45/km", "Deload after peak. 19km. Body rebuilds fitness during rest."],
  [19, 2, "easy",   6, "8:45–9:15/km", "Short easy."],
  [19, 4, "medium",  8, "9:00–9:30/km", "Easy medium."],
  [19, 5, "easy",   5, "8:45–9:15/km", "Short easy."],

  // Week 20 (Oct 11–17)
  [20, 0, "long",  32, "9:15–9:45/km", "PEAK LONG RUN: 32km. Start 5:00AM. TREAT EXACTLY LIKE RACE DAY. Same pre-run meal, same gels, same kit. After this run you KNOW you can finish 42.2km. The last 10km on race day will be new territory — but you will be ready."],
  [20, 2, "easy",   8, "8:45–9:15/km", "Easy run. 32km needs 4 days to absorb. Go easy."],
  [20, 4, "medium", 11, "9:00–9:30/km", "Medium run."],
  [20, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 21 (Oct 18–24)
  [21, 0, "long",  24, "9:15–9:45/km", "24km. Body is absorbing 32km fitness. Notice how 24km feels comfortable now vs Week 10."],
  [21, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [21, 4, "medium", 11, "9:00–9:30/km", "Medium run."],
  [21, 5, "easy",   7, "8:45–9:15/km", "Easy run."],

  // Week 22 (Oct 25–31)
  [22, 0, "long",  28, "9:15–9:45/km", "Last long run over 20km. 28km. Start 5:30AM. Race is 4 weeks away — run conservatively."],
  [22, 2, "easy",   8, "8:45–9:15/km", "Easy run."],
  [22, 4, "medium", 10, "9:00–9:30/km", "Medium run."],
  [22, 5, "easy",   6, "8:45–9:15/km", "Easy run."],

  // ═══════════════════════════════════════════════════════
  // PHASE 4 — TAPER (Weeks 23–26, Nov 2 – Nov 29)
  // Volume drops. Fitness is LOCKED IN.
  // DO NOT add extra km — every extra km costs you on race day.
  // Taper madness is real: you will feel heavy and undertrained.
  // This is glycogen loading. You are getting stronger.
  // ═══════════════════════════════════════════════════════

  // Week 23 (Nov 2–8) — Taper begins
  [23, 0, "long",  20, "9:15–9:45/km", "TAPER BEGINS. 20km. Last run over 18km. TAPER MADNESS WARNING: you will feel flat and heavy. This is normal. Do NOT add km. Your fitness is locked in."],
  [23, 2, "easy",   7, "8:45–9:15/km", "Easy taper run. Feel fresh — don't chase it."],
  [23, 4, "medium",  8, "9:00–9:30/km", "Taper medium run. Maintain sharpness, reduce volume."],
  [23, 5, "easy",   5, "8:45–9:15/km", "Easy run."],

  // Week 24 (Nov 9–15)
  [24, 0, "long",  16, "9:15–9:45/km", "16km taper long run. Notice how this feels easy now vs Week 2. You have become a different runner."],
  [24, 2, "easy",   6, "8:45–9:15/km", "Easy taper run."],
  [24, 4, "medium",  7, "9:00–9:30/km", "Short medium run."],
  [24, 5, "easy",   5, "8:45–9:15/km", "Easy run. Keep routine."],

  // Week 25 (Nov 16–22) — Final sharpening
  [25, 0, "long",  12, "9:15–9:45/km", "12km easy. Last long run. Legs should feel springy — that's glycogen loading."],
  [25, 2, "easy",   6, "8:45–9:15/km", "Easy run. Final week of real training."],
  [25, 4, "easy",   5, "9:00–9:30/km", "Short easy run. Just keep the legs moving."],
  [25, 5, "easy",   4, "8:45–9:15/km", "20 min easy. Wake the legs up."],

  // Week 26 — RACE WEEK (Nov 23–29)
  [26, 0, "easy",   5, "9:00–9:30/km", "Easy 30 min. Keep routine. Don't overthink."],
  [26, 2, "easy",   4, "9:00–9:30/km", "Short jog + 4×100m strides. Wake the legs. Last real run before race."],
  [26, 4, "rest", null, null,           "FULL REST. Prepare race kit, bib, gels, nutrition plan."],
  [26, 5, "rest", null, null,           "REST. Carb load. Hydrate. Sleep early."],
  // Saturday Nov 28 = rest (SAT = index 6, handled below)
  // Sunday Nov 29 = RACE DAY
];

// Race day — Week 26, Sunday (day 0)
const RACE_DAY = [26, 0, "race", 42.2, "7:00–7:30/km", "RACE DAY — Amazing Thailand Marathon Bangkok. Start conservative at 7:15/km for first 30km. Gel every 40min from km 0. Smile at km 32 — you've run this far in training. The last 10km is yours."];

// ─── Build full 182-row plan (all 7 days × 26 weeks) ─────────────────────────

function buildFullPlan() {
  const runMap = {};
  // Index running days by "week-dayIndex"
  [...RUNNING_DAYS, RACE_DAY].forEach(row => {
    const [week, dayIndex] = row;
    runMap[`${week}-${dayIndex}`] = row;
  });

  const rows = [];
  for (let week = 1; week <= 26; week++) {
    for (let dayIndex = 0; dayIndex <= 6; dayIndex++) {
      const key = `${week}-${dayIndex}`;
      if (runMap[key]) {
        const [w, d, type, dist, pace, notes] = runMap[key];
        rows.push([w, DAY_NAMES[d], dateOfDay(w, d), type, dist ?? "", pace ?? "", notes]);
      } else {
        // Rest day
        rows.push([week, DAY_NAMES[dayIndex], dateOfDay(week, dayIndex), "rest", "", "", "Rest day."]);
      }
    }
  }
  return rows;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n Marathon Tracker — Sheet Setup\n");
  console.log(`Spreadsheet: ${SPREADSHEET_ID}\n`);

  const meta     = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existing = meta.data.sheets.map(s => s.properties.title);
  console.log(`Existing tabs: ${existing.join(", ")}\n`);

  // Create missing tabs
  const toCreate = TABS.filter(t => !existing.includes(t.name));
  if (toCreate.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: toCreate.map(t => ({ addSheet: { properties: { title: t.name } } })) },
    });
    console.log(`Created: ${toCreate.map(t => t.name).join(", ")}`);
  }

  // Write headers
  for (const tab of TABS) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${tab.name}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [tab.headers] },
    });
  }
  console.log("Headers written");

  // Clear and reseed Plan
  await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: "Plan!A2:G" });

  const planRows = buildFullPlan();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: "Plan!A2",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: planRows },
  });

  // Summary
  const today    = new Date(Date.now() + 7*60*60*1000).toISOString().slice(0, 10);
  const todayRow = planRows.find(r => r[2] === today);

  console.log(`\nPlan seeded: ${planRows.length} rows`);
  console.log(`Start: ${planRows[0][2]} (${planRows[0][1]}) — Week 1`);
  console.log(`End:   ${planRows[planRows.length-1][2]} (${planRows[planRows.length-1][1]}) — Race day`);
  if (todayRow) {
    console.log(`\nToday (${today}): Week ${todayRow[0]}, ${todayRow[1]}, ${todayRow[3]}${todayRow[4] ? `, ${todayRow[4]}km` : ""}`);
  }
  console.log("\nDone!\n");
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
