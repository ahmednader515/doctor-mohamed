import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!newPassword) {
            return new NextResponse("New password is required", { status: 400 });
        }

        // Get user
        const user = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // If user has a password, verify current password
        if (user.hashedPassword && currentPassword) {
            const isPasswordValid = await bcrypt.compare(currentPassword, user.hashedPassword);
            if (!isPasswordValid) {
                return new NextResponse("Current password is incorrect", { status: 400 });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await db.user.update({
            where: {
                id: userId
            },
            data: {
                hashedPassword
            }
        });

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error) {
        console.error("[USER_PASSWORD_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

