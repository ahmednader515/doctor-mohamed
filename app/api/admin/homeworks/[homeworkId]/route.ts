import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ homeworkId: string }> }
) {
  try {
    const { userId, user } = await auth();
    const resolvedParams = await params;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { homeworkId } = resolvedParams;

    const homework = await db.homework.findUnique({
      where: { id: homeworkId },
      select: {
        id: true,
        courseId: true,
      },
    });

    if (!homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.homeworkQuestion.deleteMany({
        where: { homeworkId },
      });

      await tx.homework.delete({
        where: { id: homeworkId },
      });

      const remainingHomeworks = await tx.homework.findMany({
        where: { courseId: homework.courseId },
        orderBy: { position: "asc" },
        select: { id: true, position: true },
      });

      await Promise.all(
        remainingHomeworks.map((remainingHomework, index) =>
          remainingHomework.position === index + 1
            ? Promise.resolve()
            : tx.homework.update({
                where: { id: remainingHomework.id },
                data: { position: index + 1 },
              })
        )
      );
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_HOMEWORK_DELETE]", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

