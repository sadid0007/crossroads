import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();

    const passage = await prisma.passageOrPrompt.create({
      data: {
        sectionId: body.sectionId,
        title: body.title,
        contentHtml: body.contentHtml,
        assetId: body.assetId,
        orderIndex: body.orderIndex || 0,
        paragraphAnchors: body.paragraphAnchors ? JSON.stringify(body.paragraphAnchors) : null,
      },
    });

    return NextResponse.json({ passage });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
