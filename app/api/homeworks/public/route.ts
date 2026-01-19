import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Get latest published homeworks with course information
        const homeworks = await db.homework.findMany({
            where: {
                isPublished: true,
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                        imageUrl: true,
                    }
                },
                questions: {
                    select: {
                        id: true,
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 12 // Limit to latest 12 homeworks
        });

        return NextResponse.json(homeworks);
    } catch (error) {
        console.log("[PUBLIC_HOMEWORKS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

