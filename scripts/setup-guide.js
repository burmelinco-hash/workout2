/**
 * setup-guide.js
 * Run: node scripts/setup-guide.js
 * Interactive checklist — guides you through the 4 credential steps.
 */

const fs   = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

const ENV_PATH = path.join(__dirname, "../.env.local");

function readEnv() {
  if (!fs.existsSync(ENV_PATH)) return {};
  return Object.fromEntries(
    fs.readFileSync(ENV_PATH, "utf8")
      .split("\n")
      .filter(l => l.includes("=") && !l.startsWith("#"))
      .map(l => [l.split("=")[0].trim(), l.slice(l.indexOf("=") + 1).trim()])
  );
}

function writeEnv(obj) {
  const lines = Object.entries(obj).map(([k, v]) => `${k}=${v}`).join("\n");
  fs.writeFileSync(ENV_PATH, lines + "\n", "utf8");
}

async function main() {
  console.clear();
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   26.2 Marathon Tracker — Credential Setup           ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");
  console.log("This guide sets up the 4 credentials you need.\n");
  console.log("I'll open the right URLs in your browser as we go.\n");

  let env = readEnv();

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Anthropic API Key
  // ─────────────────────────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────┐");
  console.log("│  STEP 1 — Anthropic API Key                         │");
  console.log("└─────────────────────────────────────────────────────┘");
  console.log("   1. Go to: https://console.anthropic.com/settings/keys");
  console.log("   2. Click \"Create Key\"");
  console.log("   3. Copy the key (starts with sk-ant-)\n");

  const anthropicKey = await ask("   Paste your Anthropic API key: ");
  env.ANTHROPIC_API_KEY = anthropicKey.trim();
  writeEnv(env);
  console.log("   ✅  Saved\n");

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Google Sheets
  // ─────────────────────────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────┐");
  console.log("│  STEP 2 — Google Sheets                             │");
  console.log("└─────────────────────────────────────────────────────┘");
  console.log("   A. Create a new Google Sheet:");
  console.log("      → https://sheets.new");
  console.log("      Name it: \"Marathon Tracker\"");
  console.log("      Copy the ID from the URL:");
  console.log("      https://docs.google.com/spreadsheets/d/[THIS PART]/edit\n");

  const sheetId = await ask("   Paste the Spreadsheet ID: ");
  env.GOOGLE_SPREADSHEET_ID = sheetId.trim();
  writeEnv(env);

  console.log("\n   B. Create a Google Cloud Service Account:");
  console.log("      1. Go to: https://console.cloud.google.com");
  console.log("      2. Create a new project → name it \"marathon-tracker\"");
  console.log("      3. Enable Google Sheets API:");
  console.log("         → https://console.cloud.google.com/apis/library/sheets.googleapis.com");
  console.log("      4. Go to: IAM & Admin → Service Accounts → Create Service Account");
  console.log("         Name: marathon-tracker-bot");
  console.log("      5. Click the service account → Keys → Add Key → JSON");
  console.log("         Download the JSON file\n");
  console.log("   C. Share your Google Sheet with the service account email");
  console.log("      (it looks like: marathon-tracker-bot@your-project.iam.gserviceaccount.com)");
  console.log("      Give it Editor permission.\n");

  const jsonPath = await ask("   Paste the full path to the downloaded JSON file: ");
  const jsonContent = fs.readFileSync(jsonPath.trim(), "utf8").replace(/\n/g, "");
  env.GOOGLE_SERVICE_ACCOUNT_JSON = jsonContent;
  writeEnv(env);
  console.log("   ✅  Saved\n");

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Strava API
  // ─────────────────────────────────────────────────────────────────────────
  console.log("┌─────────────────────────────────────────────────────┐");
  console.log("│  STEP 3 — Strava API                                │");
  console.log("└─────────────────────────────────────────────────────┘");
  console.log("   1. Go to: https://www.strava.com/settings/api");
  console.log("   2. Create an app (or use existing one):");
  console.log("      App Name: Marathon Tracker");
  console.log("      Category: Other");
  console.log("      Website: http://localhost:3000");
  console.log("      Authorization Callback Domain: localhost\n");

  const stravaClientId = await ask("   Paste your Strava Client ID: ");
  const stravaSecret   = await ask("   Paste your Strava Client Secret: ");
  env.STRAVA_CLIENT_ID     = stravaClientId.trim();
  env.STRAVA_CLIENT_SECRET = stravaSecret.trim();
  env.STRAVA_ACCESS_TOKEN  = "";
  env.STRAVA_REFRESH_TOKEN = "";
  env.STRAVA_EXPIRES_AT    = "";
  writeEnv(env);
  console.log("   ✅  Saved (tokens will be filled after first OAuth)\n");

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: App URL
  // ─────────────────────────────────────────────────────────────────────────
  env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  writeEnv(env);

  // ─────────────────────────────────────────────────────────────────────────
  // Done — what to do next
  // ─────────────────────────────────────────────────────────────────────────
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  ✅  All credentials saved to .env.local             ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  NEXT STEPS:                                         ║");
  console.log("║                                                      ║");
  console.log("║  1. Seed the Google Sheet:                           ║");
  console.log("║     node scripts/setup-sheets.js                    ║");
  console.log("║                                                      ║");
  console.log("║  2. Start the app:                                   ║");
  console.log("║     npm run dev                                      ║");
  console.log("║                                                      ║");
  console.log("║  3. Connect Strava (first time only):                ║");
  console.log("║     Open: http://localhost:3000/api/strava/auth      ║");
  console.log("║     Copy the 3 tokens shown → paste into .env.local ║");
  console.log("║                                                      ║");
  console.log("║  4. Deploy to Vercel:                                ║");
  console.log("║     npx vercel                                       ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  rl.close();
}

main().catch(err => {
  console.error("Error:", err.message);
  rl.close();
  process.exit(1);
});
