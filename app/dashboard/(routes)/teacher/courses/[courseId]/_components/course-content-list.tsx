"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Chapter, Quiz } from "@prisma/client";
import { Grip, Trash2, Edit, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/contexts/language-context";

interface CourseItem {
    id: string;
    title: string;
    position: number;
    isPublished: boolean;
    type: "chapter" | "quiz" | "homework";
    isFree?: boolean; // Only for chapters
}

interface CourseContentListProps {
    items: CourseItem[];
    onReorder: (updateData: { id: string; position: number; type: "chapter" | "quiz" | "homework" }[]) => void;
    onEdit: (id: string, type: "chapter" | "quiz" | "homework") => void;
    onDelete: (id: string, type: "chapter" | "quiz" | "homework") => void;
}

export const CourseContentList = ({
    items,
    onReorder,
    onEdit,
    onDelete
}: CourseContentListProps) => {
    const { t } = useLanguage();

    const getActionLabel = (type: "chapter" | "quiz" | "homework", isPublished: boolean) => {
        if (type === "chapter") {
            return isPublished ? t("teacher.courseEdit.content.list.editVideo") : t("teacher.courseEdit.content.list.addVideo");
        } else if (type === "quiz") {
            return isPublished ? t("teacher.courseEdit.content.list.editQuiz") : t("teacher.courseEdit.content.list.addQuiz");
        } else {
            return isPublished ? t("teacher.courseEdit.content.list.editHomework") || "تعديل الواجب" : t("teacher.courseEdit.content.list.addHomework") || "إضافة الواجب";
        }
    };
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const reorderedItems = Array.from(items);
        const [movedItem] = reorderedItems.splice(result.source.index, 1);
        reorderedItems.splice(result.destination.index, 0, movedItem);

        const updateData = reorderedItems.map((item, index) => ({
            id: item.id,
            position: index + 1,
            type: item.type,
        }));

        onReorder(updateData);
    }

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="course-content">
                {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                        {items.map((item, index) => (
                            <Draggable 
                                key={item.id} 
                                draggableId={item.id} 
                                index={index}
                            >
                                {(provided) => (
                                    <div
                                        className={cn(
                                            "flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-x-2 bg-muted border border-muted text-muted-foreground rounded-md mb-4 text-sm p-3 sm:p-0",
                                            item.isPublished && "bg-primary/20 border-primary/20"
                                        )}
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                    >
                                        {/* Mobile: Drag handle at top, Desktop: Left side */}
                                        <div
                                            className={cn(
                                                "flex items-center justify-between sm:justify-start gap-2 sm:px-2 sm:py-3 sm:border-r sm:border-r-muted hover:bg-muted rounded-md sm:rounded-l-md transition",
                                                item.isPublished && "sm:border-r-primary/20"
                                            )}
                                            {...provided.dragHandleProps}
                                        >
                                            <Grip className="h-5 w-5" />
                                            <span className="sm:hidden font-medium text-base">{item.title}</span>
                                        </div>
                                        
                                        {/* Mobile: Content section, Desktop: Middle section */}
                                        <div className="flex-1 px-0 sm:px-2">
                                            {/* Desktop: Title and type badge */}
                                            <div className="hidden sm:flex items-center gap-x-2">
                                                <span>{item.title}</span>
                                                <Badge variant="outline" className="text-xs">
                                                    {item.type === "chapter" ? t("teacher.courseEdit.content.list.chapter") : item.type === "quiz" ? t("teacher.courseEdit.content.list.quiz") : t("teacher.courseEdit.content.list.homework") || "واجب"}
                                                </Badge>
                                            </div>
                                            
                                            {/* Mobile: Type badge and status badges */}
                                            <div className="flex flex-wrap items-center gap-2 sm:hidden">
                                                <Badge variant="outline" className="text-xs">
                                                    {item.type === "chapter" ? t("teacher.courseEdit.content.list.chapter") : item.type === "quiz" ? t("teacher.courseEdit.content.list.quiz") : t("teacher.courseEdit.content.list.homework") || "واجب"}
                                                </Badge>
                                                {item.type === "chapter" && item.isFree && (
                                                    <Badge className="text-xs">
                                                        {t("teacher.courseEdit.content.list.free")}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    className={cn(
                                                        "text-xs bg-muted text-muted-foreground",
                                                        item.isPublished && "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    {item.isPublished ? t("teacher.courseEdit.content.list.published") : t("teacher.courseEdit.content.list.draft")}
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        {/* Mobile: Actions at bottom, Desktop: Right side */}
                                        <div className="flex items-center justify-between sm:ml-auto sm:pr-2 sm:gap-x-2 gap-2">
                                            {/* Desktop: Badges */}
                                            <div className="hidden sm:flex items-center gap-x-2">
                                                {item.type === "chapter" && item.isFree && (
                                                    <Badge className="text-xs">
                                                        {t("teacher.courseEdit.content.list.free")}
                                                    </Badge>
                                                )}
                                                <Badge
                                                    className={cn(
                                                        "text-xs bg-muted text-muted-foreground",
                                                        item.isPublished && "bg-primary text-primary-foreground"
                                                    )}
                                                >
                                                    {item.isPublished ? t("teacher.courseEdit.content.list.published") : t("teacher.courseEdit.content.list.draft")}
                                                </Badge>
                                            </div>
                                            
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 sm:gap-x-2">
                                                <Button
                                                    onClick={() => onEdit(item.id, item.type)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 sm:h-7 text-xs font-medium border-brand/20 text-brand hover:bg-brand hover:text-white hover:border-brand transition-colors flex-shrink-0"
                                                >
                                                    {item.isPublished ? (
                                                        <>
                                                            <Edit className="h-3 w-3 mr-1.5 sm:mr-1" />
                                                            {getActionLabel(item.type, item.isPublished)}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus className="h-3 w-3 mr-1.5 sm:mr-1" />
                                                            {getActionLabel(item.type, item.isPublished)}
                                                        </>
                                                    )}
                                                </Button>
                                                <Button
                                                    onClick={() => onDelete(item.id, item.type)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 sm:h-7 w-8 sm:w-7 p-0 border-destructive/20 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors flex-shrink-0"
                                                    aria-label={t("common.delete")}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}; 