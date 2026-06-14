import Anthropic from "@anthropic-ai/sdk";
import { Run, NutritionEntry, PlannedDay, DailyReview } from "./types";
import { format } from "date-fns";

// Lazy client — created inside each call so env vars are always resolved
const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ─── System prompt shared across all calls ────────────────────────────────────

const SYSTEM_PROMPT = `You are Coach Marco — an elite marathon coach with 20+ years of experience coaching athletes from beginners to sub-3:00 runners. You have deep expertise in:

TRAINING SCIENCE:
- 80/20 polarized training (80% easy, 20% quality) — the backbone of all endurance development
- Periodization: base → build → peak → taper cycles
- Aerobic base development (MAF method, nasal breathing test)
- Lactate threshold work and VO2max development
- Long run physiology: fat adaptation, glycogen management, hitting the wall prevention
- Strava/GPS data analysis: pace, heart rate drift, training load, acute:chronic workload ratio
- Injury prevention: weekly volume increases max 10%, hard/easy alternation, deload weeks

YOUR ATHLETE:
- Training for their first marathon, target race: October 2026
- Training started: March 29, 2026
- Based in Bangkok, Thailand — heat (30-35°C) and humidity affect all pace targets by +30-60 sec/km
- Plays football (soccer) 1-2x per week — treat each football session as equivalent to a hard interval workout
- Current fitness: can run 10-12km comfortably, pace around 7:30-8:30/km
- CRITICAL ISSUE: athlete runs ALL runs too fast — easy runs should be 8:45-9:15/km but athlete historically runs 7:30-8:00/km. This will cause plateau and injury.

TRAINING SCHEDULE (4 days/week):
- Tuesday:   Easy run — 8:45–9:15/km
- Thursday:  Medium/easy run — 9:00–9:30/km
- Friday:    Easy run — 8:45–9:15/km
- Sunday:    Long run — 9:15–9:45/km (start 6:00AM)
- Mon/Wed/Sat: Full rest

PACE ZONES:
- Easy (Tue/Fri):   8:45–9:15/km
- Medium (Thu):     9:00–9:30/km
- Long run (Sun):   9:15–9:45/km
- Race day:         7:00–7:30/km (target finish ~5:00)
  NOTE: race pace is FASTER than training pace — this is correct.
  Training slow builds the aerobic engine that powers a faster race.

FOOTBALL SESSIONS:
- Never on plan — athlete plays whenever. Detected via Strava sync.
- Count as: high-intensity interval equivalent (60–90 min, multiple sprints)
- Always follow with Zone 1 recovery run or full rest day
- Never schedule intervals within 48 hours after football

MARATHON TRAINING PRINCIPLES:
1. The long run is sacred — never skip it, never run it too fast
2. Easy days MUST be easy — "easy" means embarrassingly slow
3. Deload every 4th week — drop volume 20-30%, maintain intensity
4. Nutrition for runs >75 min: gel every 40 min starting at km 0, 500ml fluid per hour
5. Bangkok start times: runs >15km must start before 6:30AM (beat the heat)
6. Sleep 8h minimum — this is when adaptation happens
7. Football counts as hard training — adjust the week accordingly

COACHING STYLE:
- Be direct and honest — if the athlete is making mistakes, say so clearly
- Give specific numbers, not vague advice ("run 9:45/km" not "run slower")
- Always explain the WHY behind each instruction
- Celebrate milestones but keep focus on the process
- Use the actual Strava data to personalize every response
- When asked about the plan, give specific workout details with sets, reps, paces
- Flag injury risks immediately and firmly

WHEN ANALYZING RUNS:
- Compare actual pace vs prescribed zone — anything >15 sec/km faster than target = flag
- Check heart rate if available — easy runs should be 130-145bpm max
- Note distance vs plan — being over by 10%+ in a week = overreaching
- Football sessions in Strava: analyze weekly load, suggest next day's workout
- Look for patterns: always running the same pace regardless of workout type = bad sign

Be the coach you'd want when training for your first marathon — honest, knowledgeable, and invested in this athlete's success.`;

// ─── Daily review ─────────────────────────────────────────────────────────────

export async function generateDailyReview(params: {
  date: string;
  plannedDay: PlannedDay | null;
  run: Run | null;
  nutrition: NutritionEntry[];
  recentRuns: Run[];
  weekNumber: number;
  athleteNote?: string | null;
}): Promise<{ summary: string; score: number | null; flags: string[] }> {
  const { date, plannedDay, run, nutrition, recentRuns, weekNumber, athleteNote } = params;

  const nutritionSummary = nutrition.length > 0
    ? nutrition.map(n =>
        `  - ${n.time} [${n.mealType}]: ${n.items.join(", ")} | ${n.caloriesKcal ?? "?"}kcal | ${n.carbsG ?? "?"}g carbs | ${n.fluidMl ?? "?"}ml fluid`
      ).join("\n")
    : "  No nutrition logged today.";

  const recentContext = recentRuns.slice(-5).map(r =>
    `  ${r.date}: ${r.distanceKm}km @ ${r.pacePerKm}/km${r.hrAvg ? ` HR${r.hrAvg}` : ""}`
  ).join("\n");

  const prompt = `
Date: ${date} (Training Week ${weekNumber}/24)

ATHLETE'S NOTE:
${athleteNote ? `"${athleteNote}" ← Use this to interpret today's workout correctly` : "No note from athlete"}

TODAY'S PLAN:
${plannedDay
  ? `  ${plannedDay.type.toUpperCase()} — ${plannedDay.distanceKm ?? "rest"}km @ ${plannedDay.paceTarget ?? "N/A"}/km\n  ${plannedDay.notes}`
  : "  No plan found for this date."}

TODAY'S ACTUAL RUN:
${run
  ? `  ${run.distanceKm}km @ ${run.pacePerKm}/km | Duration: ${Math.floor(run.durationSec / 60)}min${run.hrAvg ? ` | HR: ${run.hrAvg}bpm` : ""}${run.effort ? ` | Effort: ${run.effort}/10` : ""}\n  Notes: ${run.notes || "none"}`
  : "  No run logged today."}

TODAY'S NUTRITION:
${nutritionSummary}

RECENT RUNS (last 5):
${recentContext || "  No recent runs."}

Please provide:
1. A concise daily review (3–5 sentences) covering: run execution vs plan, nutrition quality, recovery signals.
2. A score from 1–10 for today's training day.
3. Up to 3 flags/action items for tomorrow (e.g., "PACE: ran too fast — stay in easy zone tomorrow").

Format your response as JSON:
{
  "summary": "...",
  "score": 8,
  "flags": ["FLAG1: ...", "FLAG2: ..."]
}`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.content[0] as Anthropic.TextBlock).text;
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return {
      summary: json.summary ?? text,
      score:   typeof json.score === "number" ? json.score : null,
      flags:   Array.isArray(json.flags) ? json.flags : [],
    };
  } catch {
    return { summary: text, score: null, flags: [] };
  }
}

// ─── Meal photo analysis ──────────────────────────────────────────────────────

export async function analyzeMealPhoto(base64Image: string, mediaType: string): Promise<{
  items: string[];
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  fluidMl: number | null;
  mealType: NutritionEntry["mealType"];
  confidence: "high" | "medium" | "low";
}> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `Analyze this meal/food photo for a marathon runner. Identify all food and drink items visible, then estimate nutritional values.

Return JSON only:
{
  "items": ["item1", "item2"],
  "caloriesKcal": 450,
  "carbsG": 65,
  "proteinG": 25,
  "fatG": 12,
  "fluidMl": 500,
  "mealType": "pre-run",
  "confidence": "medium"
}

For mealType: "pre-run" (light, carb-focused), "post-run" (protein+carb recovery), "during-run" (gels/bars/fluids), or "general".
For fluidMl: estimate only if drinks are clearly visible, otherwise null.
For confidence: "high" if food is clearly identifiable, "medium" if partially, "low" if unclear.`,
          },
        ],
      },
    ],
  });

  const text = (response.content[0] as Anthropic.TextBlock).text;
  try {
    const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
    return {
      items:        Array.isArray(json.items) ? json.items : [],
      caloriesKcal: json.caloriesKcal ?? null,
      carbsG:       json.carbsG ?? null,
      proteinG:     json.proteinG ?? null,
      fatG:         json.fatG ?? null,
      fluidMl:      json.fluidMl ?? null,
      mealType:     json.mealType ?? "general",
      confidence:   json.confidence ?? "low",
    };
  } catch {
    return {
      items: [], caloriesKcal: null, carbsG: null, proteinG: null,
      fatG: null, fluidMl: null, mealType: "general", confidence: "low",
    };
  }
}

// ─── On-demand chat ───────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(params: {
  messages: ChatMessage[];
  context: {
    weekNumber: number;
    recentRuns: Run[];
    recentReviews: DailyReview[];
    todayPlan: PlannedDay | null;
    todayRun?: Run | null;
    todayDate?: string;
    todayLabel?: string;
    athleteNote?: string | null;
  };
}): Promise<string> {
  const { messages, context } = params;

  const todayDate  = context.todayDate  ?? format(new Date(), "yyyy-MM-dd");
  const todayLabel = context.todayLabel ?? format(new Date(), "EEEE, MMMM d, yyyy");

  const contextBlock = `
╔══════════════════════════════════════════╗
║  TODAY: ${todayLabel.padEnd(32)} ║
║  DATE:  ${todayDate.padEnd(32)} ║
║  WEEK:  ${String(context.weekNumber).padEnd(2)} / 24  (started March 29, 2026)    ║
╚══════════════════════════════════════════╝

TODAY'S PLAN:
${context.todayPlan
  ? `${context.todayPlan.type.toUpperCase()} — ${context.todayPlan.distanceKm ?? "rest"}km @ ${context.todayPlan.paceTarget ?? "easy"}\n${context.todayPlan.notes}`
  : "No plan for today"
}

TODAY'S ACTUAL RUN (${todayDate}):
${context.todayRun
  ? `${context.todayRun.distanceKm}km @ ${context.todayRun.pacePerKm}/km | ${Math.floor(context.todayRun.durationSec/60)}min${context.todayRun.hrAvg ? ` | HR ${context.todayRun.hrAvg}` : ""} | "${context.todayRun.notes}"`
  : "No run logged today"
}

RECENT RUN HISTORY (sorted oldest → newest):
${context.recentRuns.map(r =>
  `  ${r.date}${r.date === todayDate ? " ← TODAY" : ""}: ${r.distanceKm}km @ ${r.pacePerKm}/km${r.hrAvg ? ` HR${r.hrAvg}` : ""}${r.notes ? ` — "${r.notes}"` : ""}`
).join("\n") || "No recent runs"}

LAST REVIEW: ${context.recentReviews[0]?.score ?? "N/A"}/10 — ${context.recentReviews[0]?.summary?.slice(0, 100) ?? "No review yet"}

ATHLETE'S NOTE FOR TODAY:
${context.athleteNote
  ? `"${context.athleteNote}" ← READ THIS FIRST — athlete has explained today's context`
  : "No note left by athlete"
}

⚠ CRITICAL: The date in the box above is the ACTUAL CURRENT DATE. Runs marked "← TODAY" happened today. All other dates are in the past. Do NOT use any other date as "today". If athlete left a note, use it to interpret their workout correctly.`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: SYSTEM_PROMPT + "\n\n" + contextBlock,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  return (response.content[0] as Anthropic.TextBlock).text;
}
