"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { parseQuizOptions } from "@/lib/utils";

interface Question {
    id: string;
    text: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[] | string;
    correctAnswer: string;
    points: number;
    imageUrl?: string;
}

interface Homework {
    id: string;
    title: string;
    description: string;
    timer?: number;
    maxAttempts: number;
    currentAttempt?: number;
    previousAttempts?: number;
    canAttempt?: boolean;
    questions: Question[];
}

interface HomeworkAnswer {
    questionId: string;
    answer: string;
}

export default function HomeworkPage({
    params,
}: {
    params: Promise<{ courseId: string; homeworkId: string }>;
}) {
    const router = useRouter();
    const { courseId, homeworkId } = use(params);
    const [homework, setHomework] = useState<Homework | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<HomeworkAnswer[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [hasTimer, setHasTimer] = useState(false);

    useEffect(() => {
        fetchHomework();
    }, [homeworkId]);

    useEffect(() => {
        if (hasTimer && timeLeft !== null && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (hasTimer && timeLeft !== null && timeLeft === 0 && homework) {
            handleSubmit();
        }
    }, [timeLeft, homework, hasTimer]);

    const fetchHomework = async () => {
        try {
            const response = await fetch(`/api/courses/${courseId}/homeworks/${homeworkId}`);
            if (response.ok) {
                const data = await response.json();
                
                // If max attempts reached, redirect to result page
                if (data.canAttempt === false) {
                    router.push(`/courses/${courseId}/homeworks/${homeworkId}/result`);
                    return;
                }
                
                setHomework(data);
                if (data.timer) {
                    const timerInSeconds = data.timer * 60;
                    setTimeLeft(timerInSeconds);
                    setHasTimer(true);
                } else {
                    setHasTimer(false);
                    setTimeLeft(null);
                }
            } else {
                const errorText = await response.text();
                if (response.status === 400 && errorText.includes("Maximum attempts")) {
                    // Redirect to result page if max attempts reached
                    router.push(`/courses/${courseId}/homeworks/${homeworkId}/result`);
                    return;
                }
                toast.error("حدث خطأ أثناء تحميل الواجب");
            }
        } catch (error) {
            console.error("Error fetching homework:", error);
            toast.error("حدث خطأ أثناء تحميل الواجب");
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionId: string, answer: string) => {
        setAnswers(prev => {
            const existing = prev.find(a => a.questionId === questionId);
            if (existing) {
                return prev.map(a => a.questionId === questionId ? { ...a, answer } : a);
            } else {
                return [...prev, { questionId, answer }];
            }
        });
    };

    const handleSubmit = async () => {
        if (!homework) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/courses/${courseId}/homeworks/${homeworkId}/submit`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ answers }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success("تم إرسال الواجب بنجاح!");
                router.push(`/courses/${courseId}/homeworks/${homeworkId}/result`);
            } else {
                const error = await response.text();
                toast.error(error || "حدث خطأ أثناء إرسال الواجب");
            }
        } catch (error) {
            console.error("Error submitting homework:", error);
            toast.error("حدث خطأ أثناء إرسال الواجب");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!homework) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">الواجب غير موجود</h1>
                    <Button onClick={() => router.back()}>العودة</Button>
                </div>
            </div>
        );
    }

    const currentQuestionData = homework.questions[currentQuestion];
    const progress = ((currentQuestion + 1) / homework.questions.length) * 100;

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            رجوع
                        </Button>
                        <div className="flex items-center gap-4">
                            {homework.timer && timeLeft !== null && (
                                <div className="flex items-center gap-2 text-primary">
                                    <Clock className="h-4 w-4" />
                                    <span className="font-medium">{formatTime(timeLeft)}</span>
                                </div>
                            )}
                            <Badge variant="secondary">
                                السؤال {currentQuestion + 1} من {homework.questions.length}
                            </Badge>
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{homework.title}</CardTitle>
                            <CardDescription>{homework.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                    className="bg-primary h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                السؤال {currentQuestion + 1}
                                <Badge variant="outline">{currentQuestionData.points} درجة</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-lg">{currentQuestionData.text}</div>

                            {currentQuestionData.imageUrl && (
                                <div className="flex justify-center">
                                    <img 
                                        src={currentQuestionData.imageUrl} 
                                        alt="Question" 
                                        className="max-w-full h-auto max-h-96 rounded-lg border shadow-sm"
                                    />
                                </div>
                            )}

                            {currentQuestionData.type === "MULTIPLE_CHOICE" && (
                                <RadioGroup
                                    value={answers.find(a => a.questionId === currentQuestionData.id)?.answer || ""}
                                    onValueChange={(value) => handleAnswerChange(currentQuestionData.id, value)}
                                >
                                    {(Array.isArray(currentQuestionData.options) ? currentQuestionData.options : parseQuizOptions(currentQuestionData.options || null)).map((option: string, index: number) => (
                                        <div key={index} className="flex items-center space-x-2">
                                            <RadioGroupItem value={option} id={`option-${index}`} />
                                            <Label htmlFor={`option-${index}`}>{option}</Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            )}

                            {currentQuestionData.type === "TRUE_FALSE" && (
                                <RadioGroup
                                    value={answers.find(a => a.questionId === currentQuestionData.id)?.answer || ""}
                                    onValueChange={(value) => handleAnswerChange(currentQuestionData.id, value)}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="true" id="true" />
                                        <Label htmlFor="true">صح</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="false" id="false" />
                                        <Label htmlFor="false">خطأ</Label>
                                    </div>
                                </RadioGroup>
                            )}

                            {currentQuestionData.type === "SHORT_ANSWER" && (
                                <Textarea
                                    placeholder="اكتب إجابتك هنا..."
                                    value={answers.find(a => a.questionId === currentQuestionData.id)?.answer || ""}
                                    onChange={(e) => handleAnswerChange(currentQuestionData.id, e.target.value)}
                                    rows={4}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                            disabled={currentQuestion === 0}
                        >
                            السابق
                        </Button>

                        <div className="flex items-center gap-2">
                            {currentQuestion === homework.questions.length - 1 ? (
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {submitting ? "جاري الإرسال..." : "إنهاء الواجب"}
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => setCurrentQuestion(currentQuestion + 1)}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    التالي
                                </Button>
                            )}
                        </div>
                    </div>

                    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
                        <CardContent className="pt-6">
                            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                                <AlertCircle className="h-5 w-5" />
                                <span className="font-medium">تنبيه</span>
                            </div>
                            <p className="text-amber-700 dark:text-amber-200 mt-2">
                                تأكد من إجابة جميع الأسئلة قبل إنهاء الواجب.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

