"use client";

import { Button } from "@/components/ui/button";

interface DownloadButtonProps {
  downloadUrl: string | null;
}

export default function DownloadButton({ downloadUrl }: DownloadButtonProps) {
  if (!downloadUrl) return null; // Hide if no file available

  return (
    <Button asChild className="w-full">
      <a href={downloadUrl} download="question_paper.pdf">
        Download Question Paper
      </a>
    </Button>
  );
}
