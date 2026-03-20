import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();

    const section = await prisma.section.create({
      data: {
        testPackId: body.testPackId,
        type: body.type,
        orderIndex: body.orderIndex || 0,
        instructionsText: body.instructionsText,
        timerSeconds: body.timerSeconds,
        navigationRules: body.navigationRules ? JSON.stringify(body.navigationRules) : null,
        interPartPause: body.interPartPause,
      },
    });

    return NextResponse.json({ section });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
