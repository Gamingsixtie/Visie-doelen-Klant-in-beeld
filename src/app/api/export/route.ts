import { NextRequest, NextResponse } from "next/server";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

// Split long text into separate paragraphs for readability
function textToParagraphs(text: string, options?: { size?: number; italics?: boolean }): Paragraph[] {
  const size = options?.size ?? 24;
  const italics = options?.italics ?? false;

  if (!text || text.trim() === "") {
    return [
      new Paragraph({
        children: [new TextRun({ text: "Niet ingevuld", size, italics: true })],
        spacing: { after: 200 }
      })
    ];
  }

  // Split on double newlines (explicit paragraphs) or fall back to single newlines
  const blocks = text.includes("\n\n")
    ? text.split(/\n\n+/)
    : text.split(/\n/);

  return blocks
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block, index, arr) =>
      new Paragraph({
        children: [new TextRun({ text: block, size, italics })],
        spacing: { after: index < arr.length - 1 ? 120 : 200 }
      })
    );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vision, goals, scope, generatedVision } = body;

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
            ...textToParagraphs(vision?.currentSituation),

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
            ...textToParagraphs(vision?.desiredSituation),

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
            ...textToParagraphs(vision?.changeDirection),

            // Belanghebbenden
            new Paragraph({
              children: [
                new TextRun({
                  text: "Belanghebbenden",
                  bold: true,
                  size: 28
                })
              ],
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            }),
            ...textToParagraphs(vision?.stakeholders),

            // Generated Vision (if available)
            ...(generatedVision?.uitgebreid
              ? [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: "Programmavisie Klant in Beeld",
                        bold: true,
                        size: 28
                      })
                    ],
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 300, after: 100 }
                  }),
                  ...textToParagraphs(generatedVision.uitgebreid),
                  ...(generatedVision.beknopt
                    ? [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: "Beknopte visie",
                              bold: true,
                              italics: true,
                              size: 24
                            })
                          ],
                          spacing: { before: 200, after: 50 }
                        }),
                        ...textToParagraphs(generatedVision.beknopt, { italics: true })
                      ]
                    : [])
                ]
              : []),

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
            ...(goals || []).flatMap(
              (goal: { rank: number; text: string }) => {
                const goalText = goal.text || "Niet ingevuld";
                const lines = goalText.split(/\n+/).map((l: string) => l.trim()).filter((l: string) => l.length > 0);

                if (lines.length <= 1) {
                  return [
                    new Paragraph({
                      children: [
                        new TextRun({ text: `${goal.rank}. ${goalText}`, size: 24 })
                      ],
                      spacing: { after: 150 }
                    })
                  ];
                }

                // First line with rank number, rest as continuation paragraphs
                return [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `${goal.rank}. ${lines[0]}`, size: 24 })
                    ],
                    spacing: { after: 80 }
                  }),
                  ...lines.slice(1).map((line: string, i: number) =>
                    new Paragraph({
                      children: [
                        new TextRun({ text: line, size: 24 })
                      ],
                      indent: { left: 360 },
                      spacing: { after: i < lines.length - 2 ? 80 : 150 }
                    })
                  )
                ];
              }
            ),

            // Scope Section Header
            new Paragraph({
              children: [
                new TextRun({
                  text: "3. Buiten scope",
                  bold: true,
                  size: 36,
                  color: "003366"
                })
              ],
              heading: HeadingLevel.HEADING_1,
              spacing: { before: 400, after: 200 }
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
