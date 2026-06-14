import { NextRequest, NextResponse } from "next/server";
import { chat, ChatMessage } from "@/lib/claude";
import { getRuns, getReviews, getPlanDay, getRunByDate, getNoteByDate } from "@/lib/sheets";
import { saveQA } from "@/lib/sheets";
import { format } from "date-fns";
import { randomUUID } from "crypto";

// Bangkok time (UTC+7) — always use this for date calculations
function getBangkokDate(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10);
}

function getBangkokLabel(): string {
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${days[now.getUTCDay()]}, ${months[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages: ChatMessage[] = body.messages ?? [];

    const today      = getBangkokDate();
    const todayLabel = getBangkokLabel();

    const [allRuns, allReviews, todayPlan, todayRun, todayNote] = await Promise.all([
      getRuns(),
      getReviews(),
      getPlanDay(today),
      getRunByDate(today),
      getNoteByDate(today),
    ]);

    // Sort runs by date ascending, most recent last
    const recentRuns    = [...allRuns].sort((a,b) => a.date.localeCompare(b.date)).slice(-10);
    const recentReviews = allReviews.slice(-7);
    const weekNumber    = todayPlan?.week ?? 1;

    // Stamp the CURRENT DATE onto the last user message so Claude always knows
    // the exact date and can't confuse run history dates with today
    const stampedMessages: ChatMessage[] = messages.map((m, i) => {
      if (i === messages.length - 1 && m.role === "user") {
        return {
          role: "user",
          content: `[CURRENT DATE: ${todayLabel} | Bangkok time]\n\n${m.content}`,
        };
      }
      return m;
    });

    const answer = await chat({
      messages: stampedMessages,
      context: {
        weekNumber,
        recentRuns,
        recentReviews,
        todayPlan,
        todayRun,
        todayDate:  today,
        todayLabel,
        athleteNote: todayNote?.note || null,
      },
    });

    // Save Q&A
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      await saveQA({
        id:        randomUUID(),
        date:      today,
        question:  lastUserMsg.content,
        answer,
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: true, answer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chat failed";
    console.error("Chat error:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
