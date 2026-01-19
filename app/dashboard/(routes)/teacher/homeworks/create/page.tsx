"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical, X, Mic } from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { useNavigationRouter } from "@/lib/hooks/use-navigation-router";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { UploadDropzone } from "@/lib/uploadthing";
import { useLanguage } from "@/lib/contexts/language-context";

interface Course {
    id: string;
    title: string;
    isPublished: boolean;
}

interface Chapter {
    id: string;
    title: string;
    position: number;
    isPublished: boolean;
}

interface Quiz {
    id: string;
    title: string;
    description: string;
    courseId: string;
    position: number;
    isPublished: boolean;
}

interface Homework {
    id: string;
    title: string;
    description: string;
    courseId: string;
    position: number;
    isPublished: boolean;
}

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[];
    correctAnswer: string | number;
    points: number;
}

interface CourseItem {
    id: string;
    title: string;
    type: "chapter" | "quiz" | "homework";
    position: number;
    isPublished: boolean;
}

const CreateHomeworkPage = () => {
    const { t } = useLanguage();
    const router = useNavigationRouter();
    const pathname = usePathname();
    const dashboardPath = pathname.includes("/dashboard/admin/")
        ? "/dashboard/admin/homeworks"
        : "/dashboard/teacher/homeworks";
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [homeworkTitle, setHomeworkTitle] = useState("");
    const [homeworkDescription, setHomeworkDescription] = useState("");
    const [homeworkTimer, setHomeworkTimer] = useState<number | null>(null);
    const [homeworkMaxAttempts, setHomeworkMaxAttempts] = useState<number>(1);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [selectedPosition, setSelectedPosition] = useState<number>(1);
    const [courseItems, setCourseItems] = useState<CourseItem[]>([]);
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [isLoadingCourseItems, setIsLoadingCourseItems] = useState(false);
    const [isCreatingHomework, setIsCreatingHomework] = useState(false);
    const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
    const [listeningQuestionId, setListeningQuestionId] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        fetchCourses();
        
        const urlParams = new URLSearchParams(window.location.search);
        const courseIdFromUrl = urlParams.get('courseId');
        if (courseIdFromUrl) {
            setSelectedCourse(courseIdFromUrl);
            fetchCourseItems(courseIdFromUrl);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                const teacherCourses = data.filter((course: Course) => course.isPublished);
                setCourses(teacherCourses);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchCourseItems = async (courseId: string) => {
        try {
            setIsLoadingCourseItems(true);
            setCourseItems([]);
            
            const [chaptersResponse, quizzesResponse, homeworksResponse] = await Promise.all([
                fetch(`/api/courses/${courseId}/chapters`),
                fetch(`/api/courses/${courseId}/quizzes`),
                fetch(`/api/courses/${courseId}/homeworks`)
            ]);
            
            const chaptersData = chaptersResponse.ok ? await chaptersResponse.json() : [];
            const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : [];
            const homeworksData = homeworksResponse.ok ? await homeworksResponse.json() : [];
            
            const items: CourseItem[] = [
                ...chaptersData.map((chapter: Chapter) => ({
                    id: chapter.id,
                    title: chapter.title,
                    type: "chapter" as const,
                    position: chapter.position,
                    isPublished: chapter.isPublished
                })),
                ...quizzesData.map((quiz: Quiz) => ({
                    id: quiz.id,
                    title: quiz.title,
                    type: "quiz" as const,
                    position: quiz.position,
                    isPublished: quiz.isPublished
                })),
                ...homeworksData.map((homework: Homework) => ({
                    id: homework.id,
                    title: homework.title,
                    type: "homework" as const,
                    position: homework.position,
                    isPublished: homework.isPublished
                }))
            ];
            
            items.sort((a, b) => a.position - b.position);
            
            const itemsWithNewHomework = [
                ...items,
                {
                    id: "new-homework",
                    title: homeworkTitle || t("teacher.homeworks.create.newHomework"),
                    type: "homework" as const,
                    position: items.length + 1,
                    isPublished: false
                }
            ];
            
            setCourseItems(itemsWithNewHomework);
            setChapters(chaptersData);
            
            const lastPosition = items.length + 1;
            setSelectedPosition(lastPosition);
        } catch (error) {
            console.error("Error fetching course items:", error);
            setCourseItems([]);
            setSelectedPosition(1);
        } finally {
            setIsLoadingCourseItems(false);
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.stop();
            } catch (error) {
                console.error("[SPEECH_RECOGNITION_STOP]", error);
            }
            recognitionRef.current = null;
        }
        setListeningQuestionId(null);
    };

    const handleSpeechInput = (index: number) => {
        if (typeof window === "undefined") {
            return;
        }

        const question = questions[index];
        if (!question) {
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            toast.error(t("teacher.homeworks.create.errors.speechNotSupported"));
            return;
        }

        if (listeningQuestionId === question.id) {
            stopListening();
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        try {
            const recognition = new SpeechRecognition();
            recognition.lang = "ar-SA";
            recognition.interimResults = false;
            recognition.maxAlternatives = 1;

            recognition.onstart = () => {
                setListeningQuestionId(question.id);
            };

            recognition.onresult = (event: any) => {
                const transcript = event.results?.[0]?.[0]?.transcript;
                if (transcript) {
                    setQuestions((prev) => {
                        const updated = [...prev];
                        const current = updated[index];
                        if (!current) {
                            return prev;
                        }
                        const newText = current.text ? `${current.text} ${transcript}` : transcript;
                        updated[index] = { ...current, text: newText };
                        return updated;
                    });
                }
            };

            recognition.onerror = (event: any) => {
                console.error("[SPEECH_RECOGNITION_ERROR]", event.error);
                toast.error(t("teacher.homeworks.create.errors.speechRecognitionError"));
            };

            recognition.onend = () => {
                setListeningQuestionId(null);
                recognitionRef.current = null;
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error) {
            console.error("[SPEECH_RECOGNITION]", error);
            toast.error(t("teacher.homeworks.create.errors.speechStartError"));
            stopListening();
        }
    };

    const handleCreateHomework = async () => {
        stopListening();
        if (!selectedCourse || !homeworkTitle.trim()) {
            toast.error(t("teacher.homeworks.create.errors.requiredFields"));
            return;
        }

        const validationErrors: string[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            if (!question.text || question.text.trim() === "") {
                validationErrors.push(t("teacher.homeworks.create.errors.questionTextRequired", { number: i + 1 }));
                continue;
            }

            if (question.type === "MULTIPLE_CHOICE") {
                const validOptions = question.options?.filter(option => option.trim() !== "") || [];
                if (validOptions.length === 0) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionOptionsRequired", { number: i + 1 }));
                    continue;
                }
                
                if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerRequired", { number: i + 1 }));
                    continue;
                }
            } else if (question.type === "TRUE_FALSE") {
                if (!question.correctAnswer || (question.correctAnswer !== "true" && question.correctAnswer !== "false")) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerRequired", { number: i + 1 }));
                    continue;
                }
            } else if (question.type === "SHORT_ANSWER") {
                if (!question.correctAnswer || question.correctAnswer.toString().trim() === "") {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerTextRequired", { number: i + 1 }));
                    continue;
                }
            }

            if (question.points <= 0) {
                validationErrors.push(t("teacher.homeworks.create.errors.questionPointsRequired", { number: i + 1 }));
                continue;
            }
        }

        if (validationErrors.length > 0) {
            toast.error(validationErrors.join('\n'));
            return;
        }

        if (questions.length === 0) {
            toast.error(t("teacher.homeworks.create.errors.atLeastOneQuestion"));
            return;
        }

        const cleanedQuestions = questions.map(question => {
            if (question.type === "MULTIPLE_CHOICE" && question.options) {
                const filteredOptions = question.options.filter(option => option.trim() !== "");
                return {
                    ...question,
                    options: filteredOptions
                };
            }
            return question;
        });

        setIsCreatingHomework(true);
        try {
            const response = await fetch("/api/teacher/homeworks", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    title: homeworkTitle,
                    description: homeworkDescription,
                    courseId: selectedCourse,
                    questions: cleanedQuestions,
                    position: selectedPosition,
                    timer: homeworkTimer,
                    maxAttempts: homeworkMaxAttempts,
                }),
            });

            if (response.ok) {
                toast.success(t("teacher.homeworks.create.errors.createSuccess"));
                router.push(dashboardPath);
            } else {
                const error = await response.json();
                toast.error(error.message || t("teacher.homeworks.create.errors.createError"));
            }
        } catch (error) {
            console.error("Error creating homework:", error);
            toast.error(t("teacher.homeworks.create.errors.createError"));
        } finally {
            setIsCreatingHomework(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `question-${Date.now()}`,
            text: "",
            type: "MULTIPLE_CHOICE",
            options: ["", "", "", ""],
            correctAnswer: 0,
            points: 1,
        };
        setQuestions([...questions, newQuestion]);
    };

    const updateQuestion = (index: number, field: keyof Question, value: any) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setQuestions(updatedQuestions);
    };

    const removeQuestion = (index: number) => {
        if (questions[index]?.id === listeningQuestionId) {
            stopListening();
        }
        const updatedQuestions = questions.filter((_, i) => i !== index);
        setQuestions(updatedQuestions);
    };

    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        if (result.draggableId === "new-homework") {
            const newHomeworkPosition = result.destination.index + 1;
            setSelectedPosition(newHomeworkPosition);
            
            const reorderedItems = Array.from(courseItems);
            const [movedItem] = reorderedItems.splice(result.source.index, 1);
            reorderedItems.splice(result.destination.index, 0, movedItem);
            
            setCourseItems(reorderedItems);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.homeworks.create.title")}
                </h1>
                <Button variant="outline" onClick={() => router.push(dashboardPath)}>
                    {t("teacher.homeworks.create.backToHomeworks")}
                </Button>
            </div>

            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.selectCourse")}</Label>
                        <Select value={selectedCourse} onValueChange={(value) => {
                            setSelectedCourse(value);
                            setCourseItems([]);
                            setSelectedPosition(1);
                            if (value) {
                                fetchCourseItems(value);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("teacher.homeworks.create.selectCoursePlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((course) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.homeworkTitle")}</Label>
                        <Input
                            value={homeworkTitle}
                            onChange={(e) => {
                                setHomeworkTitle(e.target.value);
                                setCourseItems(prev => 
                                    prev.map(item => 
                                        item.id === "new-homework" 
                                            ? { ...item, title: e.target.value || t("teacher.homeworks.create.newHomework") }
                                            : item
                                    )
                                );
                            }}
                            placeholder={t("teacher.homeworks.create.homeworkTitlePlaceholder")}
                        />
                    </div>
                </div>

                {selectedCourse && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.homeworks.create.position.title")}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t("teacher.homeworks.create.position.description")}
                            </p>
                            <p className="text-sm text-blue-600">
                                {t("teacher.homeworks.create.position.selectedPosition", { position: selectedPosition })}
                            </p>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCourseItems ? (
                                <div className="text-center py-8">
                                    <div className="text-muted-foreground">{t("teacher.homeworks.create.position.loading")}</div>
                                </div>
                            ) : courseItems.length > 0 ? (
                                <DragDropContext onDragEnd={handleDragEnd}>
                                    <Droppable droppableId="course-items">
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="space-y-2"
                                            >
                                                {courseItems.map((item, index) => (
                                                    <Draggable key={item.id} draggableId={item.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                className={`p-3 border rounded-lg flex items-center justify-between ${
                                                                    snapshot.isDragging ? "bg-blue-50" : "bg-white"
                                                                } ${item.id === "new-homework" ? "border-2 border-dashed border-blue-300 bg-blue-50" : ""}`}
                                                            >
                                                                <div className="flex items-center space-x-3">
                                                                    <div {...provided.dragHandleProps} className={item.id === "new-homework" ? "cursor-grab active:cursor-grabbing" : ""}>
                                                                        <GripVertical className={`h-4 w-4 ${item.id === "new-homework" ? "text-blue-600" : "text-gray-300 cursor-not-allowed"}`} />
                                                                    </div>
                                                                    <div>
                                                                        <div className={`font-medium ${item.id === "new-homework" ? "text-blue-800" : ""}`}>
                                                                            {item.title}
                                                                        </div>
                                                                        <div className={`text-sm ${item.id === "new-homework" ? "text-blue-600" : "text-muted-foreground"}`}>
                                                                            {item.type === "chapter" ? t("teacher.homeworks.create.position.chapter") : 
                                             item.type === "quiz" ? t("teacher.homeworks.create.position.quiz") : 
                                             t("teacher.homeworks.create.position.homework")}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge variant={item.id === "new-homework" ? "outline" : (item.isPublished ? "default" : "secondary")} className={item.id === "new-homework" ? "border-blue-300 text-blue-700" : ""}>
                                                                    {item.id === "new-homework" ? t("teacher.homeworks.create.position.new") : (item.isPublished ? t("teacher.homeworks.status.published") : t("teacher.homeworks.status.draft"))}
                                                                </Badge>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                
                                                {provided.placeholder}
                                            </div>
                                        )}
                                    </Droppable>
                                </DragDropContext>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-muted-foreground mb-4">
                                        {t("teacher.homeworks.create.position.empty")}
                                    </p>
                                    <div className="p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                                        <div className="flex items-center justify-center space-x-3">
                                            <div>
                                                <div className="font-medium text-blue-800">
                                                    {homeworkTitle || t("teacher.homeworks.create.newHomework")}
                                                </div>
                                                <div className="text-sm text-blue-600">{t("teacher.homeworks.create.position.homework")}</div>
                                            </div>
                                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                                                {t("teacher.homeworks.create.position.new")}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-2">
                    <Label>{t("teacher.homeworks.create.description")}</Label>
                    <Textarea
                        value={homeworkDescription}
                        onChange={(e) => setHomeworkDescription(e.target.value)}
                        placeholder={t("teacher.homeworks.create.descriptionPlaceholder")}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.timer.label")}</Label>
                        <Input
                            type="number"
                            value={homeworkTimer || ""}
                            onChange={(e) => setHomeworkTimer(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={t("teacher.homeworks.create.timer.placeholder")}
                            min="1"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("teacher.homeworks.create.timer.hint")}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.maxAttempts.label")}</Label>
                        <Input
                            type="number"
                            value={homeworkMaxAttempts}
                            onChange={(e) => setHomeworkMaxAttempts(parseInt(e.target.value))}
                            min="1"
                            max="10"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("teacher.homeworks.create.maxAttempts.hint")}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>{t("teacher.homeworks.create.questions.label")}</Label>
                        <Button type="button" variant="outline" onClick={addQuestion}>
                            <Plus className="h-4 w-4 mr-2" />
                            {t("teacher.homeworks.create.questions.addQuestion")}
                        </Button>
                    </div>

                    {questions.map((question, index) => (
                        <Card key={question.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{t("teacher.homeworks.create.questions.questionNumber", { number: index + 1 })}</CardTitle>
                                        {(!question.text.trim() || !question.correctAnswer.toString().trim() || 
                                          (question.type === "MULTIPLE_CHOICE" && 
                                           (!question.options || question.options.filter(opt => opt.trim() !== "").length < 2))) && (
                                            <Badge variant="destructive" className="text-xs">
                                                {t("teacher.homeworks.create.questions.incomplete")}
                                            </Badge>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => removeQuestion(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>{t("teacher.homeworks.create.questions.questionText")}</Label>
                                        <div className="flex items-center gap-2">
                                            {listeningQuestionId === question.id && (
                                                <span className="text-xs text-blue-600">
                                                    {t("teacher.homeworks.create.questions.listening")}
                                                </span>
                                            )}
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                aria-pressed={listeningQuestionId === question.id}
                                                onClick={() => handleSpeechInput(index)}
                                                className={listeningQuestionId === question.id ? "text-red-500 animate-pulse" : ""}
                                            >
                                                <Mic className="h-4 w-4" />
                                                <span className="sr-only">
                                                    {listeningQuestionId === question.id ? t("teacher.homeworks.create.questions.stopRecording") : t("teacher.homeworks.create.questions.startRecording")}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        value={question.text}
                                        onChange={(e) => updateQuestion(index, "text", e.target.value)}
                                        placeholder={t("teacher.homeworks.create.questions.questionTextPlaceholder")}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("teacher.homeworks.create.questions.questionImage")}</Label>
                                    <div className="space-y-2">
                                        {question.imageUrl ? (
                                            <div className="relative">
                                                <img 
                                                    src={question.imageUrl} 
                                                    alt="Question" 
                                                    className="max-w-full h-auto max-h-48 rounded-lg border"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="destructive"
                                                    size="sm"
                                                    className="absolute top-2 right-2"
                                                    onClick={() => updateQuestion(index, "imageUrl", "")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                                                <UploadDropzone
                                                    endpoint="courseAttachment"
                                                    onClientUploadComplete={(res) => {
                                                        if (res && res[0]) {
                                                            updateQuestion(index, "imageUrl", res[0].url);
                                                            toast.success(t("teacher.homeworks.create.questions.imageUploadSuccess"));
                                                        }
                                                        setUploadingImages(prev => ({ ...prev, [index]: false }));
                                                    }}
                                                    onUploadError={(error: Error) => {
                                                        toast.error(t("teacher.homeworks.create.questions.imageUploadError", { error: error.message }));
                                                        setUploadingImages(prev => ({ ...prev, [index]: false }));
                                                    }}
                                                    onUploadBegin={() => {
                                                        setUploadingImages(prev => ({ ...prev, [index]: true }));
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.questionType")}</Label>
                                        <Select
                                            value={question.type}
                                            onValueChange={(value: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER") =>
                                                updateQuestion(index, "type", value)
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MULTIPLE_CHOICE">{t("teacher.homeworks.create.questions.multipleChoice")}</SelectItem>
                                                <SelectItem value="TRUE_FALSE">{t("teacher.homeworks.create.questions.trueFalse")}</SelectItem>
                                                <SelectItem value="SHORT_ANSWER">{t("teacher.homeworks.create.questions.shortAnswer")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.points")}</Label>
                                        <Input
                                            type="number"
                                            value={question.points}
                                            onChange={(e) => updateQuestion(index, "points", parseInt(e.target.value))}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                {question.type === "MULTIPLE_CHOICE" && (
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.options")}</Label>
                                        {(question.options || ["", "", "", ""]).map((option, optionIndex) => (
                                            <div key={`${question.id}-option-${optionIndex}`} className="flex items-center space-x-2">
                                                <Input
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(question.options || ["", "", "", ""])];
                                                        newOptions[optionIndex] = e.target.value;
                                                        updateQuestion(index, "options", newOptions);
                                                    }}
                                                    placeholder={t("teacher.homeworks.create.questions.optionPlaceholder", { number: optionIndex + 1 })}
                                                />
                                                <input
                                                    type="radio"
                                                    name={`correct-${index}`}
                                                    checked={typeof question.correctAnswer === 'number' && question.correctAnswer === optionIndex}
                                                    onChange={() => updateQuestion(index, "correctAnswer", optionIndex)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {question.type === "TRUE_FALSE" && (
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.correctAnswer")}</Label>
                                        <Select
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onValueChange={(value) => updateQuestion(index, "correctAnswer", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("teacher.homeworks.create.questions.selectCorrectAnswer")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">{t("teacher.homeworks.create.questions.true")}</SelectItem>
                                                <SelectItem value="false">{t("teacher.homeworks.create.questions.false")}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {question.type === "SHORT_ANSWER" && (
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.correctAnswer")}</Label>
                                        <Input
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value)}
                                            placeholder={t("teacher.homeworks.create.questions.correctAnswerPlaceholder")}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(dashboardPath)}
                    >
                        {t("teacher.homeworks.create.cancel")}
                    </Button>
                    <Button
                        onClick={handleCreateHomework}
                        disabled={isCreatingHomework || questions.length === 0}
                    >
                        {isCreatingHomework ? t("teacher.homeworks.create.creating") : t("teacher.homeworks.create.createHomework")}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default CreateHomeworkPage;

