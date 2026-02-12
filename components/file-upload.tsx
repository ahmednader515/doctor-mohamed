"use client";

import { R2FileUpload } from "@/components/r2-file-upload";

interface FileUploadProps {
    onChange: (res?: { url: string; name: string }) => void;
    endpoint?: "courseImage" | "courseAttachment" | "chapterVideo";
}

export const FileUpload = ({
    onChange,
    endpoint,
}: FileUploadProps) => {
    return (
        <R2FileUpload
            endpoint={endpoint}
            onChange={onChange}
        />
    )
}