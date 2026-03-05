import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!url || !key) {
    return NextResponse.json({
      error: "Supabase not configured",
      hasUrl: !!url,
      hasKey: !!key
    });
  }

  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("sessions")
      .select("id, name, status, current_step")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      configured: true,
      url: url.substring(0, 30) + "...",
      sessions: data,
      error: error?.message || null
    });
  } catch (e) {
    return NextResponse.json({
      error: String(e)
    });
  }
}
