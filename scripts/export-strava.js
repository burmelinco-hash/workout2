/**
 * export-strava.js
 * Run: node scripts/export-strava.js
 *
 * Fetches ALL Strava runs (all time, all pages) and writes them to
 * a new tab "Strava History" in your existing Google Sheet.
 * Columns: Date | Distance (km) | Pace (/km) | Duration | Type | Name
 */

require("dotenv").config({ path: ".env.local" });
const axios  = require("axios");
const { google } = require("googleapis");

const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const CREDS          = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

// ─── Google Sheets auth ───────────────────────────────────────────────────────
const auth   = new google.auth.GoogleAuth({ credentials: CREDS, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
const sheets = google.sheets({ version: "v4", auth });

// ─── Strava token ─────────────────────────────────────────────────────────────
async function getToken() {
  const expiresAt = parseInt(process.env.STRAVA_EXPIRES_AT ?? "0");
  if (Date.now() / 1000 < expiresAt - 300) return process.env.STRAVA_ACCESS_TOKEN;

  console.log("Refreshing Strava token...");
  const res = await axios.post("https://www.strava.com/oauth/token", {
    client_id:     process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type:    "refresh_token",
    refresh_token: process.env.STRAVA_REFRESH_TOKEN,
  });
  return res.data.access_token;
}

// ─── Fetch ALL activities (paginated) ────────────────────────────────────────
async function fetchAllActivities() {
  const token = await getToken();
  const all   = [];
  let page    = 1;

  console.log("Fetching all Strava activities...");

  while (true) {
    const res = await axios.get("https://www.strava.com/api/v3/athlete/activities", {
      headers: { Authorization: `Bearer ${token}` },
      params:  { per_page: 200, page },
    });

    const batch = res.data;
    if (!batch || batch.length === 0) break;

    all.push(...batch);
    console.log(`  Page ${page}: ${batch.length} activities (total so far: ${all.length})`);
    page++;

    if (batch.length < 200) break; // last page
  }

  return all;
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function toDate(utcString) {
  // Convert to Bangkok time (UTC+7)
  const d = new Date(new Date(utcString).getTime() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function toPace(distanceM, movingTimeSec) {
  if (!distanceM || distanceM < 10) return "—";
  const distKm     = distanceM / 1000;
  const secPerKm   = movingTimeSec / distKm;
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function toDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function toType(activity) {
  const type = (activity.type || "").toLowerCase();
  const name = (activity.name || "").toLowerCase();
  if (type === "soccer" || type === "football" || name.includes("football") || name.includes("soccer")) return "Football";
  if (type === "run" || type === "virtualrun") return "Run";
  return activity.type || "Other";
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const activities = await fetchAllActivities();
  console.log(`\nTotal activities fetched: ${activities.length}`);

  // Filter to runs + football only
  const relevant = activities.filter(a => {
    const t = (a.type || "").toLowerCase();
    const n = (a.name || "").toLowerCase();
    return ["run","virtualrun","soccer","football"].includes(t)
      || n.includes("football") || n.includes("soccer");
  });

  console.log(`Relevant runs + football: ${relevant.length}`);

  // Sort oldest → newest
  relevant.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  // Build rows
  const headers = ["Date", "Distance (km)", "Pace (/km)", "Duration", "Type", "Activity Name"];
  const rows = relevant.map(a => [
    toDate(a.start_date),
    a.distance ? (a.distance / 1000).toFixed(2) : "0",
    toPace(a.distance, a.moving_time),
    toDuration(a.moving_time),
    toType(a),
    a.name || "",
  ]);

  // ─── Write to sheet ──────────────────────────────────────────────────────────
  const TAB = "Strava History";

  // Create tab if missing
  const meta     = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const tabExists = meta.data.sheets.some(s => s.properties.title === TAB);

  if (!tabExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`Created tab: ${TAB}`);
  } else {
    // Clear existing data
    await sheets.spreadsheets.values.clear({ spreadsheetId: SPREADSHEET_ID, range: `${TAB}!A:F` });
    console.log(`Cleared existing tab: ${TAB}`);
  }

  // Write headers + data
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${TAB}!A1`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [headers, ...rows] },
  });

  // Auto-resize columns
  const sheetId = meta.data.sheets.find(s => s.properties.title === TAB)?.properties?.sheetId
    ?? (await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID }))
         .data.sheets.find(s => s.properties.title === TAB)?.properties?.sheetId;

  if (sheetId !== undefined) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{
          autoResizeDimensions: {
            dimensions: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: 6 },
          },
        }],
      },
    });
  }

  console.log(`\n✅ Done!`);
  console.log(`   Tab: "${TAB}"`);
  console.log(`   Rows written: ${rows.length}`);
  console.log(`   First run: ${rows[0]?.[0]} — ${rows[0]?.[4]} ${rows[0]?.[1]}km`);
  console.log(`   Last run:  ${rows[rows.length-1]?.[0]} — ${rows[rows.length-1]?.[4]} ${rows[rows.length-1]?.[1]}km`);
  console.log(`\n   Open: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`);
}

main().catch(err => { console.error("Error:", err.message); process.exit(1); });
