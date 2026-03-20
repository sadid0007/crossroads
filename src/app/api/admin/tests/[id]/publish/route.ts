import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireRole(["admin", "super_admin"]);
    const { id } = await params;

    const testPack = await prisma.testPack.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            questionGroups: { include: { questions: true } },
            passagesOrPrompts: true,
          },
        },
        scoringConfigs: true,
      },
    });

    if (!testPack) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Create version snapshot
    const versionCount = await prisma.testPackVersion.count({ where: { testPackId: id } });
    const version = await prisma.testPackVersion.create({
      data: {
        testPackId: id,
        versionNumber: versionCount + 1,
        snapshotJson: JSON.stringify(testPack),
        publishedAt: new Date(),
      },
    });

    // Supersede old versions
    await prisma.testPackVersion.updateMany({
      where: { testPackId: id, id: { not: version.id } },
      data: { supersededAt: new Date() },
    });

    await prisma.testPack.update({
      where: { id },
      data: { publishedStatus: "published", currentVersionId: version.id },
    });

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorRole: user.role,
        action: "publish",
        entityType: "TestPack",
        entityId: id,
        newValueJson: JSON.stringify({ versionId: version.id }),
      },
    });

    return NextResponse.json({ published: true, version });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
