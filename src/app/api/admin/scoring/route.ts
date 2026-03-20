import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();

    // Deactivate existing configs for this test/section
    await prisma.scoringConfig.updateMany({
      where: { testPackId: body.testPackId, sectionType: body.sectionType },
      data: { isActive: false },
    });

    const config = await prisma.scoringConfig.create({
      data: {
        testPackId: body.testPackId,
        sectionType: body.sectionType,
        rawToBandMap: JSON.stringify(body.rawToBandMap),
        roundingRules: body.roundingRules ? JSON.stringify(body.roundingRules) : null,
        isActive: true,
      },
    });

    return NextResponse.json({ config });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
