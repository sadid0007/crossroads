import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireRole(["admin", "super_admin"]);
    const body = await req.json();

    // Create question group if needed
    let groupId = body.groupId;
    if (!groupId) {
      const group = await prisma.questionGroup.create({
        data: {
          sectionId: body.sectionId,
          linkedPassageOrPromptId: body.passageId,
          title: body.groupTitle,
          instructionsText: body.groupInstructions,
          orderIndex: body.groupOrder || 0,
          partNumber: body.partNumber,
        },
      });
      groupId = group.id;
    }

    const question = await prisma.question.create({
      data: {
        groupId,
        type: body.type,
        text: body.text,
        optionsJson: body.options ? JSON.stringify(body.options) : null,
        answerSchemaJson: JSON.stringify(body.answer),
        answerVariantsJson: body.variants ? JSON.stringify(body.variants) : null,
        validationRules: body.validationRules ? JSON.stringify(body.validationRules) : null,
        explanationText: body.explanation,
        subSkillTags: body.subSkillTags ? JSON.stringify(body.subSkillTags) : null,
        marks: body.marks || 1,
        orderIndex: body.orderIndex || 0,
        audioTimestamp: body.audioTimestamp,
        imageUrl: body.imageUrl,
      },
    });

    return NextResponse.json({ question });
  } catch (error: unknown) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message === "Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: error.message === "Unauthorized" ? 401 : 403 });
    }
    console.error("Create question error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
