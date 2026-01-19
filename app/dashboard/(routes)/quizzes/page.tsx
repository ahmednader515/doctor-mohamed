"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, Award, Clock, BookOpen, Eye, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { parseQuizOptions } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Quiz {
    id: string;
    title: string;
    course: {
        id: string;
        title: string;
        imageUrl: string | null;
    };
}

interface QuizResult {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    attemptNumber: number;
}

interface QuizListItem {
    quiz: Quiz;
    bestResult: QuizResult;
    totalAttempts: number;
}

interface QuizAnswer {
    questionId: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
    question: {
        text: string;
        type: string;
        points: number;
        position: number;
        options?: string | null;
        correctAnswer: string;
        imageUrl?: string | null;
    };
}

interface QuizResultDetail {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    attemptNumber: number;
    quiz: {
        id: string;
        title: string;
        maxAttempts: number;
        course: {
            id: string;
            title: string;
            imageUrl: string | null;
        };
    };
    answers: QuizAnswer[];
}

export default function QuizzesPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [quizDetails, setQuizDetails] = useState<QuizResultDetail[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedAttempt, setSelectedAttempt] = useState<QuizResultDetail | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("/api/student/quizzes");
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizDetails = async (quizId: string) => {
        setLoadingDetails(true);
        setSelectedQuizId(quizId);
        try {
            const response = await fetch(`/api/student/quizzes/${quizId}`);
            if (response.ok) {
                const data = await response.json();
                // Parse options for multiple choice questions
                const parsedData = data.map((result: any) => ({
                    ...result,
                    answers: result.answers.map((answer: any) => ({
                        ...answer,
                        question: {
                            ...answer.question,
                            options: answer.question.options ? parseQuizOptions(answer.question.options) : null
                        }
                    }))
                }));
                setQuizDetails(parsedData);
                if (parsedData.length > 0) {
                    setSelectedAttempt(parsedData[0]);
                    setIsDialogOpen(true);
                }
            }
        } catch (error) {
            console.error("Error fetching quiz details:", error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-blue-600";
        if (percentage >= 70) return "text-yellow-600";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const formatAnswer = (answer: string, questionType: string) => {
        if (questionType === "TRUE_FALSE") {
            return answer === "true" ? "صح" : "خطأ";
        }
        return answer;
    };

    const renderQuestionChoices = (answer: QuizAnswer) => {
        if (answer.question.type === "MULTIPLE_CHOICE" && answer.question.options && Array.isArray(answer.question.options)) {
            return (
                <div className="space-y-2 mt-3">
                    <h5 className="font-medium text-sm">{t("student.quizzes.options")}</h5>
                    <div className="space-y-1">
                        {answer.question.options.map((option: string, optionIndex: number) => (
                            <div
                                key={optionIndex}
                                className={`p-2 rounded border ${
                                    option === answer.studentAnswer
                                        ? answer.isCorrect
                                            ? "bg-green-50 border-green-200"
                                            : "bg-red-50 border-red-200"
                                        : option === answer.correctAnswer
                                        ? "bg-green-50 border-green-200"
                                        : "bg-gray-50"
                                }`}
                            >
                                <span className="text-sm">
                                    {optionIndex + 1}. {option}
                                    {option === answer.studentAnswer && (
                                        <Badge variant={answer.isCorrect ? "default" : "destructive"} className="mr-2">
                                            {t("student.quizzes.yourAnswer")}
                                        </Badge>
                                    )}
                                    {option === answer.correctAnswer && option !== answer.studentAnswer && (
                                        <Badge variant="default" className="mr-2 bg-green-600">
                                            {t("student.quizzes.correctAnswer")}
                                        </Badge>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t("student.quizzes.title")}</h1>
                    <p className="text-muted-foreground">{t("student.quizzes.subtitle")}</p>
                </div>
            </div>

            {quizzes.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t("student.quizzes.noQuizzes")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quizzes.map((item) => (
                        <Card key={item.quiz.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg mb-2">{item.quiz.title}</CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            {item.quiz.course.title}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">{t("student.quizzes.bestScore")}</span>
                                        <span className={`text-lg font-bold ${getGradeColor(item.bestResult.percentage)}`}>
                                            {item.bestResult.percentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <Progress value={item.bestResult.percentage} className="h-2" />
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Award className="h-4 w-4" />
                                            {item.bestResult.score}/{item.bestResult.totalPoints} {t("student.quizzes.points")}
                                        </div>
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Clock className="h-4 w-4" />
                                            {item.totalAttempts} {t("student.quizzes.attempts")}
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => fetchQuizDetails(item.quiz.id)}
                                        className="w-full"
                                        variant="outline"
                                        disabled={loadingDetails}
                                    >
                                        <Eye className="h-4 w-4 mr-2" />
                                        {t("student.quizzes.viewDetails")}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Quiz Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedAttempt?.quiz.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedAttempt?.quiz.course.title}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : quizDetails.length > 0 && selectedAttempt ? (
                        <div className="space-y-6">
                            {/* Attempt Selector */}
                            {quizDetails.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto pb-2">
                                    {quizDetails.map((attempt) => (
                                        <Button
                                            key={attempt.id}
                                            variant={selectedAttempt.id === attempt.id ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedAttempt(attempt)}
                                        >
                                            {t("student.quizzes.attempt")} {attempt.attemptNumber}
                                            {attempt.attemptNumber === quizDetails[0].attemptNumber && (
                                                <Badge variant="secondary" className="mr-2">
                                                    {t("student.quizzes.best")}
                                                </Badge>
                                            )}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="h-5 w-5" />
                                        {t("student.quizzes.summary")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-primary">
                                                {selectedAttempt.score}/{selectedAttempt.totalPoints}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.quizzes.score")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-2xl font-bold ${getGradeColor(selectedAttempt.percentage)}`}>
                                                {selectedAttempt.percentage.toFixed(1)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.quizzes.percentage")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedAttempt.answers.filter(a => a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.quizzes.correct")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {selectedAttempt.answers.filter(a => !a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.quizzes.incorrect")}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{t("student.quizzes.progress")}</span>
                                            <span className="text-sm font-medium">{selectedAttempt.percentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={selectedAttempt.percentage} className="w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Answers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("student.quizzes.answers")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedAttempt.answers.map((answer, index) => (
                                            <div key={answer.questionId} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{t("student.quizzes.question")} {index + 1}</h4>
                                                    <div className="flex items-center gap-2">
                                                        {answer.isCorrect ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-600" />
                                                        )}
                                                        <Badge variant={answer.isCorrect ? "default" : "destructive"} className={answer.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                                                            {answer.isCorrect ? t("student.quizzes.correct") : t("student.quizzes.incorrect")}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <p className="text-sm mb-3">{answer.question.text}</p>
                                                {answer.question.imageUrl && (
                                                    <div className="mb-3">
                                                        <img 
                                                            src={answer.question.imageUrl} 
                                                            alt="Question" 
                                                            className="max-w-full h-auto rounded-lg"
                                                        />
                                                    </div>
                                                )}
                                                {renderQuestionChoices(answer)}
                                                <div className="mt-3 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">{t("student.quizzes.yourAnswer")}:</span>
                                                        <span className={`text-sm ${answer.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                                            {formatAnswer(answer.studentAnswer, answer.question.type)}
                                                        </span>
                                                    </div>
                                                    {!answer.isCorrect && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{t("student.quizzes.correctAnswer")}:</span>
                                                            <span className="text-sm text-green-600">
                                                                {formatAnswer(answer.correctAnswer, answer.question.type)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{t("student.quizzes.points")}: {answer.pointsEarned}/{answer.question.points}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}

