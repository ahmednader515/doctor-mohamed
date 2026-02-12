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
import { useRouter, useParams, usePathname } from "next/navigation";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { R2FileUpload } from "@/components/r2-file-upload";
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
    course: {
        title: string;
    };
    questions: Question[];
    createdAt: string;
    updatedAt: string;
    timer?: number;
    maxAttempts?: number;
}

interface Question {
    id: string;
    text: string;
    imageUrl?: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[];
    correctAnswer: string | number; // Can be string for TRUE_FALSE/SHORT_ANSWER or number for MULTIPLE_CHOICE
    points: number;
}

interface CourseItem {
    id: string;
    title: string;
    type: "chapter" | "quiz" | "homework";
    position: number;
    isPublished: boolean;
}

const EditHomeworkPage = () => {
    const { t } = useLanguage();
    const router = useRouter();
    const params = useParams();
    const homeworkId = params.homeworkId as string;
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
    const [isUpdatingHomework, setIsUpdatingHomework] = useState(false);
    const [isLoadingHomework, setIsLoadingHomework] = useState(true);
    const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});
    const [listeningQuestionId, setListeningQuestionId] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        fetchCourses();
        fetchHomework();
    }, [homeworkId]);

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

    const fetchHomework = async () => {
        try {
            const response = await fetch(`/api/teacher/homeworks/${homeworkId}`);
            if (response.ok) {
                const homework: Homework = await response.json();
                setHomeworkTitle(homework.title);
                setHomeworkDescription(homework.description);
                setHomeworkTimer(homework.timer || null);
                setHomeworkMaxAttempts(homework.maxAttempts || 1);
                setSelectedCourse(homework.courseId);
                
                // Convert stored string correctAnswer values back to indices for multiple choice questions
                const processedQuestions = homework.questions.map(question => {
                    if (question.type === "MULTIPLE_CHOICE" && question.options) {
                        const validOptions = question.options.filter(option => option.trim() !== "");
                        const correctAnswerIndex = validOptions.findIndex(option => option === question.correctAnswer);
                        return {
                            ...question,
                            correctAnswer: correctAnswerIndex >= 0 ? correctAnswerIndex : 0
                        };
                    }
                    return question;
                });
                
                setQuestions(processedQuestions);
                setSelectedPosition(homework.position);
                await fetchCourseItems(homework.courseId);
            } else {
                toast.error(t("teacher.homeworks.edit.errors.loadError") || "حدث خطأ أثناء تحميل الواجب");
                router.push(dashboardPath);
            }
        } catch (error) {
            console.error("Error fetching homework:", error);
            toast.error(t("teacher.homeworks.edit.errors.loadError") || "حدث خطأ أثناء تحميل الواجب");
            router.push(dashboardPath);
        } finally {
            setIsLoadingHomework(false);
        }
    };

    const fetchCourseItems = async (courseId: string) => {
        try {
            setIsLoadingCourseItems(true);
            // Clear existing items first
            setCourseItems([]);
            
            const [chaptersResponse, quizzesResponse, homeworksResponse] = await Promise.all([
                fetch(`/api/courses/${courseId}/chapters`),
                fetch(`/api/courses/${courseId}/quizzes`),
                fetch(`/api/courses/${courseId}/homeworks`)
            ]);
            
            const chaptersData = chaptersResponse.ok ? await chaptersResponse.json() : [];
            const quizzesData = quizzesResponse.ok ? await quizzesResponse.json() : [];
            const homeworksData = homeworksResponse.ok ? await homeworksResponse.json() : [];
            
            // Combine chapters, quizzes, and existing homeworks for display
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
            
            // Sort by position
            items.sort((a, b) => a.position - b.position);
            
            setCourseItems(items);
            setChapters(chaptersData);
            
            // Update the selected position to reflect the actual position of the homework in the list
            const homeworkInList = items.find(item => item.id === homeworkId);
            if (homeworkInList) {
                setSelectedPosition(homeworkInList.position);
            }
        } catch (error) {
            console.error("Error fetching course items:", error);
            // Clear items on error
            setCourseItems([]);
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
            toast.error(t("teacher.homeworks.create.errors.speechNotSupported") || "المتصفح لا يدعم الإملاء الصوتي");
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
                toast.error(t("teacher.homeworks.create.errors.speechRecognitionError") || "تعذر التعرف على الصوت");
            };

            recognition.onend = () => {
                setListeningQuestionId(null);
                recognitionRef.current = null;
            };

            recognitionRef.current = recognition;
            recognition.start();
        } catch (error) {
            console.error("[SPEECH_RECOGNITION]", error);
            toast.error(t("teacher.homeworks.create.errors.speechStartError") || "تعذر بدء التسجيل الصوتي");
            stopListening();
        }
    };

    const handleUpdateHomework = async () => {
        stopListening();
        if (!selectedCourse || !homeworkTitle.trim()) {
            toast.error(t("teacher.homeworks.create.errors.requiredFields") || "يرجى إدخال جميع البيانات المطلوبة");
            return;
        }

        // Validate questions
        const validationErrors: string[] = [];

        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            
            // Validate question text - optional if image is uploaded
            if ((!question.text || question.text.trim() === "") && (!question.imageUrl || question.imageUrl.trim() === "")) {
                validationErrors.push(t("teacher.homeworks.create.errors.questionTextOrImageRequired", { number: i + 1 }) || `السؤال ${i + 1}: نص السؤال أو الصورة مطلوبة`);
                continue;
            }

            // Validate correct answer
            if (question.type === "MULTIPLE_CHOICE") {
                const validOptions = question.options?.filter(option => option.trim() !== "") || [];
                if (validOptions.length === 0) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionOptionsRequired", { number: i + 1 }) || `السؤال ${i + 1}: يجب إضافة خيار واحد على الأقل`);
                    continue;
                }
                
                // Check if correct answer index is valid
                if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer >= validOptions.length) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerRequired", { number: i + 1 }) || `السؤال ${i + 1}: يجب اختيار إجابة صحيحة`);
                    continue;
                }
            } else if (question.type === "TRUE_FALSE") {
                if (!question.correctAnswer || (question.correctAnswer !== "true" && question.correctAnswer !== "false")) {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerRequired", { number: i + 1 }) || `السؤال ${i + 1}: يجب اختيار إجابة صحيحة`);
                    continue;
                }
            } else if (question.type === "SHORT_ANSWER") {
                if (!question.correctAnswer || question.correctAnswer.toString().trim() === "") {
                    validationErrors.push(t("teacher.homeworks.create.errors.questionCorrectAnswerTextRequired", { number: i + 1 }) || `السؤال ${i + 1}: الإجابة الصحيحة مطلوبة`);
                    continue;
                }
            }

            // Check if points are valid
            if (question.points <= 0) {
                validationErrors.push(t("teacher.homeworks.create.errors.questionPointsRequired", { number: i + 1 }) || `السؤال ${i + 1}: الدرجات يجب أن تكون أكبر من صفر`);
                continue;
            }
        }

        if (validationErrors.length > 0) {
            toast.error(validationErrors.join('\n'));
            return;
        }

        // Additional validation: ensure no questions are empty
        if (questions.length === 0) {
            toast.error(t("teacher.homeworks.create.errors.atLeastOneQuestion") || "يجب إضافة سؤال واحد على الأقل");
            return;
        }

        // Clean up questions before sending
        const cleanedQuestions = questions.map(question => {
            if (question.type === "MULTIPLE_CHOICE" && question.options) {
                // Filter out empty options and ensure correct answer is included
                const filteredOptions = question.options.filter(option => option.trim() !== "");
                return {
                    ...question,
                    options: filteredOptions
                };
            }
            return question;
        });

        setIsUpdatingHomework(true);
        try {
            const response = await fetch(`/api/teacher/homeworks/${homeworkId}`, {
                method: "PATCH",
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
                toast.success(t("teacher.homeworks.edit.success") || "تم تحديث الواجب بنجاح");
                router.push(dashboardPath);
            } else {
                const error = await response.json();
                toast.error(error.message || t("teacher.homeworks.edit.errors.updateError") || "حدث خطأ أثناء تحديث الواجب");
            }
        } catch (error) {
            console.error("Error updating homework:", error);
            toast.error(t("teacher.homeworks.edit.errors.updateError") || "حدث خطأ أثناء تحديث الواجب");
        } finally {
            setIsUpdatingHomework(false);
        }
    };

    const addQuestion = () => {
        const newQuestion: Question = {
            id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            text: "",
            type: "MULTIPLE_CHOICE",
            options: ["", "", "", ""],
            correctAnswer: 0, // Default to index 0 for MULTIPLE_CHOICE
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

    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        // Handle dragging the homework being edited
        if (result.draggableId === homeworkId) {
            // Calculate the position for the homework based on where it was dropped
            const newHomeworkPosition = result.destination.index + 1;
            setSelectedPosition(newHomeworkPosition);
            
            // Reorder the items array to reflect the new position
            const reorderedItems = Array.from(courseItems);
            const [movedItem] = reorderedItems.splice(result.source.index, 1);
            reorderedItems.splice(result.destination.index, 0, movedItem);
            
            setCourseItems(reorderedItems);

            // Create update data for all items with type information
            const updateData = reorderedItems.map((item, index) => ({
                id: item.id,
                type: item.type,
                position: index + 1,
            }));

            // Call the mixed reorder API
            try {
                const response = await fetch(`/api/courses/${selectedCourse}/reorder`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        list: updateData
                    }),
                });

                if (response.ok) {
                    toast.success(t("teacher.homeworks.edit.positionSuccess") || "تم ترتيب الواجب بنجاح");
                } else {
                    toast.error(t("teacher.homeworks.edit.positionError") || "حدث خطأ أثناء ترتيب الواجب");
                }
            } catch (error) {
                console.error("Error reordering homework:", error);
                toast.error(t("teacher.homeworks.edit.positionError") || "حدث خطأ أثناء ترتيب الواجب");
            }
        }
        // For other items, we don't want to reorder them, so we ignore the drag
        // The drag and drop library will handle the visual feedback, but we don't update state
    };

    if (isLoadingHomework) {
        return (
            <div className="p-6">
                <div className="text-center">{t("common.loading") || "جاري التحميل..."}</div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.homeworks.edit.title") || "تعديل الواجب"}
                </h1>
                <Button variant="outline" onClick={() => router.push(dashboardPath)} className="w-full sm:w-auto">
                    {t("teacher.homeworks.edit.backToHomeworks") || "العودة إلى الواجبات"}
                </Button>
            </div>

            <div className="space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.selectCourse") || "اختر الكورس"}</Label>
                        <Select value={selectedCourse} onValueChange={(value) => {
                            setSelectedCourse(value);
                            // Clear previous data immediately
                            setCourseItems([]);
                            // Don't reset position when changing course - keep the homework's current position
                            if (value) {
                                fetchCourseItems(value);
                            }
                        }}>
                            <SelectTrigger>
                                <SelectValue placeholder={t("teacher.homeworks.create.selectCoursePlaceholder") || "اختر كورس..."} />
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
                        <Label>{t("teacher.homeworks.create.homeworkTitle") || "عنوان الواجب"}</Label>
                        <Input
                            value={homeworkTitle}
                            onChange={(e) => setHomeworkTitle(e.target.value)}
                            placeholder={t("teacher.homeworks.create.homeworkTitlePlaceholder") || "أدخل عنوان الواجب"}
                        />
                    </div>
                </div>

                {selectedCourse && (
                    <Card>
                        <CardHeader>
                            <CardTitle>{t("teacher.homeworks.create.position.title") || "ترتيب الواجب في الكورس"}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {t("teacher.homeworks.create.position.description") || "اسحب الواجب إلى الموقع المطلوب بين الدروس والامتحانات والواجبات الموجودة"}
                            </p>
                            <p className="text-sm text-blue-600">
                                {t("teacher.homeworks.create.position.selectedPosition", { position: selectedPosition }) || `الموقع المحدد: ${selectedPosition}`}
                            </p>
                        </CardHeader>
                        <CardContent>
                            {isLoadingCourseItems ? (
                                <div className="text-center py-8">
                                    <div className="text-muted-foreground">{t("teacher.homeworks.create.position.loading") || "جاري تحميل محتوى الكورس..."}</div>
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
                                                                className={`p-3 border rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 w-full ${
                                                                    snapshot.isDragging ? "bg-blue-50" : "bg-white"
                                                                } ${item.id === homeworkId ? "border-2 border-dashed border-blue-300 bg-blue-50" : ""}`}
                                                            >
                                                                <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1 w-full sm:w-auto">
                                                                    <div {...provided.dragHandleProps} className={`flex-shrink-0 ${item.id === homeworkId ? "cursor-grab active:cursor-grabbing" : ""}`}>
                                                                        <GripVertical className={`h-4 w-4 ${item.id === homeworkId ? "text-blue-600" : "text-gray-300 cursor-not-allowed"}`} />
                                                                    </div>
                                                                    <div className="min-w-0 flex-1 w-full">
                                                                        <div className={`font-medium break-words overflow-wrap-anywhere ${item.id === homeworkId ? "text-blue-800" : ""}`}>
                                                                            {item.title}
                                                                        </div>
                                                                        <div className={`text-sm ${item.id === homeworkId ? "text-blue-600" : "text-muted-foreground"}`}>
                                                                            {item.type === "chapter" ? t("teacher.homeworks.create.position.chapter") || "درس" : 
                                             item.type === "quiz" ? t("teacher.homeworks.create.position.quiz") || "امتحان" : 
                                             t("teacher.homeworks.create.position.homework") || "واجب"}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <Badge variant={item.id === homeworkId ? "outline" : (item.isPublished ? "default" : "secondary")} className={`flex-shrink-0 ${item.id === homeworkId ? "border-blue-300 text-blue-700" : ""}`}>
                                                                    {item.id === homeworkId ? t("teacher.homeworks.edit.editing") || "قيد التعديل" : (item.isPublished ? t("teacher.homeworks.status.published") || "منشور" : t("teacher.homeworks.status.draft") || "مسودة")}
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
                                        {t("teacher.homeworks.create.position.empty") || "لا توجد دروس أو امتحانات أو واجبات في هذه الكورس. سيتم إضافة الواجب في الموقع الأول."}
                                    </p>
                                    <div className="p-3 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                                        <div className="flex items-center justify-center space-x-3">
                                            <div>
                                                <div className="font-medium text-blue-800">
                                                    {homeworkTitle || t("teacher.homeworks.create.newHomework") || "واجب جديد"}
                                                </div>
                                                <div className="text-sm text-blue-600">{t("teacher.homeworks.create.position.homework") || "واجب"}</div>
                                            </div>
                                            <Badge variant="outline" className="border-blue-300 text-blue-700">
                                                {t("teacher.homeworks.edit.editing") || "قيد التعديل"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                <div className="space-y-2">
                    <Label>{t("teacher.homeworks.create.description") || "وصف الواجب"}</Label>
                    <Textarea
                        value={homeworkDescription}
                        onChange={(e) => setHomeworkDescription(e.target.value)}
                        placeholder={t("teacher.homeworks.create.descriptionPlaceholder") || "أدخل وصف الواجب"}
                        rows={3}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.timer.label") || "مدة الواجب (بالدقائق)"}</Label>
                        <Input
                            type="number"
                            value={homeworkTimer || ""}
                            onChange={(e) => setHomeworkTimer(e.target.value ? parseInt(e.target.value) : null)}
                            placeholder={t("teacher.homeworks.create.timer.placeholder") || "اترك فارغاً لعدم تحديد مدة"}
                            min="1"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("teacher.homeworks.create.timer.hint") || "اترك الحقل فارغاً إذا كنت لا تريد تحديد مدة للواجب"}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label>{t("teacher.homeworks.create.maxAttempts.label") || "عدد المحاولات المسموحة"}</Label>
                        <Input
                            type="number"
                            value={homeworkMaxAttempts}
                            onChange={(e) => setHomeworkMaxAttempts(parseInt(e.target.value))}
                            min="1"
                            max="10"
                        />
                        <p className="text-sm text-muted-foreground">
                            {t("teacher.homeworks.create.maxAttempts.hint") || "عدد المرات التي يمكن للطالب إعادة الواجب"}
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>{t("teacher.homeworks.create.questions.label") || "الأسئلة"}</Label>
                    </div>

                    {questions.map((question, index) => (
                        <Card key={question.id}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{t("teacher.homeworks.create.questions.questionNumber", { number: index + 1 }) || `السؤال ${index + 1}`}</CardTitle>
                                        {((!question.text.trim() && !question.imageUrl) || 
                                            (question.type === "MULTIPLE_CHOICE" && 
                                             (!question.options || question.options.filter(opt => opt.trim() !== "").length === 0)) ||
                                            (question.type === "TRUE_FALSE" && 
                                             (typeof question.correctAnswer !== 'string' || (question.correctAnswer !== "true" && question.correctAnswer !== "false"))) ||
                                            (question.type === "SHORT_ANSWER" && 
                                             (typeof question.correctAnswer !== 'string' || question.correctAnswer.trim() === ""))) && (
                                            <Badge variant="destructive" className="text-xs">
                                                {t("teacher.homeworks.create.questions.incomplete") || "غير مكتمل"}
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
                                        <Label>
                                            {t("teacher.homeworks.create.questions.questionText") || "نص السؤال"}
                                            {question.imageUrl && (
                                                <span className="text-muted-foreground text-xs font-normal"> ({t("common.optional") || "اختياري"})</span>
                                            )}
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            {listeningQuestionId === question.id && (
                                                <span className="text-xs text-blue-600">
                                                    {t("teacher.homeworks.create.questions.listening") || "جاري الاستماع..."}
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
                                                    {listeningQuestionId === question.id ? t("teacher.homeworks.create.questions.stopRecording") || "إيقاف التسجيل الصوتي" : t("teacher.homeworks.create.questions.startRecording") || "بدء التسجيل الصوتي"}
                                                </span>
                                            </Button>
                                        </div>
                                    </div>
                                    <Textarea
                                        value={question.text}
                                        onChange={(e) => updateQuestion(index, "text", e.target.value)}
                                        placeholder={t("teacher.homeworks.create.questions.questionTextPlaceholder") || "أدخل نص السؤال"}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>{t("teacher.homeworks.create.questions.questionImage") || "صورة السؤال (اختياري)"}</Label>
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
                                                <R2FileUpload
                                                    endpoint="courseAttachment"
                                                    onChange={(res) => {
                                                        if (res) {
                                                            updateQuestion(index, "imageUrl", res.url);
                                                            toast.success(t("teacher.homeworks.create.questions.imageUploadSuccess") || "تم رفع الصورة بنجاح");
                                                        }
                                                        setUploadingImages(prev => ({ ...prev, [index]: false }));
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.questionType") || "نوع السؤال"}</Label>
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
                                                <SelectItem value="MULTIPLE_CHOICE">{t("teacher.homeworks.create.questions.multipleChoice") || "اختيار من متعدد"}</SelectItem>
                                                <SelectItem value="TRUE_FALSE">{t("teacher.homeworks.create.questions.trueFalse") || "صح أو خطأ"}</SelectItem>
                                                <SelectItem value="SHORT_ANSWER">{t("teacher.homeworks.create.questions.shortAnswer") || "إجابة قصيرة"}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.points") || "الدرجات"}</Label>
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
                                        <Label>{t("teacher.homeworks.create.questions.options") || "الخيارات"}</Label>
                                        {(question.options || ["", "", "", ""]).map((option, optionIndex) => (
                                            <div key={optionIndex} className="flex items-center space-x-2">
                                                <Input
                                                    value={option}
                                                    onChange={(e) => {
                                                        const newOptions = [...(question.options || ["", "", "", ""])];
                                                        newOptions[optionIndex] = e.target.value;
                                                        updateQuestion(index, "options", newOptions);
                                                    }}
                                                    placeholder={t("teacher.homeworks.create.questions.optionPlaceholder", { number: optionIndex + 1 }) || `الخيار ${optionIndex + 1}`}
                                                />
                                                <input
                                                    type="radio"
                                                    name={`correct-${index}`}
                                                    checked={question.correctAnswer === optionIndex}
                                                    onChange={() => updateQuestion(index, "correctAnswer", optionIndex)}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {question.type === "TRUE_FALSE" && (
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.correctAnswer") || "الإجابة الصحيحة"}</Label>
                                        <Select
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onValueChange={(value) => updateQuestion(index, "correctAnswer", value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("teacher.homeworks.create.questions.selectCorrectAnswer") || "اختر الإجابة الصحيحة"} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">{t("teacher.homeworks.create.questions.true") || "صح"}</SelectItem>
                                                <SelectItem value="false">{t("teacher.homeworks.create.questions.false") || "خطأ"}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {question.type === "SHORT_ANSWER" && (
                                    <div className="space-y-2">
                                        <Label>{t("teacher.homeworks.create.questions.correctAnswer") || "الإجابة الصحيحة"}</Label>
                                        <Input
                                            value={typeof question.correctAnswer === 'string' ? question.correctAnswer : ''}
                                            onChange={(e) => updateQuestion(index, "correctAnswer", e.target.value)}
                                            placeholder={t("teacher.homeworks.create.questions.correctAnswerPlaceholder") || "أدخل الإجابة الصحيحة"}
                                        />
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                    
                    <div className="flex justify-center pt-4">
                        <Button type="button" variant="outline" onClick={addQuestion} className="w-full sm:w-auto">
                            <Plus className="h-4 w-4 mr-2" />
                            {t("teacher.homeworks.create.questions.addQuestion") || "إضافة سؤال"}
                        </Button>
                    </div>
                </div>

                <div className="flex justify-end space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(dashboardPath)}
                    >
                        {t("common.cancel") || "إلغاء"}
                    </Button>
                    <Button
                        onClick={handleUpdateHomework}
                        disabled={isUpdatingHomework || questions.length === 0}
                    >
                        {isUpdatingHomework ? t("common.updating") || "جاري التحديث..." : t("teacher.homeworks.edit.update") || "تحديث الواجب"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditHomeworkPage;

