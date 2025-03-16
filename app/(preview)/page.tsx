"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileUp, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AnimatePresence, motion } from "framer-motion";

// Placeholder for plagiarism result type
interface PlagiarismSource {
  text: string;
  source: string;
  similarity: number;
  url?: string;
}

export default function PlagiarismChecker() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [plagiarismResults, setPlagiarismResults] = useState<PlagiarismSource[]>([]);
  const [overallSimilarity, setOverallSimilarity] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) {
      return;
    }
    
    if (selectedFile.type !== "application/pdf" || selectedFile.size > 5 * 1024 * 1024) {
      toast.error("Only PDF files under 5MB are allowed.");
      return;
    }

    setFile(selectedFile);
    // Reset results when a new file is uploaded
    setPlagiarismResults([]);
    setOverallSimilarity(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      toast.error("Please upload a PDF file.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("document", file);
      formData.append("customPrompt", customPrompt.trim());

      const response = await fetch("/api/check-plagiarism", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to check plagiarism.");
      }

      const data = await response.json();
      setPlagiarismResults(data.sources);
      setOverallSimilarity(data.overallSimilarity);
      
      toast.success("Plagiarism check completed!");
    } catch (error) {
      toast.error("Failed to check plagiarism. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-[1dvh] w-full flex flex-col items-center justify-center pb-12"
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
        });
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
            <div>Drag and drop a PDF here</div>
          </motion.div>
        )}
      </AnimatePresence>

      <Card className="w-full max-w-md h-full border-0 sm:border sm:h-fit mt-12">
        <CardHeader className="text-center space-y-6">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold">Plagiarism Checker</CardTitle>
            <CardDescription className="text-base">
              Upload a PDF document to check for plagiarism.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <input
                type="file"
                onChange={handleFileChange}
                accept="application/pdf"
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileUp className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {file ? (
                  <span className="font-medium text-foreground">
                    {file.name}
                  </span>
                ) : (
                  <span>Drop your PDF here or click to browse.</span>
                )}
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={!file || isLoading}>
              {isLoading ? (
                <span className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span>Checking Plagiarism...</span>
                </span>
              ) : (
                "Check Plagiarism"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results Section */}
      {plagiarismResults.length > 0 && (
        <div className="w-full max-w-4xl mt-8">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className={`h-5 w-5 ${overallSimilarity && overallSimilarity > 30 ? "text-red-500" : "text-yellow-500"}`} />
                Overall Similarity: {overallSimilarity !== null ? `${overallSimilarity.toFixed(1)}%` : 'N/A'}
              </CardTitle>
              <CardDescription>
                {overallSimilarity !== null ? (
                  overallSimilarity > 30 
                    ? "Similarity detected. Review the sources below."
                    : "Similarity detected. Document appears mostly original."
                ) : ''}
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="space-y-4">
            <h2 className="text-xl font-bold">Plagiarism Sources</h2>
            {plagiarismResults.map((result, index) => (
              <Card key={index} className={`border-l-4 ${result.similarity > 50 ? "border-l-red-500" : "border-l-yellow-400"}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-medium flex justify-between">
                    <span>Source {index + 1}</span>
                    <span className={`${result.similarity > 50 ? "text-red-500" : "text-yellow-500"}`}>
                      {result.similarity.toFixed(1)}% Match
                    </span>
                  </CardTitle>
                  <CardDescription className="text-sm truncate">
                    {result.url ? (
                      <a href={result.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {result.source}
                      </a>
                    ) : (
                      result.source
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="text-sm bg-muted p-3 rounded-md">
                    <p className="italic">"{result.text}"</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}