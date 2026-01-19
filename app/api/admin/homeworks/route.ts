import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId, user } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const homeworks = await db.homework.findMany({
      include: {
        course: { select: { id: true, title: true } },
        questions: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(homeworks);
  } catch (e) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

