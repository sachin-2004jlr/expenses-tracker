import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/health: liveness, database round-trip time and the serving region.
 * Confirms the function runs next to the database. Exposes no user data.
 */
export async function GET(): Promise<Response> {
  const region = process.env.VERCEL_REGION ?? "local";
  const started = performance.now();
  try {
    const db = await getDb();
    const connectMs = Math.round(performance.now() - started);
    const pingStarted = performance.now();
    await db.database.command({ ping: 1 });
    const pingMs = Math.round(performance.now() - pingStarted);
    return NextResponse.json({ status: "ok", region, database: { pingMs, connectMs } }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ status: "degraded", region, database: null }, { status: 503, headers: NO_STORE });
  }
}
