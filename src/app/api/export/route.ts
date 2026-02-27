import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, vision, goals, scope } = body;

    // Create the Word document
    const doc = new Document({
      styles: {
        default: {
          document: {
            run: {
              font: "Calibri",
              size: 24 // 12pt
            }
          }
        }
      },
      sections: [
        {
          properties: {},
          children: [
            // Title
            new Paragraph({
              children: [
                new TextRun({
                  text: "Klant in Beeld",
                  bold: true,
                  size: 48, // 24pt
                  color: "003366"
                })
              ],
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 }
            }),

            // Subtitle
            new Paragraph({
              children: [
                new TextRun({
                  text: "Geconsolideerde Visie, Doelen & Scope",
                  size: 32,
                  color: "666666"
                })
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 }
            }),

            // Visie Section Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "1. Visie",
                  bold: true,
                  size: 36,
                  color: "003366"
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),

            // Huidige situatie
            new Paragraph({
              children: [
                new TextRun({
                  text: "Huidige situatie",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: vision?.currentSituation || "Niet ingevuld",
                  size: 24
                })
              ],
              spacing: { after: 200 }
            }),

            // Gewenste situatie
            new Paragraph({
              children: [
                new TextRun({
                  text: "Gewenste situatie",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: vision?.desiredSituation || "Niet ingevuld",
                  size: 24
                })
              ],
              spacing: { after: 200 }
            }),

            // Beweging
            new Paragraph({
              children: [
                new TextRun({
                  text: "Beweging",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: vision?.changeDirection || "Niet ingevuld",
                  size: 24
                })
              ],
              spacing: { after: 400 }
            }),

            // Doelen Section Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "2. Doelen",
                  bold: true,
                  size: 36,
                  color: "003366"
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),

            // Goals
            ...(goals || []).map(
              (goal: { rank: number; text: string }) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `${goal.rank}. ${goal.text || "Niet ingevuld"}`,
                      size: 24
                    })
                  ],
                  spacing: { after: 100 }
                })
            ),

            // Scope Section Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. Scope",
                  bold: true,
                  size: 36,
                  color: "003366"
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
            }),

            // Out of scope subheader
            new Paragraph({
              children: [
                new TextRun({
                  text: "Buiten scope",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),

            // Scope items
            ...(scope?.outOfScope || ["Niet ingevuld"]).map(
              (item: string) =>
                new Paragraph({
                  children: [
                    new TextRun({
                      text: `• ${item.replace(/^[•\-]\s*/, "")}`,
                      size: 24
                    })
                  ],
                  spacing: { after: 50 }
                })
            ),

            // Footer
            new Paragraph({
              children: [
                new TextRun({
                  text: "",
                  size: 24
                })
              ],
              spacing: { before: 600 }
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Gegenereerd op ${new Date().toLocaleDateString("nl-NL", {
                    day: "numeric",
                    month: "long",
                    year: "numeric"
                  })}`,
                  size: 20,
                  color: "999999",
                  italics: true
                })
              ],
              alignment: AlignmentType.RIGHT
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Cito - Programma Klant in Beeld",
                  size: 20,
                  color: "999999",
                  italics: true
                })
              ],
              alignment: AlignmentType.RIGHT
            })
          ]
        }
      ]
    });

    // Generate the document buffer
    const buffer = await Packer.toBuffer(doc);

    // Return the document as a download
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Klant-in-Beeld-Export.docx"`
      }
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Fout bij het exporteren" },
      { status: 500 }
    );
  }
}
