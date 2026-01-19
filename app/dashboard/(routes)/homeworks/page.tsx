"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Award, Clock, BookOpen, Eye, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/lib/contexts/language-context";
import { parseQuizOptions } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Homework {
    id: string;
    title: string;
    course: {
        id: string;
        title: string;
        imageUrl: string | null;
    };
}

interface HomeworkResult {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    answers: HomeworkAnswer[];
}

interface HomeworkListItem {
    homework: Homework;
    bestResult: HomeworkResult | null;
    totalAttempts: number;
}

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
        position: number;
        options?: string | null;
        correctAnswer: string;
        imageUrl?: string | null;
    };
}

interface HomeworkResultDetail {
    id: string;
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    homework: {
        id: string;
        title: string;
        course: {
            id: string;
            title: string;
            imageUrl: string | null;
        };
    };
    answers: HomeworkAnswer[];
}

export default function HomeworksPage() {
    const router = useRouter();
    const { t } = useLanguage();
    const [homeworks, setHomeworks] = useState<HomeworkListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedHomeworkId, setSelectedHomeworkId] = useState<string | null>(null);
    const [homeworkDetails, setHomeworkDetails] = useState<HomeworkResultDetail[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);
    const [selectedAttempt, setSelectedAttempt] = useState<HomeworkResultDetail | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchHomeworks();
    }, []);

    const fetchHomeworks = async () => {
        try {
            const response = await fetch("/api/student/homeworks");
            if (response.ok) {
                const data = await response.json();
                setHomeworks(data);
            }
        } catch (error) {
            console.error("Error fetching homeworks:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchHomeworkDetails = async (homeworkId: string) => {
        setLoadingDetails(true);
        setSelectedHomeworkId(homeworkId);
        try {
            const response = await fetch(`/api/student/homeworks/${homeworkId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    setHomeworkDetails(data);
                    setSelectedAttempt(data[0]);
                    setIsDialogOpen(true);
                } else {
                    toast.error("لا توجد نتائج لهذا الواجب");
                }
            }
        } catch (error) {
            console.error("Error fetching homework details:", error);
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

    const renderQuestionChoices = (answer: HomeworkAnswer) => {
        if (answer.question.type === "MULTIPLE_CHOICE" && answer.question.options && Array.isArray(answer.question.options)) {
            return (
                <div className="space-y-2 mt-3">
                    <h5 className="font-medium text-sm">{t("student.homeworks.options")}</h5>
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
                                            {t("student.homeworks.yourAnswer")}
                                        </Badge>
                                    )}
                                    {option === answer.correctAnswer && option !== answer.studentAnswer && (
                                        <Badge variant="default" className="mr-2 bg-green-600">
                                            {t("student.homeworks.correctAnswer")}
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
                    <h1 className="text-2xl font-bold">{t("student.homeworks.title")}</h1>
                    <p className="text-muted-foreground">{t("student.homeworks.subtitle")}</p>
                </div>
            </div>

            {homeworks.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">{t("student.homeworks.noHomeworks")}</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {homeworks.map((item) => (
                        <Card key={item.homework.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg mb-2">{item.homework.title}</CardTitle>
                                        <CardDescription className="flex items-center gap-2">
                                            <BookOpen className="h-4 w-4" />
                                            {item.homework.course.title}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {item.bestResult ? (
                                        <>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-muted-foreground">{t("student.homeworks.bestScore")}</span>
                                                <span className={`text-lg font-bold ${getGradeColor(item.bestResult.percentage)}`}>
                                                    {item.bestResult.percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                            <Progress value={item.bestResult.percentage} className="h-2" />
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Award className="h-4 w-4" />
                                                    {item.bestResult.score}/{item.bestResult.totalPoints} {t("student.homeworks.points")}
                                                </div>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Clock className="h-4 w-4" />
                                                    {item.totalAttempts} {t("student.homeworks.attempts")}
                                                </div>
                                            </div>
                                            <Button
                                                onClick={() => fetchHomeworkDetails(item.homework.id)}
                                                className="w-full"
                                                variant="outline"
                                                disabled={loadingDetails}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                {t("student.homeworks.viewDetails")}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <div className="text-center py-4">
                                                <p className="text-sm text-muted-foreground mb-4">{t("student.homeworks.notCompleted")}</p>
                                                <Button
                                                    onClick={() => router.push(`/courses/${item.homework.course.id}/homeworks/${item.homework.id}`)}
                                                    className="w-full"
                                                >
                                                    <ArrowRight className="h-4 w-4 mr-2" />
                                                    {t("student.homeworks.startHomework")}
                                                </Button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Homework Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedAttempt?.homework.title}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedAttempt?.homework.course.title}
                        </DialogDescription>
                    </DialogHeader>

                    {loadingDetails ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : homeworkDetails.length > 0 && selectedAttempt ? (
                        <div className="space-y-6">
                            {/* Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Award className="h-5 w-5" />
                                        {t("student.homeworks.summary")}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-primary">
                                                {selectedAttempt.score}/{selectedAttempt.totalPoints}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.homeworks.score")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-2xl font-bold ${getGradeColor(selectedAttempt.percentage)}`}>
                                                {selectedAttempt.percentage.toFixed(1)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.homeworks.percentage")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedAttempt.answers.filter(a => a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.homeworks.correct")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {selectedAttempt.answers.filter(a => !a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("student.homeworks.incorrect")}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium">{t("student.homeworks.progress")}</span>
                                            <span className="text-sm font-medium">{selectedAttempt.percentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={selectedAttempt.percentage} className="w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Answers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("student.homeworks.answers")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedAttempt.answers.map((answer, index) => (
                                            <div key={answer.questionId} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{t("student.homeworks.question")} {index + 1}</h4>
                                                    <div className="flex items-center gap-2">
                                                        {answer.isCorrect ? (
                                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                                        ) : (
                                                            <XCircle className="h-4 w-4 text-red-600" />
                                                        )}
                                                        <Badge variant={answer.isCorrect ? "default" : "destructive"} className={answer.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                                                            {answer.isCorrect ? t("student.homeworks.correct") : t("student.homeworks.incorrect")}
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
                                                        <span className="text-sm font-medium">{t("student.homeworks.yourAnswer")}:</span>
                                                        <span className={`text-sm ${answer.isCorrect ? "text-green-600" : "text-red-600"}`}>
                                                            {formatAnswer(answer.studentAnswer, answer.question.type)}
                                                        </span>
                                                    </div>
                                                    {!answer.isCorrect && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-medium">{t("student.homeworks.correctAnswer")}:</span>
                                                            <span className="text-sm text-green-600">
                                                                {formatAnswer(answer.correctAnswer, answer.question.type)}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                        <span>{t("student.homeworks.points")}: {answer.pointsEarned}/{answer.question.points}</span>
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
