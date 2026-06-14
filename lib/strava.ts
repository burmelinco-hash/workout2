import axios from "axios";
import { StravaActivity, Run } from "./types";
import { format } from "date-fns";

const BASE_URL = "https://www.strava.com/api/v3";

// ─── Token management (single user — stored in env) ──────────────────────────

export interface StravaTokens {
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number; // Unix timestamp
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokens> {
  const res = await axios.post("https://www.strava.com/oauth/token", {
    client_id:     process.env.STRAVA_CLIENT_ID,
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    grant_type:    "refresh_token",
    refresh_token: refreshToken,
  });

  return {
    accessToken:  res.data.access_token,
    refreshToken: res.data.refresh_token,
    expiresAt:    res.data.expires_at,
  };
}

export async function getValidAccessToken(): Promise<string> {
  const accessToken  = process.env.STRAVA_ACCESS_TOKEN!;
  const refreshToken = process.env.STRAVA_REFRESH_TOKEN!;
  const expiresAt    = parseInt(process.env.STRAVA_EXPIRES_AT ?? "0");

  if (Date.now() / 1000 < expiresAt - 300) {
    return accessToken;
  }

  // Token expired → refresh
  const tokens = await refreshAccessToken(refreshToken);

  // NOTE: In production you'd persist these back. For now, just return the new one.
  // On Vercel you'd update the env vars via the Vercel API or use a KV store.
  return tokens.accessToken;
}

// ─── Auth URL (used on first setup) ──────────────────────────────────────────

export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id:     process.env.STRAVA_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
    response_type: "code",
    approval_prompt: "auto",
    scope:         "read,activity:read_all",
  });
  return `https://www.strava.com/oauth/authorize?${params}`;
}

// ─── Fetch activities ─────────────────────────────────────────────────────────

export async function fetchRecentActivities(afterDate?: Date): Promise<StravaActivity[]> {
  const token = await getValidAccessToken();
  const after = afterDate ? Math.floor(afterDate.getTime() / 1000) : undefined;

  const res = await axios.get(`${BASE_URL}/athlete/activities`, {
    headers: { Authorization: `Bearer ${token}` },
    params:  { per_page: 50, ...(after ? { after } : {}) },
  });

  // Include runs, walks/hikes, and football/soccer sessions
  return (res.data as StravaActivity[]).filter(a =>
    a.type === "Run" || a.type === "VirtualRun" ||
    a.type === "Walk" || a.type === "Hike" ||
    a.type === "Soccer" || a.type === "Football" ||
    a.name?.toLowerCase().includes("football") ||
    a.name?.toLowerCase().includes("soccer")
  );
}

// ─── Map Strava activity → our Run type ──────────────────────────────────────

export function isFootballActivity(activity: StravaActivity): boolean {
  return (
    activity.type === "Soccer" ||
    activity.type === "Football" ||
    activity.name?.toLowerCase().includes("football") ||
    activity.name?.toLowerCase().includes("soccer") || false
  );
}

// Convert UTC timestamp to Bangkok local date (UTC+7)
// Strava's start_date is always UTC; start_date_local depends on account timezone
// which may be set wrong. Using UTC+7 directly is always correct for Bangkok.
function toBangkokDate(utcString: string): string {
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // UTC+7
  const utc = new Date(utcString);
  const bangkok = new Date(utc.getTime() + BANGKOK_OFFSET_MS);
  return bangkok.toISOString().slice(0, 10);
}

export function stravaActivityToRun(activity: StravaActivity): Run {
  const distanceKm = activity.distance / 1000;
  const paceSecPerKm = distanceKm > 0 ? activity.moving_time / distanceKm : 0;
  const paceMin = Math.floor(paceSecPerKm / 60);
  const paceSec = Math.round(paceSecPerKm % 60);

  const isFootball = isFootballActivity(activity);
  const isWalk = activity.type === "Walk" || activity.type === "Hike";
  const activityName = isFootball
    ? `Football: ${activity.name}`
    : isWalk
    ? `Walk: ${activity.name}`
    : activity.name || "";

  return {
    id:          `strava-${activity.id}`,
    date:        toBangkokDate(activity.start_date), // always convert from UTC to Bangkok time
    distanceKm:  Math.round(distanceKm * 100) / 100,
    durationSec: activity.moving_time,
    pacePerKm:   distanceKm > 0 ? `${paceMin}:${String(paceSec).padStart(2, "0")}` : "0:00",
    hrAvg:       activity.average_heartrate ? Math.round(activity.average_heartrate) : null,
    effort:      activity.perceived_exertion ? Math.round(activity.perceived_exertion) : null,
    source:      "strava",
    stravaId:    String(activity.id),
    notes:       activityName,
  };
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
