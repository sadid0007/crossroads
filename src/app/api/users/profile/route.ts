import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function PUT(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: body.name || user.name,
        targetBand: body.targetBand !== undefined ? body.targetBand : user.targetBand,
        phone: body.phone !== undefined ? body.phone : user.phone,
      },
    });

    return NextResponse.json({
      user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, targetBand: updated.targetBand },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
