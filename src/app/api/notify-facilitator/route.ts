import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const FACILITATOR_EMAIL = "pim.deburger@cito.nl";

export async function POST(request: NextRequest) {
  try {
    const { memberName, sessionName, stepType, readyCount, totalMembers } = await request.json();

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not configured, skipping email notification");
      return NextResponse.json({ success: true, skipped: true });
    }

    const resend = new Resend(apiKey);

    const stepLabels: Record<string, string> = {
      doelen: "Doelen",
      scope: "Scope",
      visie_huidige: "Visie - Huidige situatie",
      visie_gewenste: "Visie - Gewenste situatie",
      visie_beweging: "Visie - Beweging",
      visie_stakeholders: "Visie - Stakeholders"
    };

    const stepLabel = stepLabels[stepType] || stepType;

    await resend.emails.send({
      from: "Klant in Beeld <onboarding@resend.dev>",
      to: FACILITATOR_EMAIL,
      subject: `${memberName} is klaar met feedback - ${stepLabel}`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #1e40af;">${memberName} is klaar met feedback geven</h2>
          <p><strong>${memberName}</strong> heeft aangegeven klaar te zijn met het geven van feedback op <strong>${stepLabel}</strong>.</p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #166534;">
              ${readyCount}/${totalMembers} leden klaar
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px;">Sessie: ${sessionName || "Onbekend"}</p>
        </div>
      `
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notify facilitator error:", error);
    return NextResponse.json({ success: false, error: "Email verzenden mislukt" }, { status: 500 });
  }
}
