import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { parseQuizOptions, stringifyQuizOptions } from "@/lib/utils";

export async function GET(req: Request) {
    try {
        const { userId } = await auth();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get all homeworks (all teachers can see all homeworks)
        const homeworks = await db.homework.findMany({
            where: {},
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
            },
            orderBy: {
                position: "asc"
            }
        });

        // Parse options for multiple choice questions
        const homeworksWithParsedOptions = homeworks.map(homework => ({
            ...homework,
            questions: homework.questions.map(question => ({
                ...question,
                options: parseQuizOptions(question.options)
            }))
        }));

        return NextResponse.json(homeworksWithParsedOptions);
    } catch (error) {
        console.log("[TEACHER_HOMEWORKS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId, user } = await auth();
        const { title, description, courseId, questions, position, timer, maxAttempts } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const isAdmin = user?.role === "ADMIN";

        // Validate required fields
        if (!title || !title.trim()) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        if (!courseId) {
            return NextResponse.json({ error: "Course ID is required" }, { status: 400 });
        }

        // Verify the course exists and belongs to the teacher (unless admin)
        const course = await db.course.findUnique({
            where: {
                id: courseId,
            },
            select: {
                id: true,
                userId: true,
            },
        });

        if (!course) {
            return NextResponse.json({ error: "Course not found" }, { status: 404 });
        }

        const isTeacher = user?.role === "TEACHER";
        if (!isAdmin && !isTeacher && course.userId !== userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Get the next position if not provided
        let homeworkPosition = position;
        if (!homeworkPosition || homeworkPosition <= 0) {
            const lastHomework = await db.homework.findFirst({
                where: {
                    courseId: courseId
                },
                orderBy: {
                    position: 'desc'
                }
            });
            homeworkPosition = lastHomework ? lastHomework.position + 1 : 1;
        }

        // Validate questions
        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: "At least one question is required" }, { status: 400 });
        }

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            if (!question.text || !question.text.trim()) {
                return NextResponse.json({ error: `Question ${i + 1}: Text is required` }, { status: 400 });
            }

            if (question.type === "MULTIPLE_CHOICE") {
                if (!question.options || question.options.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 options are required` }, { status: 400 });
                }

                const validOptions = question.options.filter((option: string) => option && option.trim() !== "");
                if (validOptions.length < 2) {
                    return NextResponse.json({ error: `Question ${i + 1}: At least 2 valid options are required` }, { status: 400 });
                }

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

        // Create the homework
        const homework = await db.homework.create({
            data: {
                title,
                description,
                position: Number(homeworkPosition),
                courseId,
                timer: timer || null,
                maxAttempts: maxAttempts || 1,
            },
            include: {
                course: {
                    select: {
                        title: true
                    }
                }
            }
        });
        
        // Add the questions separately
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
                        homeworkId: homework.id,
                        position: index + 1
                    };
                })
            });
        }
        
        // Fetch the homework with questions
        const homeworkWithQuestions = await db.homework.findUnique({
            where: { id: homework.id },
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
            return NextResponse.json({ error: "Failed to create homework" }, { status: 500 });
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
        console.log("[TEACHER_HOMEWORKS_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

