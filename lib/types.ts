// ─── Core domain types ────────────────────────────────────────────────────────

export interface PlannedDay {
  week: number;
  day: string;          // MON, TUE, …, SUN
  date: string;         // YYYY-MM-DD
  type: WorkoutType;
  distanceKm: number | null;
  paceTarget: string | null;
  notes: string;
}

export type WorkoutType =
  | "easy"
  | "tempo"
  | "interval"
  | "long"
  | "rest"
  | "football"
  | "recovery"
  | "race";

export interface Run {
  id: string;
  date: string;         // YYYY-MM-DD
  distanceKm: number;
  durationSec: number;
  pacePerKm: string;    // "8:45"
  hrAvg: number | null;
  effort: number | null; // 1–10 RPE
  source: "strava" | "manual";
  stravaId: string | null;
  notes: string;
}

export interface NutritionEntry {
  id: string;
  date: string;         // YYYY-MM-DD
  time: string;         // HH:MM
  mealType: "pre-run" | "during-run" | "post-run" | "general";
  items: string[];
  caloriesKcal: number | null;
  carbsG: number | null;
  proteinG: number | null;
  fatG: number | null;
  fluidMl: number | null;
  photoUrl: string | null;
  aiAnalyzed: boolean;
}

export interface DailyReview {
  id: string;
  date: string;         // YYYY-MM-DD
  summary: string;
  score: number | null; // 1–10
  flags: string[];
  source: "auto" | "manual";
  createdAt: string;
}

export interface DailyNote {
  date: string;       // YYYY-MM-DD
  note: string;
  updatedAt: string;
}

export interface QAEntry {
  id: string;
  date: string;
  question: string;
  answer: string;
  createdAt: string;
}

// ─── API response shapes ──────────────────────────────────────────────────────

export interface TodayData {
  plannedDay: PlannedDay | null;
  runs: Run[];
  nutrition: NutritionEntry[];
  review: DailyReview | null;
  weekNumber: number;
  totalWeeks: number;
  completedDays: number;
  totalDays: number;
}

export interface StravaActivity {
  id: number;
  name: string;
  distance: number;       // metres
  moving_time: number;    // seconds
  average_heartrate?: number;
  perceived_exertion?: number;
  start_date: string;       // always UTC — use this for reliable date conversion
  start_date_local: string; // depends on Strava account timezone (may be wrong)
  type: string;
}
