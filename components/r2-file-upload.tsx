"use client";

import { useState, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Upload, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { getFolderByType } from "@/lib/r2/upload";
import { formatMaxSizeMB, getDefaultMaxSize } from "@/lib/r2/limits";
import { useLanguage } from "@/lib/contexts/language-context";

interface FileUploadProps {
  onChange: (res?: { url: string; name: string }) => void;
  endpoint?: "courseImage" | "courseAttachment" | "chapterVideo";
  folder?: string;
  accept?: string;
  maxSize?: number; // in bytes
}

export const R2FileUpload = ({
  onChange,
  endpoint,
  folder,
  accept,
  maxSize,
}: FileUploadProps) => {
  const { t } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const effectiveMaxSize = maxSize ?? getDefaultMaxSize(endpoint);

  const uploadFile = async (file: File) => {
    if (effectiveMaxSize && file.size > effectiveMaxSize) {
      toast.error(
        t("common.fileSizeExceeded", { size: formatMaxSizeMB(effectiveMaxSize) })
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);

      let uploadFolder = folder;
      if (!uploadFolder && endpoint) {
        if (endpoint === "courseImage") {
          uploadFolder = "images";
        } else if (endpoint === "chapterVideo") {
          uploadFolder = "videos";
        } else {
          uploadFolder = getFolderByType(file.name, file.type);
        }
      }

      if (uploadFolder) {
        formData.append("folder", uploadFolder);
      }

      if (endpoint) {
        formData.append("endpoint", endpoint);
      }

      const response = await fetch("/api/r2/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        let message = t("common.uploadFailed");
        try {
          const errorBody = await response.json();
          if (errorBody?.error) message = errorBody.error;
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }

      if (!response.body) {
        throw new Error(t("common.uploadFailed"));
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            let data: any;
            try {
              data = JSON.parse(line.slice(6));
            } catch (parseError) {
              console.error("Error parsing SSE data:", parseError);
              continue;
            }

            if (data.progress !== undefined) {
              setUploadProgress(data.progress);
            } else if (data.done) {
              setUploadProgress(100);
              onChange({
                url: data.url,
                name: data.name,
              });
              toast.success(t("common.uploadSuccess"));
            } else if (data.error) {
              throw new Error(data.error);
            }
          }
        }
      }
    } catch (error: any) {
      toast.error(error.message || t("common.uploadFailed"));
      setUploadProgress(0);
    } finally {
      setUploading(false);
      setFileName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const getAcceptString = () => {
    if (accept) return accept;
    if (endpoint === "courseImage") return "image/*";
    if (endpoint === "chapterVideo") return "video/*";
    return "*/*";
  };

  const getHintText = () => {
    if (!endpoint) return t("common.selectAFile");
    if (endpoint === "courseImage") {
      return t("common.imageFilesMax", {
        size: formatMaxSizeMB(effectiveMaxSize ?? getDefaultMaxSize("courseImage")!),
      });
    }
    if (endpoint === "chapterVideo") {
      return t("common.videoFilesMax", {
        size: formatMaxSizeMB(effectiveMaxSize ?? getDefaultMaxSize("chapterVideo")!),
      });
    }
    if (endpoint === "courseAttachment") {
      return t("common.anyFileTypeMax", {
        size: formatMaxSizeMB(effectiveMaxSize ?? getDefaultMaxSize("courseAttachment")!),
      });
    }
    return t("common.selectAFile");
  };

  return (
    <div className="w-full">
      {uploading ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{fileName}</span>
            <span className="font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="w-full" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("common.uploading")}</span>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center
            transition-colors cursor-pointer
            ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            hover:border-primary/50
          `}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={getAcceptString()}
            onChange={handleFileSelect}
          />
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-10 w-10 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-primary font-medium">{t("common.clickToUpload")}</span>{" "}
              {t("common.orDragAndDrop")}
            </div>
            <p className="text-xs text-muted-foreground">{getHintText()}</p>
          </div>
        </div>
      )}
    </div>
  );
};
