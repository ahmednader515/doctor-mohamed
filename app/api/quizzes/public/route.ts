import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Get latest published quizzes with course information
        const quizzes = await db.quiz.findMany({
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
            take: 12 // Limit to latest 12 quizzes
        });

        return NextResponse.json(quizzes);
    } catch (error) {
        console.log("[PUBLIC_QUIZZES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

