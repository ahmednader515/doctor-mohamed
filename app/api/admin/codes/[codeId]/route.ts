import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ codeId: string }> }
) {
  try {
    const { codeId } = await params;
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if code exists
    const code = await db.purchaseCode.findUnique({
      where: { id: codeId },
    });

    if (!code) {
      return new NextResponse("Code not found", { status: 404 });
    }

    // Delete the code (admins can delete any code)
    await db.purchaseCode.delete({
      where: { id: codeId },
    });

    return NextResponse.json({ message: "Code deleted successfully" });
  } catch (error) {
    console.error("[ADMIN_CODES_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

