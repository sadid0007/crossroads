import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    await requireUser();
    const formData = await req.formData();
    const file = formData.get("audio") as File;
    const sectionAttemptId = formData.get("sectionAttemptId") as string;
    const partNumber = parseInt(formData.get("partNumber") as string);

    if (!file || !sectionAttemptId || !partNumber) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Save audio file
    const uploadDir = path.join(process.cwd(), "public", "uploads", "speaking");
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${sectionAttemptId}_part${partNumber}_${Date.now()}.webm`;
    const filePath = path.join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    // Create content asset
    const asset = await prisma.contentAsset.create({
      data: {
        type: "audio",
        storagePath: filePath,
        url: `/uploads/speaking/${fileName}`,
        mimeType: file.type,
        fileSizeBytes: file.size,
      },
    });

    // Create speaking submission
    const submission = await prisma.speakingSubmission.upsert({
      where: { id: `${sectionAttemptId}_part${partNumber}` },
      create: {
        id: `${sectionAttemptId}_part${partNumber}`,
        sectionAttemptId,
        partNumber,
        audioAssetId: asset.id,
        evaluationStatus: "pending",
      },
      update: {
        audioAssetId: asset.id,
      },
    });

    return NextResponse.json({ submission });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Speaking upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
