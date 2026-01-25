/**
 * Normalizes Arabic grade strings for comparison
 * Handles variations in Arabic characters (أ, إ, آ) by converting them to basic ا
 */
export function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return "";
    return grade.trim()
        .replace(/أ/g, "ا") // Normalize أ to ا for comparison
        .replace(/إ/g, "ا") // Normalize إ to ا for comparison
        .replace(/آ/g, "ا"); // Normalize آ to ا for comparison
}

/**
 * Checks if a grade matches the first grade (handles both variations)
 */
export function isFirstGrade(grade: string | null | undefined): boolean {
    const normalized = normalizeGrade(grade);
    return normalized === "الصف الاول الثانوي" || normalized === "الصف الأول الثانوي";
}

/**
 * Checks if a grade matches the second grade
 */
export function isSecondGrade(grade: string | null | undefined): boolean {
    const normalized = normalizeGrade(grade);
    return normalized === "الصف الثاني الثانوي";
}

/**
 * Checks if a grade matches the third grade
 */
export function isThirdGrade(grade: string | null | undefined): boolean {
    const normalized = normalizeGrade(grade);
    return normalized === "الصف الثالث الثانوي";
}

