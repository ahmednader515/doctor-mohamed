"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Homework {
    id: string;
    title: string;
    description: string;
    courseId: string;
    position: number;
    isPublished: boolean;
    timer?: number | null;
    maxAttempts: number;
    course: {
        id: string;
        title: string;
    };
    questions: Question[];
    createdAt: string;
    updatedAt: string;
}

interface Question {
    id: string;
    text: string;
    type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
    options?: string[] | null;
    correctAnswer: string;
    points: number;
    imageUrl?: string | null;
}

const HomeworkViewPage = ({ params }: { params: Promise<{ homeworkId: string }> }) => {
    const router = useRouter();
    const [homework, setHomework] = useState<Homework | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Unwrap the params Promise
    const resolvedParams = use(params);
    const { homeworkId } = resolvedParams;

    useEffect(() => {
        fetchHomework();
    }, [homeworkId]);

    const fetchHomework = async () => {
        try {
            const response = await fetch(`/api/teacher/homeworks/${homeworkId}`);
            if (response.ok) {
                const data = await response.json();
                setHomework(data);
            } else {
                toast.error("لم يتم العثور على الواجب");
                router.push("/dashboard/teacher/homeworks");
            }
        } catch (error) {
            console.error("Error fetching homework:", error);
            toast.error("حدث خطأ أثناء تحميل الواجب");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteHomework = async () => {
        if (!homework || !confirm("هل أنت متأكد من حذف هذا الواجب؟")) {
            return;
        }

        try {
            const response = await fetch(`/api/courses/${homework.courseId}/homeworks/${homework.id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                toast.success("تم حذف الواجب بنجاح");
                router.push("/dashboard/teacher/homeworks");
            } else {
                toast.error("حدث خطأ أثناء حذف الواجب");
            }
        } catch (error) {
            console.error("Error deleting homework:", error);
            toast.error("حدث خطأ أثناء حذف الواجب");
        }
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">جاري التحميل...</div>
            </div>
        );
    }

    if (!homework) {
        return (
            <div className="p-6">
                <div className="text-center">لم يتم العثور على الواجب</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/dashboard/teacher/homeworks")}
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        العودة
                    </Button>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        {homework.title}
                    </h1>
                </div>
                <div className="flex items-center space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/dashboard/teacher/homeworks/${homework.id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" />
                        تعديل
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDeleteHomework}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        حذف
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>تفاصيل الواجب</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">الوصف</h3>
                                <p className="text-muted-foreground">{homework.description || "لا يوجد وصف"}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-medium mb-1">الكورس</h4>
                                    <Badge variant="outline">{homework.course.title}</Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">الموقع</h4>
                                    <Badge variant="secondary">{homework.position}</Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">الحالة</h4>
                                    <Badge variant={homework.isPublished ? "default" : "secondary"}>
                                        {homework.isPublished ? "منشور" : "مسودة"}
                                    </Badge>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-1">عدد الأسئلة</h4>
                                    <Badge variant="secondary">{homework.questions.length} سؤال</Badge>
                                </div>
                                {homework.timer && (
                                    <div>
                                        <h4 className="font-medium mb-1">الوقت المحدد</h4>
                                        <Badge variant="secondary">{homework.timer} دقيقة</Badge>
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-medium mb-1">الحد الأقصى للمحاولات</h4>
                                    <Badge variant="secondary">{homework.maxAttempts} محاولة</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <FileText className="h-5 w-5 mr-2" />
                                الأسئلة ({homework.questions.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {homework.questions.map((question, index) => (
                                <div key={question.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium">السؤال {index + 1}</h4>
                                        <Badge variant="outline">{question.points} درجة</Badge>
                                    </div>
                                    
                                    <p className="text-muted-foreground mb-3">{question.text}</p>
                                    
                                    {/* Question Image */}
                                    {question.imageUrl && (
                                        <div className="mb-3">
                                            <img 
                                                src={question.imageUrl} 
                                                alt="Question" 
                                                className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                                            />
                                        </div>
                                    )}
                                    
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Badge variant="secondary">{question.type}</Badge>
                                        </div>
                                        
                                        {question.type === "MULTIPLE_CHOICE" && question.options && (
                                            <div className="space-y-2">
                                                <h5 className="font-medium text-sm">الخيارات:</h5>
                                                <div className="space-y-1">
                                                    {question.options.map((option, optionIndex) => (
                                                        <div
                                                            key={optionIndex}
                                                            className={`p-2 rounded border ${
                                                                option === question.correctAnswer
                                                                    ? "bg-green-50 border-green-200"
                                                                    : "bg-gray-50"
                                                            }`}
                                                        >
                                                            <span className="text-sm">
                                                                {optionIndex + 1}. {option}
                                                                {option === question.correctAnswer && (
                                                                    <Badge variant="default" className="mr-2">
                                                                        الإجابة الصحيحة
                                                                    </Badge>
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {question.type === "TRUE_FALSE" && (
                                            <div className="space-y-2">
                                                <h5 className="font-medium text-sm">الإجابة الصحيحة:</h5>
                                                <Badge variant="default">
                                                    {question.correctAnswer === "true" ? "صح" : "خطأ"}
                                                </Badge>
                                            </div>
                                        )}
                                        
                                        {question.type === "SHORT_ANSWER" && (
                                            <div className="space-y-2">
                                                <h5 className="font-medium text-sm">الإجابة الصحيحة:</h5>
                                                <p className="text-sm bg-green-50 p-2 rounded border border-green-200">
                                                    {question.correctAnswer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>إحصائيات</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span>إجمالي الدرجات</span>
                                <Badge variant="default">
                                    {homework.questions.reduce((sum, q) => sum + q.points, 0)} درجة
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>تاريخ الإنشاء</span>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(homework.createdAt).toLocaleDateString("ar-EG")}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span>آخر تحديث</span>
                                <span className="text-sm text-muted-foreground">
                                    {new Date(homework.updatedAt).toLocaleDateString("ar-EG")}
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>الإجراءات السريعة</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/teacher/homeworks/${homework.id}/edit`)}
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                تعديل الواجب
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/teacher/grades?homeworkId=${homework.id}`)}
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                عرض النتائج
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HomeworkViewPage;

