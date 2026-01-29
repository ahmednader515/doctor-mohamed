import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const { fullName, phoneNumber, parentPhoneNumber, role, grade, semester, subject } = await req.json();

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Prevent admin from editing staff accounts (ADMIN or TEACHER)
        if (existingUser.role === "ADMIN" || existingUser.role === "TEACHER") {
            return new NextResponse("Cannot edit staff accounts. Only student accounts can be edited.", { status: 403 });
        }

        // Prevent changing student role to TEACHER
        if (role === "TEACHER" && existingUser.role === "USER") {
            return new NextResponse("Cannot change student role to teacher. Only student and admin roles are allowed.", { status: 403 });
        }

        // Check if phone number is already taken by another user
        if (phoneNumber && phoneNumber !== existingUser.phoneNumber) {
            const phoneExists = await db.user.findUnique({
                where: {
                    phoneNumber: phoneNumber
                }
            });

            if (phoneExists) {
                return new NextResponse("Phone number already exists", { status: 400 });
            }
        }

        // Check if parent phone number is already taken by another user
        if (parentPhoneNumber && parentPhoneNumber !== existingUser.parentPhoneNumber) {
            const parentPhoneExists = await db.user.findFirst({
                where: {
                    parentPhoneNumber: parentPhoneNumber,
                    id: {
                        not: userId
                    }
                }
            });

            if (parentPhoneExists) {
                return new NextResponse("Parent phone number already exists", { status: 400 });
            }
        }

        // Update user
        const updatedUser = await db.user.update({
            where: {
                id: userId
            },
            data: {
                ...(fullName && { fullName }),
                ...(phoneNumber && { phoneNumber }),
                ...(parentPhoneNumber !== undefined && { parentPhoneNumber }),
                ...(role && { role }),
                ...(grade !== undefined && { grade }),
                ...(semester !== undefined && { semester }),
                ...(subject !== undefined && { subject })
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[ADMIN_USER_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (session.user.role !== "ADMIN") {
            return new NextResponse("Forbidden", { status: 403 });
        }

        // Check if user exists
        const existingUser = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Prevent admin from deleting themselves
        if (userId === session.user.id) {
            return new NextResponse("Cannot delete your own account", { status: 400 });
        }

        // Prevent admin from deleting staff accounts (ADMIN or TEACHER)
        if (existingUser.role === "ADMIN" || existingUser.role === "TEACHER") {
            return new NextResponse("Cannot delete staff accounts. Only student accounts can be deleted.", { status: 403 });
        }

        // Delete user (this will cascade delete related data due to Prisma relations)
        await db.user.delete({
            where: {
                id: userId
            }
        });

        return NextResponse.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("[ADMIN_USER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
