import React, { useState, useRef } from "react";
import { Upload, AlertCircle, RefreshCw } from "lucide-react";

interface CSVUploadProps {
  onUploadSuccess: (csvContent: string, fileName: string) => void;
  isLoading: boolean;
  errorMsg: string | null;
}

export default function CSVUpload({ onUploadSuccess, isLoading, errorMsg }: CSVUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a valid CSV file (.csv)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onUploadSuccess(text, file.name);
      }
    };
    reader.onerror = () => {
      alert("Error reading file.");
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full" id="csv-upload-section">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative border border-dashed rounded-2xl p-8 xl:p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-zinc-300 bg-zinc-900/30"
            : "border-zinc-900 hover:border-zinc-800 bg-zinc-950/20"
        } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".csv"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className={`w-12 h-12 rounded-full border border-zinc-850 flex items-center justify-center ${isDragging ? "bg-zinc-900 text-white border-zinc-700" : "bg-zinc-950 text-zinc-400"} transition-all shadow-xl`}>
            {isLoading ? (
              <RefreshCw className="h-5 w-5 animate-spin text-zinc-300" />
            ) : (
              <Upload className="h-5 w-5 text-zinc-300" />
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-zinc-200">
              {isLoading ? "Analyzing Dataset..." : "Upload your dataset"}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Drag and drop your CSV file here, or click to choose from system files. Supports standard spreadsheet formats.
            </p>
          </div>

          {!isLoading && (
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-zinc-300 border border-zinc-850 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors cursor-pointer hover:text-white"
            >
              Browse Files
            </button>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 p-4 rounded-xl bg-red-955/10 border border-red-950 text-red-400 flex items-start space-x-3 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-400" />
          <div className="space-y-1">
            <span className="font-bold text-[10px] font-mono uppercase tracking-widest block text-red-400">Analysis Error</span>
            <p className="text-xs font-mono text-zinc-300">{errorMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
