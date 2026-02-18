"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Search, Eye, Award, TrendingUp, Users, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useLanguage } from "@/lib/contexts/language-context";
import { isFirstGrade, isSecondGrade, isThirdGrade } from "@/lib/utils/grade-utils";

interface Course {
    id: string;
    title: string;
}

interface Quiz {
    id: string;
    title: string;
    courseId: string;
    course: {
        title: string;
    };
    totalPoints: number;
}

interface QuizResult {
    id: string;
    studentId: string;
    user: {
        fullName: string;
        phoneNumber: string;
        grade: string | null;
    };
    quizId: string;
    quiz: {
        title: string;
        course: {
            id: string;
            title: string;
        };
        totalPoints: number;
    };
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    answers: QuizAnswer[];
}

interface QuizAnswer {
    questionId: string;
    question: {
        text: string;
        type: string;
        points: number;
        imageUrl?: string | null;
    };
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
}

interface Homework {
    id: string;
    title: string;
    courseId: string;
    course: {
        title: string;
    };
}

interface HomeworkResult {
    id: string;
    studentId: string;
    user: {
        fullName: string;
        phoneNumber: string;
        grade: string | null;
    };
    homeworkId: string;
    homework: {
        title: string;
        course: {
            id: string;
            title: string;
        };
    };
    score: number;
    totalPoints: number;
    percentage: number;
    submittedAt: string;
    answers: HomeworkAnswer[];
}

interface HomeworkAnswer {
    questionId: string;
    question: {
        text: string;
        type: string;
        points: number;
        imageUrl?: string | null;
        options?: string[] | null;
    };
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    pointsEarned: number;
}

// Unified result type for display
type ResultItem = (QuizResult & { type: 'quiz' }) | (HomeworkResult & { type: 'homework' });

const GradesPage = () => {
    const { t } = useLanguage();
    const [courses, setCourses] = useState<Course[]>([]);
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
    const [homeworkResults, setHomeworkResults] = useState<HomeworkResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [selectedQuiz, setSelectedQuiz] = useState<string>("");
    const [selectedHomework, setSelectedHomework] = useState<string>("");
    const [selectedResult, setSelectedResult] = useState<ResultItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // Pagination state for each grade
    const [grade1DisplayCount, setGrade1DisplayCount] = useState(25);
    const [grade2DisplayCount, setGrade2DisplayCount] = useState(25);
    const [grade3DisplayCount, setGrade3DisplayCount] = useState(25);
    // Search terms for each grade table
    const [grade1SearchTerm, setGrade1SearchTerm] = useState("");
    const [grade2SearchTerm, setGrade2SearchTerm] = useState("");
    const [grade3SearchTerm, setGrade3SearchTerm] = useState("");

    useEffect(() => {
        fetchCourses();
        fetchQuizzes();
        fetchHomeworks();
        fetchQuizResults();
        fetchHomeworkResults();
    }, []);

    const fetchCourses = async () => {
        try {
            const response = await fetch("/api/courses");
            if (response.ok) {
                const data = await response.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
        }
    };

    const fetchQuizzes = async () => {
        try {
            const response = await fetch("/api/teacher/quizzes");
            if (response.ok) {
                const data = await response.json();
                setQuizzes(data);
            }
        } catch (error) {
            console.error("Error fetching quizzes:", error);
        }
    };

    const fetchHomeworks = async () => {
        try {
            const response = await fetch("/api/teacher/homeworks");
            if (response.ok) {
                const data = await response.json();
                setHomeworks(data);
            }
        } catch (error) {
            console.error("Error fetching homeworks:", error);
        }
    };

    const fetchQuizResults = async () => {
        try {
            const response = await fetch("/api/teacher/quiz-results");
            if (response.ok) {
                const data = await response.json();
                setQuizResults(data);
            }
        } catch (error) {
            console.error("Error fetching quiz results:", error);
        }
    };

    const fetchHomeworkResults = async () => {
        try {
            const response = await fetch("/api/teacher/homework-results");
            if (response.ok) {
                const data = await response.json();
                setHomeworkResults(data);
            }
        } catch (error) {
            console.error("Error fetching homework results:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewResult = (result: ResultItem) => {
        setSelectedResult(result);
        setIsDialogOpen(true);
    };

    // Combine quiz and homework results with type indicators
    const allResults: ResultItem[] = [
        ...quizResults.map(r => ({ ...r, type: 'quiz' as const })),
        ...homeworkResults.map(r => ({ ...r, type: 'homework' as const }))
    ];

    const filteredResults = allResults.filter(result => {
        const isQuiz = result.type === 'quiz';
        const title = isQuiz ? result.quiz.title : result.homework.title;
        const course = isQuiz ? result.quiz.course : result.homework.course;
        
        const matchesSearch = 
            result.user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.title.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCourse = !selectedCourse || selectedCourse === "all" || course.id === selectedCourse;
        const matchesQuiz = !selectedQuiz || selectedQuiz === "all" || (isQuiz && result.quizId === selectedQuiz);
        const matchesHomework = !selectedHomework || selectedHomework === "all" || (!isQuiz && result.homeworkId === selectedHomework);
        
        return matchesSearch && matchesCourse && (matchesQuiz || matchesHomework);
    });

    // Group results by student grade
    const grade1ResultsAll = filteredResults.filter(result => isFirstGrade(result.user.grade));
    const grade2ResultsAll = filteredResults.filter(result => isSecondGrade(result.user.grade));
    const grade3ResultsAll = filteredResults.filter(result => isThirdGrade(result.user.grade));

    // Apply search filters for each grade table
    const grade1Results = grade1ResultsAll.filter(result => {
        const isQuiz = result.type === 'quiz';
        const title = isQuiz ? result.quiz.title : result.homework.title;
        const course = isQuiz ? result.quiz.course : result.homework.course;
        return (
            result.user.fullName.toLowerCase().includes(grade1SearchTerm.toLowerCase()) ||
            title.toLowerCase().includes(grade1SearchTerm.toLowerCase()) ||
            course.title.toLowerCase().includes(grade1SearchTerm.toLowerCase())
        );
    });
    const grade2Results = grade2ResultsAll.filter(result => {
        const isQuiz = result.type === 'quiz';
        const title = isQuiz ? result.quiz.title : result.homework.title;
        const course = isQuiz ? result.quiz.course : result.homework.course;
        return (
            result.user.fullName.toLowerCase().includes(grade2SearchTerm.toLowerCase()) ||
            title.toLowerCase().includes(grade2SearchTerm.toLowerCase()) ||
            course.title.toLowerCase().includes(grade2SearchTerm.toLowerCase())
        );
    });
    const grade3Results = grade3ResultsAll.filter(result => {
        const isQuiz = result.type === 'quiz';
        const title = isQuiz ? result.quiz.title : result.homework.title;
        const course = isQuiz ? result.quiz.course : result.homework.course;
        return (
            result.user.fullName.toLowerCase().includes(grade3SearchTerm.toLowerCase()) ||
            title.toLowerCase().includes(grade3SearchTerm.toLowerCase()) ||
            course.title.toLowerCase().includes(grade3SearchTerm.toLowerCase())
        );
    });

    // Paginated results
    const grade1ResultsPaginated = grade1Results.slice(0, grade1DisplayCount);
    const grade2ResultsPaginated = grade2Results.slice(0, grade2DisplayCount);
    const grade3ResultsPaginated = grade3Results.slice(0, grade3DisplayCount);

    const getGradeColor = (percentage: number) => {
        if (percentage >= 90) return "text-green-600";
        if (percentage >= 80) return "text-green-500";
        if (percentage >= 70) return "text-green-400";
        if (percentage >= 60) return "text-orange-600";
        return "text-red-600";
    };

    const getGradeBadge = (percentage: number) => {
        if (percentage >= 90) return { variant: "default" as const, className: "bg-green-600 text-white" };
        if (percentage >= 80) return { variant: "default" as const, className: "bg-green-500 text-white" };
        if (percentage >= 70) return { variant: "default" as const, className: "bg-green-400 text-white" };
        if (percentage >= 60) return { variant: "default" as const, className: "bg-orange-600 text-white" };
        return { variant: "destructive" as const, className: "" };
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="text-center">{t("teacher.grades.loading")}</div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t("teacher.grades.title")}
                </h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.totalStudents")}</p>
                                <p className="text-2xl font-bold">
                                    {new Set(allResults.map(r => r.studentId)).size}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <Award className="h-8 w-8 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.averageScore")}</p>
                                <p className="text-2xl font-bold">
                                    {allResults.length > 0 
                                        ? (allResults.reduce((sum, r) => sum + r.percentage, 0) / allResults.length).toFixed(1)
                                        : "0.0"}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <TrendingUp className="h-8 w-8 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.highestScore")}</p>
                                <p className="text-2xl font-bold">
                                    {allResults.length > 0 
                                        ? Math.max(...allResults.map(r => r.percentage)).toFixed(1)
                                        : "0.0"}%
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-orange-600" />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">{t("teacher.grades.summary.totalQuizzes")}</p>
                                <p className="text-2xl font-bold">{allResults.length}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>{t("teacher.grades.filters.title")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.search")}</label>
                            <div className="flex items-center space-x-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder={t("teacher.grades.filters.searchPlaceholder")}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.course")}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("teacher.grades.filters.allCourses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("teacher.grades.filters.allCourses")}</SelectItem>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t("teacher.grades.filters.quiz")}</label>
                            <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t("teacher.grades.filters.allQuizzes")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("teacher.grades.filters.allQuizzes")}</SelectItem>
                                    {quizzes.map((quiz) => (
                                        <SelectItem key={quiz.id} value={quiz.id}>
                                            {quiz.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">الواجب</label>
                            <Select value={selectedHomework} onValueChange={setSelectedHomework}>
                                <SelectTrigger>
                                    <SelectValue placeholder="جميع الواجبات" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">جميع الواجبات</SelectItem>
                                    {homeworks.map((homework) => (
                                        <SelectItem key={homework.id} value={homework.id}>
                                            {homework.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Results Tables by Grade */}
            <>
                {/* Grade 1 Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الأول الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.grades.filters.searchPlaceholder")}
                                value={grade1SearchTerm}
                                onChange={(e) => {
                                    setGrade1SearchTerm(e.target.value);
                                    setGrade1DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade1Results.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.student")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">النوع</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.quiz")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.course")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.score")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.percentage")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.submittedAt")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade1ResultsPaginated.map((result) => {
                                                const gradeBadge = getGradeBadge(result.percentage);
                                                const isQuiz = result.type === 'quiz';
                                                const title = isQuiz ? result.quiz.title : result.homework.title;
                                                const course = isQuiz ? result.quiz.course : result.homework.course;
                                                return (
                                                    <TableRow key={`${result.type}-${result.id}`}>
                                                        <TableCell className="font-medium">
                                                            {result.user.fullName}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={isQuiz ? "default" : "secondary"}>
                                                                {isQuiz ? "امتحان" : "واجب"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {title}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {course.title}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold">
                                                                {result.score}/{result.totalPoints}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge {...gradeBadge}>
                                                                {result.percentage.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(result.submittedAt), "dd/MM/yyyy", { locale: ar })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleViewResult(result)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                {t("teacher.grades.table.viewDetails")}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {grade1Results.length > grade1DisplayCount && (
                                    <div className="mt-4 flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setGrade1DisplayCount(grade1DisplayCount + 25)}
                                        >
                                            {t("common.showMore") || "عرض المزيد"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد نتائج في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grade 2 Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الثاني الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.grades.filters.searchPlaceholder")}
                                value={grade2SearchTerm}
                                onChange={(e) => {
                                    setGrade2SearchTerm(e.target.value);
                                    setGrade2DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade2Results.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.student")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">النوع</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.quiz")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.course")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.score")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.percentage")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.submittedAt")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade2ResultsPaginated.map((result) => {
                                                const gradeBadge = getGradeBadge(result.percentage);
                                                const isQuiz = result.type === 'quiz';
                                                const title = isQuiz ? result.quiz.title : result.homework.title;
                                                const course = isQuiz ? result.quiz.course : result.homework.course;
                                                return (
                                                    <TableRow key={`${result.type}-${result.id}`}>
                                                        <TableCell className="font-medium">
                                                            {result.user.fullName}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={isQuiz ? "default" : "secondary"}>
                                                                {isQuiz ? "امتحان" : "واجب"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {title}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {course.title}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold">
                                                                {result.score}/{result.totalPoints}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge {...gradeBadge}>
                                                                {result.percentage.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(result.submittedAt), "dd/MM/yyyy", { locale: ar })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleViewResult(result)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                {t("teacher.grades.table.viewDetails")}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {grade2Results.length > grade2DisplayCount && (
                                    <div className="mt-4 flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setGrade2DisplayCount(grade2DisplayCount + 25)}
                                        >
                                            {t("common.showMore") || "عرض المزيد"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد نتائج في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Grade 3 Results Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>الصف الثالث الثانوي</CardTitle>
                        <div className="flex items-center space-x-2">
                            <Search className="h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("teacher.grades.filters.searchPlaceholder")}
                                value={grade3SearchTerm}
                                onChange={(e) => {
                                    setGrade3SearchTerm(e.target.value);
                                    setGrade3DisplayCount(25);
                                }}
                                className="max-w-sm"
                            />
                        </div>
                    </CardHeader>
                    <CardContent>
                        {grade3Results.length > 0 ? (
                            <>
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.student")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">النوع</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.quiz")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.course")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.score")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.percentage")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.submittedAt")}</TableHead>
                                                <TableHead className="rtl:text-right ltr:text-left">{t("teacher.grades.table.actions")}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {grade3ResultsPaginated.map((result) => {
                                                const gradeBadge = getGradeBadge(result.percentage);
                                                const isQuiz = result.type === 'quiz';
                                                const title = isQuiz ? result.quiz.title : result.homework.title;
                                                const course = isQuiz ? result.quiz.course : result.homework.course;
                                                return (
                                                    <TableRow key={`${result.type}-${result.id}`}>
                                                        <TableCell className="font-medium">
                                                            {result.user.fullName}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={isQuiz ? "default" : "secondary"}>
                                                                {isQuiz ? "امتحان" : "واجب"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {title}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="outline">
                                                                {course.title}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <span className="font-bold">
                                                                {result.score}/{result.totalPoints}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge {...gradeBadge}>
                                                                {result.percentage.toFixed(1)}%
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            {format(new Date(result.submittedAt), "dd/MM/yyyy", { locale: ar })}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline"
                                                                onClick={() => handleViewResult(result)}
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                                {t("teacher.grades.table.viewDetails")}
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                                {grade3Results.length > grade3DisplayCount && (
                                    <div className="mt-4 flex justify-center">
                                        <Button
                                            variant="outline"
                                            onClick={() => setGrade3DisplayCount(grade3DisplayCount + 25)}
                                        >
                                            {t("common.showMore") || "عرض المزيد"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                لا يوجد نتائج في هذا الصف
                            </div>
                        )}
                    </CardContent>
                </Card>
            </>

            {/* Result Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {t("teacher.grades.details.title", { name: selectedResult?.user.fullName || "" })}
                            {selectedResult && (
                                <Badge variant={selectedResult.type === 'quiz' ? "default" : "secondary"} className="mr-2">
                                    {selectedResult.type === 'quiz' ? "امتحان" : "واجب"}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    {selectedResult && (
                        <div className="space-y-6">
                            {/* Summary */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("teacher.grades.details.summary.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {selectedResult.score}/{selectedResult.totalPoints}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.score")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-2xl font-bold ${getGradeColor(selectedResult.percentage)}`}>
                                                {selectedResult.percentage.toFixed(1)}%
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.percentage")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-green-600">
                                                {selectedResult.answers.filter(a => a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.correctAnswers")}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-2xl font-bold text-red-600">
                                                {selectedResult.answers.filter(a => !a.isCorrect).length}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{t("teacher.grades.details.summary.wrongAnswers")}</div>
                                        </div>
                                    </div>
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium">{t("teacher.grades.details.summary.overallProgress")}</span>
                                            <span className="text-sm font-medium">{selectedResult.percentage.toFixed(1)}%</span>
                                        </div>
                                        <Progress value={selectedResult.percentage} className="w-full" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Detailed Answers */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("teacher.grades.details.answers.title")}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {selectedResult.answers.map((answer, index) => (
                                            <div key={answer.questionId} className="border rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium">{t("teacher.grades.details.answers.questionNumber", { number: index + 1 })}</h4>
                                                    <Badge className={answer.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"}>
                                                        {answer.isCorrect ? t("teacher.grades.details.answers.correct") : t("teacher.grades.details.answers.wrong")}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-2">{answer.question.text}</p>
                                                
                                                {/* Question Image */}
                                                {answer.question.imageUrl && (
                                                    <div className="mb-3">
                                                        <img 
                                                            src={answer.question.imageUrl} 
                                                            alt="Question" 
                                                            className="max-w-full h-auto max-h-64 rounded-lg border shadow-sm"
                                                        />
                                                    </div>
                                                )}

                                                {/* Show options for multiple choice questions */}
                                                {answer.question.options && Array.isArray(answer.question.options) && answer.question.options.length > 0 && (
                                                    <div className="mb-3">
                                                        <p className="text-sm font-medium mb-1">الخيارات:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {answer.question.options.map((option: string, optIndex: number) => (
                                                                <Badge 
                                                                    key={optIndex}
                                                                    variant={option === answer.correctAnswer ? "default" : "outline"}
                                                                    className={option === answer.correctAnswer ? "bg-green-600" : ""}
                                                                >
                                                                    {option}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div>
                                                        <span className="font-medium">{t("teacher.grades.details.answers.studentAnswer")}</span>
                                                        <p className="text-muted-foreground">{answer.studentAnswer}</p>
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">{t("teacher.grades.details.answers.correctAnswer")}</span>
                                                        <p className="text-green-600">{answer.correctAnswer}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-2 text-sm">
                                                    <span className="font-medium">{t("teacher.grades.details.answers.points")}</span>
                                                    <span className="text-muted-foreground">
                                                        {" "}{answer.pointsEarned}/{answer.question.points}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default GradesPage; 