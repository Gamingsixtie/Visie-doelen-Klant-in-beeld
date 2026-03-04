import { NextRequest, NextResponse } from "next/server";

// In-memory storage for session sync (in production, use Redis or similar)
const sessionSyncStore: Map<string, { data: unknown; timestamp: number }> = new Map();

// Clean up old entries every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  for (const [key, value] of sessionSyncStore.entries()) {
    if (now - value.timestamp > MAX_AGE) {
      sessionSyncStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

// POST: Save session data for sharing
export async function POST(request: NextRequest) {
  try {
    const { sessionId, sessionData } = await request.json();

    if (!sessionId || !sessionData) {
      return NextResponse.json(
        { error: "sessionId and sessionData are required" },
        { status: 400 }
      );
    }

    // Store session data
    sessionSyncStore.set(sessionId, {
      data: sessionData,
      timestamp: Date.now()
    });

    return NextResponse.json({
      success: true,
      message: "Session data saved for sharing",
      syncUrl: `/sessies/${sessionId}?sync=true`
    });
  } catch (error) {
    console.error("Error saving session sync data:", error);
    return NextResponse.json(
      { error: "Failed to save session data" },
      { status: 500 }
    );
  }
}

// GET: Retrieve session data for syncing
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    const stored = sessionSyncStore.get(sessionId);

    if (!stored) {
      return NextResponse.json(
        { error: "Session not found or expired", available: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      available: true,
      sessionData: stored.data,
      lastUpdated: stored.timestamp
    });
  } catch (error) {
    console.error("Error retrieving session sync data:", error);
    return NextResponse.json(
      { error: "Failed to retrieve session data" },
      { status: 500 }
    );
  }
}
