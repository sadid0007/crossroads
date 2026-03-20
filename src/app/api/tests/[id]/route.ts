import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const test = await prisma.testPack.findUnique({
      where: { id },
      include: {
        sections: {
          orderBy: { orderIndex: "asc" },
          include: {
            passagesOrPrompts: {
              orderBy: { orderIndex: "asc" },
              include: { asset: true },
            },
            questionGroups: {
              orderBy: { orderIndex: "asc" },
              include: {
                questions: { orderBy: { orderIndex: "asc" } },
                linkedPassage: true,
              },
            },
          },
        },
        scoringConfigs: { where: { isActive: true } },
      },
    });

    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    return NextResponse.json({ test });
  } catch (error) {
    console.error("Test detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
