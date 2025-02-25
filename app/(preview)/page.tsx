"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DownloadButton from "@/components/download-button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";

export default function ChatWithFiles() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(
      (file) => file.type === "application/pdf" && file.size <= 5 * 1024 * 1024
    );

    if (validFiles.length !== selectedFiles.length) {
      toast.error("Only PDF files under 5MB are allowed.");
    }

    if (validFiles.length > 2) {
      toast.error("You can only upload up to two PDFs.");
      return;
    }

    setFiles(validFiles);
  };

  const handleSubmitWithFiles = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (files.length !== 2) {
      toast.error("Please upload exactly two PDFs.");
      return;
    }

    setIsLoading(true);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append("pyq", files[0]); // First PDF
      formData.append("syllabus", files[1]); // Second PDF

      const response = await fetch("/api/generate-question-paper", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate question paper.");
      }

      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      setDownloadUrl(pdfUrl);
      toast.success("Question paper generated successfully!");
    } catch (error) {
      toast.error("Failed to generate paper. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] w-full flex justify-center"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFileChange({
          target: { files: e.dataTransfer.files },
        } as React.ChangeEvent<HTMLInputElement>);
      }}
    >
      <AnimatePresence>
        {isDragging && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center bg-zinc-100/90 dark:bg-zinc-900/90 z-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div>Drag and drop up to two PDFs here</div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="w-full max-w-md h-full border-0 sm:border sm:h-fit mt-12">
        <CardHeader className="text-center space-y-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Upload PDFs</CardTitle>
            <CardDescription className="text-base">
              Upload two PDFs to generate a question paper.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmitWithFiles} className="space-y-4">
            <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <input
                type="file"
                onChange={handleFileChange}
                accept="application/pdf"
                multiple
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {files.length > 0 ? (
                  <span className="font-medium text-foreground">
                    {files.map((file) => file.name).join(", ")}
                  </span>
                ) : (
                  <span>Drop your PDFs here or click to browse.</span>
                )}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={files.length !== 2}>
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating Paper...</span>
                </span>
              ) : (
                "Generate Question Paper"
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center space-y-4">
          {downloadUrl && <DownloadButton downloadUrl={downloadUrl} />}
        </CardFooter>
      </Card>
    </div>
  );
}
