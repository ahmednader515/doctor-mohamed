import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ homeworkId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;

        console.log("[TEACHER_HOMEWORK_GET] Fetching homework:", resolvedParams.homeworkId, "for user:", userId);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the homework; all teachers can see all homeworks (same as list endpoint)
        const homework = await db.homework.findFirst({
            where: { id: resolvedParams.homeworkId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true
                    }
                },
                questions: {
                    select: {
                        id: true,
                        text: true,
                        type: true,
                        options: true,
                        correctAnswer: true,
                        points: true,
                        imageUrl: true,
                        position: true
                    },
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        if (!homework) {
            console.log("[TEACHER_HOMEWORK_GET] Homework not found for ID:", resolvedParams.homeworkId);
            return NextResponse.json({ error: "Homework not found" }, { status: 404 });
        }

        console.log("[TEACHER_HOMEWORK_GET] Homework found:", homework.id, "with", homework.questions.length, "questions");

        // Parse options for multiple choice questions
        const homeworkWithParsedOptions = {
            ...homework,
            questions: homework.questions.map(question => {
                try {
                    return {
                        ...question,
                        options: parseQuizOptions(question.options)
                    };
                } catch (parseError) {
                    console.log("[TEACHER_HOMEWORK_GET] Error parsing options for question:", question.id, parseError);
                    return {
                        ...question,
                        options: question.options ? JSON.parse(question.options) : null
                    };
                }
            })
        };

        return NextResponse.json(homeworkWithParsedOptions);
    } catch (error) {
        console.log("[TEACHER_HOMEWORK_GET] Error details:", error);
        console.log("[TEACHER_HOMEWORK_GET] Error stack:", (error as Error).stack);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ homeworkId: string }> }
) {
    try {
        const { userId, user } = await auth();
        const resolvedParams = await params;
        const { title, description, questions, position, timer, maxAttempts, courseId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get the current homework to know its course and owner
        const currentHomework = await db.homework.findUnique({
            where: { id: resolvedParams.homeworkId },
            select: { courseId: true, position: true, course: { select: { userId: true } } }
        });

        if (!currentHomework) {
            return NextResponse.json({ error: "Homework not found" }, { status: 404 });
        }

        // Admin or teacher can modify (all teachers can edit all homeworks)
        if (user?.role !== "ADMIN" && user?.role !== "TEACHER") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Use the courseId from request if provided, otherwise use current homework's courseId
        const targetCourseId = courseId || currentHomework.courseId;

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        // Handle position - use current position if not provided or invalid
        let homeworkPosition = position;
        if (!homeworkPosition || homeworkPosition <= 0) {
            homeworkPosition = currentHomework.position;
        }

        // Validate questions
        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
        }

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            // Question text or image is required
            if ((!question.text || !question.text.trim()) && !question.imageUrl) {
                return NextResponse.json({ error: `Question ${i + 1}: Text or image is required` }, { status: 400 });
            }

            if (question.type === "MULTIPLE_CHOICE") {
                if (!question.options || question.options.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 options are required` }, { status: 400 });
                }

                const validOptions = question.options.filter((option: string) => option && option.trim() !== "");
                if (validOptions.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 valid options are required` }, { status: 400 });
                }

                // For multiple choice, correctAnswer should be an index
                if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
                    return NextResponse.json({ error: `Question ${i + 1}: Valid correct answer index is required` }, { status: 400 });
                }
            } else if (question.type === "TRUE_FALSE") {
                if (!question.correctAnswer || (question.correctAnswer !== "true" && question.correctAnswer !== "false")) {
                    return NextResponse.json({ error: `Question ${i + 1}: Correct answer must be "true" or "false"` }, { status: 400 });
                }
            } else if (question.type === "SHORT_ANSWER") {
                if (!question.correctAnswer || !question.correctAnswer.toString().trim()) {
                    return NextResponse.json({ error: `Question ${i + 1}: Correct answer is required` }, { status: 400 });
                }
            }

            if (!question.points || question.points <= 0) {
                return NextResponse.json({ error: `Question ${i + 1}: Points must be greater than 0` }, { status: 400 });
            }
        }

        // Note: Position reordering is now handled by the separate reorder API
        // This API just updates the homework with the provided position

        // Update the homework without questions first
        const updatedHomework = await db.homework.update({
            where: {
                id: resolvedParams.homeworkId
            },
            data: {
                title,
                description,
                courseId: targetCourseId, // Update courseId if changed
                position: Number(homeworkPosition), // Explicitly cast to number
                timer: timer || null,
                maxAttempts: maxAttempts || 1
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                }
            }
        });

        // Delete existing questions
        await db.homeworkQuestion.deleteMany({
            where: {
                homeworkId: resolvedParams.homeworkId
            }
        });

        // Add questions separately
        if (questions.length > 0) {
            await db.homeworkQuestion.createMany({
                data: questions.map((question: any, index: number) => {
                    let correctAnswerValue = question.correctAnswer;
                    
                    // For multiple choice questions, convert index to actual option value
                    if (question.type === "MULTIPLE_CHOICE") {
                        const validOptions = question.options.filter((option: string) => option && option.trim() !== "");
                        correctAnswerValue = validOptions[question.correctAnswer];
                    }
                    
                    return {
                        text: question.text,
                        type: question.type,
                        options: question.type === "MULTIPLE_CHOICE" ? stringifyQuizOptions(question.options) : null,
                        correctAnswer: correctAnswerValue,
                        points: question.points,
                        imageUrl: question.imageUrl || null,
                        homeworkId: resolvedParams.homeworkId,
                        position: index + 1
                    };
                })
            });
        }

        // Fetch the updated homework with questions
        const homeworkWithQuestions = await db.homework.findUnique({
            where: { id: resolvedParams.homeworkId },
            include: {
                course: {
                    select: {
                        title: true
                    }
                },
                questions: {
                    orderBy: {
                        position: 'asc'
                    }
                }
            }
        });

        if (!homeworkWithQuestions) {
            return NextResponse.json({ error: "Failed to update homework" }, { status: 500 });
        }

        // Parse options for the response
        const homeworkWithParsedOptions = {
            ...homeworkWithQuestions,
            questions: homeworkWithQuestions.questions.map(question => ({
                ...question,
                options: parseQuizOptions(question.options)
            }))
        };

        return NextResponse.json(homeworkWithParsedOptions);
    } catch (error) {
        console.log("[HOMEWORK_PATCH]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

