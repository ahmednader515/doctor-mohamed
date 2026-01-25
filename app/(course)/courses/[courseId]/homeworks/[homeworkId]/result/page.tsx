"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle, XCircle, Award } from "lucide-react";
import { parseQuizOptions } from "@/lib/utils";

interface HomeworkAnswer {
    questionId: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    question: {
        text: string;
        type: string;
        points: number;
        options?: string | string[] | null;
        imageUrl?: string | null;
    };
}

interface HomeworkResult {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    answers: HomeworkAnswer[];
}

interface Homework {
    id: string;
    title: string;
    maxAttempts: number;
}

export default function HomeworkResultPage({
    params,
}: {
    params: Promise<{ courseId: string; homeworkId: string }>;
}) {
    const router = useRouter();
    const { courseId, homeworkId } = use(params);
    const [result, setResult] = useState<HomeworkResult | null>(null);
    const [homework, setHomework] = useState<Homework | null>(null);
    const [loading, setLoading] = useState(true);
    const [willRedirectToDashboard, setWillRedirectToDashboard] = useState(false);

    useEffect(() => {
        fetchResult();
        fetchHomework();
        checkNextContent();
    }, [homeworkId]);

    const fetchResult = async () => {
        try {
            // Try to get result from API endpoint
            const response = await fetch(`/api/courses/${courseId}/homeworks/${homeworkId}/result`);
            if (response.ok) {
                const data = await response.json();
                const parsedData = {
                    ...data,
                    answers: data.answers.map((answer: any) => {
                        // Parse options if they exist and are not already an array
                        let parsedOptions = answer.question.options;
                        if (parsedOptions && !Array.isArray(parsedOptions)) {
                            if (typeof parsedOptions === 'string') {
                                parsedOptions = parseQuizOptions(parsedOptions);
                            } else {
                                parsedOptions = null;
                            }
                        }
                        
                        return {
                            ...answer,
                            question: {
                                ...answer.question,
                                options: parsedOptions
                            }
                        };
                    })
                };
                console.log("Fetched result data:", parsedData);
                setResult(parsedData);
            } else {
                // If no result endpoint, try to get from sessionStorage (stored after submission)
                const storedResult = sessionStorage.getItem(`homework-result-${homeworkId}`);
                if (storedResult) {
                    const data = JSON.parse(storedResult);
                    const parsedData = {
                        ...data,
                        answers: data.answers.map((answer: any) => ({
                            ...answer,
                            question: {
                                ...answer.question,
                                options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                            }
                        }))
                    };
                    setResult(parsedData);
                } else {
                    console.error("No result found");
                }
            }
        } catch (error) {
            console.error("Error fetching result:", error);
            // Try sessionStorage as fallback
            const storedResult = sessionStorage.getItem(`homework-result-${homeworkId}`);
            if (storedResult) {
                const data = JSON.parse(storedResult);
                const parsedData = {
                    ...data,
                    answers: data.answers.map((answer: any) => ({
                        ...answer,
                        question: {
                            ...answer.question,
                            options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                        }
                    }))
                };
                setResult(parsedData);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchHomework = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/homeworks/${homeworkId}`);
            if (response.ok) {
                const data = await response.json();
                setHomework({
                    id: data.id,
                    title: data.title,
                    maxAttempts: data.maxAttempts || 1
                });
            }
        } catch (error) {
            console.error("Error fetching homework:", error);
        }
    };

    const checkNextContent = async () => {
        try {
            const contentResponse = await fetch(`/api/courses/${courseId}/content`);
            if (contentResponse.ok) {
                const allContent = await contentResponse.json();
                
                // Find the current homework in the content array
                const currentIndex = allContent.findIndex((content: any) => 
                    content.id === homeworkId && content.type === 'homework'
                );
                
                // If no next content, set flag to show dashboard button
                if (currentIndex === -1 || currentIndex >= allContent.length - 1) {
                    setWillRedirectToDashboard(true);
                }
            } else {
                setWillRedirectToDashboard(true);
            }
        } catch (error) {
            console.error("Error checking next content:", error);
            setWillRedirectToDashboard(true);
        }
    };

    const handleNextChapter = async () => {
        try {
            // Get all course content (chapters, quizzes, and homeworks) sorted by position
            const contentResponse = await fetch(`/api/courses/${courseId}/content`);
            if (contentResponse.ok) {
                const allContent = await contentResponse.json();
                
                // Find the current homework in the content array
                const currentIndex = allContent.findIndex((content: any) => 
                    content.id === homeworkId && content.type === 'homework'
                );
                
                if (currentIndex !== -1 && currentIndex < allContent.length - 1) {
                    const nextContent = allContent[currentIndex + 1];
                    if (nextContent.type === 'chapter') {
                        router.push(`/courses/${courseId}/chapters/${nextContent.id}`);
                    } else if (nextContent.type === 'quiz') {
                        router.push(`/courses/${courseId}/quizzes/${nextContent.id}`);
                    } else if (nextContent.type === 'homework') {
                        router.push(`/courses/${courseId}/homeworks/${nextContent.id}`);
                    }
                } else {
                    // If no next content, go to dashboard
                    router.push(`/dashboard`);
                }
            } else {
                // Fallback to dashboard
                router.push(`/dashboard`);
            }
        } catch (error) {
            console.error("Error navigating to next chapter:", error);
            // Fallback to dashboard
            router.push(`/dashboard`);
        }
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-primary";
        if (percentage >= 80) return "text-primary/90";
        if (percentage >= 70) return "text-primary/80";
        if (percentage >= 60) return "text-amber-600";
        return "text-destructive";
    };

    const formatAnswer = (answer: string, questionType: string) => {
        if (questionType === "TRUE_FALSE") {
            return answer === "true" ? "صح" : "خطأ";
        }
        return answer;
    };

    const renderQuestionChoices = (answer: HomeworkAnswer) => {
        // Only render for multiple choice questions
        if (answer.question.type !== "MULTIPLE_CHOICE") {
            return null;
        }
        
        // Get options - they should already be parsed from fetchResult
        let options = answer.question.options;
        
        // If options is null, undefined, or empty, return null
        if (!options) {
            return null;
        }
        
        // If it's already an array, use it directly
        if (!Array.isArray(options)) {
            // If it's a string, try to parse it
            if (typeof options === 'string') {
                options = parseQuizOptions(options);
            } else {
                return null;
            }
        }
        
        // Final check - must be a non-empty array
        if (!Array.isArray(options) || options.length === 0) {
            return null;
        }
        
        // Render the choices
        return (
                <div className="space-y-2 mt-3">
                    <h5 className="font-medium text-sm">الخيارات:</h5>
                    <div className="space-y-1">
                        {options.map((option: string, optionIndex: number) => {
                            // Normalize strings for comparison (trim whitespace)
                            const normalizedOption = option.trim();
                            const normalizedStudentAnswer = answer.studentAnswer.trim();
                            const normalizedCorrectAnswer = answer.correctAnswer.trim();
                            
                            const isStudentAnswer = normalizedOption === normalizedStudentAnswer;
                            const isCorrectAnswer = normalizedOption === normalizedCorrectAnswer;
                            
                            return (
                                <div
                                    key={optionIndex}
                                    className={`p-2 rounded border ${
                                        isStudentAnswer
                                            ? answer.isCorrect
                                                ? "bg-green-50 border-green-200"
                                                : "bg-red-50 border-red-200"
                                            : isCorrectAnswer
                                            ? "bg-green-50 border-green-200"
                                            : "bg-gray-50"
                                    }`}
                                >
                                    <span className="text-sm">
                                        {optionIndex + 1}. {option}
                                        {isStudentAnswer && (
                                            <Badge variant={answer.isCorrect ? "default" : "destructive"} className="mr-2">
                                                إجابتك
                                            </Badge>
                                        )}
                                        {isCorrectAnswer && !isStudentAnswer && (
                                            <Badge variant="default" className="mr-2">
                                                الإجابة الصحيحة
                                            </Badge>
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">لم يتم العثور على النتيجة</h1>
                    <Button onClick={() => router.back()}>العودة</Button>
                </div>
            </div>
        );
    }

    const correctAnswers = result.answers.filter(a => a.isCorrect).length;
    const incorrectAnswers = result.answers.filter(a => !a.isCorrect).length;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4">
                        <h1 className="text-2xl font-bold">نتيجة الواجب</h1>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Award className="h-5 w-5" />
                                ملخص النتيجة
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">
                                        {result.score}/{result.totalPoints}
                                    </div>
                                    <div className="text-sm text-muted-foreground">الدرجة</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-2xl font-bold ${getGradeColor(result.percentage)}`}>
                                        {result.percentage.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">النسبة المئوية</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-primary">
                                        {correctAnswers}
                                    </div>
                                    <div className="text-sm text-muted-foreground">إجابات صحيحة</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-2xl font-bold text-destructive">
                                        {incorrectAnswers}
                                    </div>
                                    <div className="text-sm text-muted-foreground">إجابات خاطئة</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium">التقدم العام</span>
                                    <span className="text-sm font-medium">{result.percentage.toFixed(1)}%</span>
                                </div>
                                <Progress value={result.percentage} className="w-full" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل الإجابات</CardTitle>
                            <CardDescription>
                                مراجعة إجاباتك والتحقق من الإجابات الصحيحة
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {result.answers.map((answer, index) => (
                                    <div key={answer.questionId} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">السؤال {index + 1}</h4>
                                            <div className="flex items-center gap-2">
                                                {answer.isCorrect ? (
                                                    <CheckCircle className="h-4 w-4 text-primary" />
                                                ) : (
                                                    <XCircle className="h-4 w-4 text-destructive" />
                                                )}
                                                <Badge variant={answer.isCorrect ? "secondary" : "destructive"}>
                                                    {answer.isCorrect ? "صحيح" : "خاطئ"}
                                                </Badge>
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-2">{answer.question.text}</p>
                                        
                                        {answer.question.imageUrl && (
                                            <div className="mb-3">
                                                <img 
                                                    src={answer.question.imageUrl} 
                                                    alt="Question" 
                                                    className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                                                />
                                            </div>
                                        )}
                                        
                                        {answer.question.type === "MULTIPLE_CHOICE" && renderQuestionChoices(answer)}
                                        
                                        {answer.question.type === "TRUE_FALSE" && (
                                            <div className="space-y-2 mt-3">
                                                <h5 className="font-medium text-sm">الإجابة الصحيحة:</h5>
                                                <div className="space-y-1">
                                                    <div className={`p-2 rounded border ${
                                                        answer.correctAnswer === "true"
                                                            ? "bg-green-50 border-green-200"
                                                            : "bg-gray-50"
                                                    }`}>
                                                        <span className="text-sm">صح</span>
                                                        {answer.correctAnswer === "true" && (
                                                            <Badge variant="default" className="mr-2">الإجابة الصحيحة</Badge>
                                                        )}
                                                    </div>
                                                    <div className={`p-2 rounded border ${
                                                        answer.correctAnswer === "false"
                                                            ? "bg-green-50 border-green-200"
                                                            : "bg-gray-50"
                                                    }`}>
                                                        <span className="text-sm">خطأ</span>
                                                        {answer.correctAnswer === "false" && (
                                                            <Badge variant="default" className="mr-2">الإجابة الصحيحة</Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <span className="text-sm font-medium">إجابتك: </span>
                                                    <Badge variant={answer.isCorrect ? "default" : "destructive"}>
                                                        {answer.studentAnswer === "true" ? "صح" : "خطأ"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {answer.question.type === "SHORT_ANSWER" && (
                                            <div className="space-y-2 mt-3">
                                                <div>
                                                    <span className="font-medium text-sm">إجابتك:</span>
                                                    <p className={`text-sm p-2 rounded border mt-1 ${
                                                        answer.isCorrect 
                                                            ? "bg-green-50 border-green-200" 
                                                            : "bg-red-50 border-red-200"
                                                    }`}>
                                                        {answer.studentAnswer || "لم تجب"}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-sm">الإجابة الصحيحة:</span>
                                                    <p className="text-sm bg-green-50 p-2 rounded border border-green-200 mt-1">
                                                        {answer.correctAnswer}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="mt-2 text-sm">
                                            <span className="font-medium">الدرجات:</span>
                                            <span className="text-muted-foreground">
                                                {" "}{answer.pointsEarned}/{answer.question.points}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center gap-4">
                        <Button
                            onClick={handleNextChapter}
                            className="bg-primary hover:bg-primary/90"
                        >
                            {willRedirectToDashboard ? "الصفحة الرئيسية" : "الدرس التالي"}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

