import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const user = await db.user.findUnique({
            where: {
                id: userId
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                grade: true,
                subject: true,
                semester: true,
                hashedPassword: true
            }
        });

        if (!user) {
            return new NextResponse("User not found", { status: 404 });
        }

        // Return user with hasPassword flag instead of hashedPassword
        const { hashedPassword, ...userWithoutPassword } = user;
        return NextResponse.json({
            ...userWithoutPassword,
            hasPassword: !!hashedPassword
        });
    } catch (error) {
        console.error("[USER_PROFILE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { fullName, phoneNumber, parentPhoneNumber, grade, subject, semester } = await req.json();

        // Get existing user
        const existingUser = await db.user.findUnique({
            where: {
                id: userId
            }
        });

        if (!existingUser) {
            return new NextResponse("User not found", { status: 404 });
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
                ...(parentPhoneNumber !== undefined && { parentPhoneNumber: parentPhoneNumber || null }),
                ...(grade !== undefined && { grade: grade || null }),
                ...(subject !== undefined && { subject: subject || null }),
                ...(semester !== undefined && { semester: semester || null })
            },
            select: {
                id: true,
                fullName: true,
                phoneNumber: true,
                parentPhoneNumber: true,
                grade: true,
                subject: true,
                semester: true
            }
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error("[USER_PROFILE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

