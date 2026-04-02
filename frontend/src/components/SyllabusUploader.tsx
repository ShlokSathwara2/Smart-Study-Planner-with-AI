"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface ChapterInput {
  id: string;
  title: string;
  pages: string;
}

export interface SyllabusUploadData {
  type: "file" | "manual";
  file?: File;
  chapters?: { title: string; pages: number }[];
  referenceBook?: File;
}

interface SyllabusUploaderProps {
  onSyllabusSubmit: (data: SyllabusUploadData) => Promise<boolean>;
  accept?: string[];
  maxSize?: number; // in MB
}

export function SyllabusUploader({
  onSyllabusSubmit,
  accept = [".pdf", ".docx", ".png", ".jpg", ".jpeg"],
  maxSize = 10,
}: SyllabusUploaderProps) {
  const [mode, setMode] = useState<"file" | "manual">("manual");
  const [isDraggingSyllabus, setIsDraggingSyllabus] = useState(false);
  const [isDraggingBook, setIsDraggingBook] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // File Mode
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);

  // Manual Mode
  const [chapters, setChapters] = useState<ChapterInput[]>([{ id: "1", title: "", pages: "" }]);

  // Optional Reference Book
  const [referenceBook, setReferenceBook] = useState<File | null>(null);

  const syllabusInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType = accept.some((ext) => extension === ext.toLowerCase());

    if (!isValidType) {
      setError(`Invalid file type. Accepted: ${accept.join(", ")}`);
      return false;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      setError(`File too large. Maximum size: ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const validatePdfOnly = (file: File): boolean => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Reference book must be a PDF file.");
      return false;
    }
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > 50) {
      setError("Book file is too large. Maximum size: 50MB");
      return false;
    }
    return true;
  };

  // --- Handlers for Syllabus File ---
  const handleSyllabusFile = useCallback((file: File) => {
    setError(null);
    if (validateFile(file)) setSyllabusFile(file);
  }, []);

  const handleSyllabusDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingSyllabus(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleSyllabusFile(e.dataTransfer.files[0]);
      }
    },
    [handleSyllabusFile]
  );

  // --- Handlers for Book File ---
  const handleBookFile = useCallback((file: File) => {
    setError(null);
    if (validatePdfOnly(file)) setReferenceBook(file);
  }, []);

  const handleBookDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingBook(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleBookFile(e.dataTransfer.files[0]);
      }
    },
    [handleBookFile]
  );

  // --- Manual Mode Actions ---
  const addChapter = () => {
    setChapters([...chapters, { id: Math.random().toString(), title: "", pages: "" }]);
  };
  const updateChapter = (id: string, field: "title" | "pages", value: string) => {
    setChapters(chapters.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const removeChapter = (id: string) => {
    if (chapters.length > 1) {
      setChapters(chapters.filter((c) => c.id !== id));
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    setError(null);
    let data: SyllabusUploadData;

    if (mode === "file") {
      if (!syllabusFile) {
        setError("Please upload a syllabus file.");
        return;
      }
      data = { type: "file", file: syllabusFile, referenceBook: referenceBook || undefined };
    } else {
      const validChapters = chapters.filter((c) => c.title.trim() !== "" && parseInt(c.pages) > 0);
      if (validChapters.length === 0) {
        setError("Please enter at least one valid chapter with page counts.");
        return;
      }
      data = {
        type: "manual",
        chapters: validChapters.map((c) => ({ title: c.title, pages: parseInt(c.pages) })),
        referenceBook: referenceBook || undefined,
      };
    }

    setUploading(true);
    try {
      await onSyllabusSubmit(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-3xl mx-auto p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-50 mb-2">Configure Your Syllabus</h2>
        <p className="text-sm text-slate-400">
          Upload a file or type your chapters to create a micro-level study plan.
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex bg-slate-900/50 p-1 rounded-xl w-fit mx-auto mb-8 border border-white/5">
        <button
          onClick={() => setMode("manual")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "manual" ? "bg-indigo-500/20 text-indigo-300 shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Type Manually
        </button>
        <button
          onClick={() => setMode("file")}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "file" ? "bg-indigo-500/20 text-indigo-300 shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Upload File
        </button>
      </div>

      {/* Dynamic Content */}
      <AnimatePresence mode="wait">
        {mode === "manual" ? (
          <motion.div
            key="manual"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 mb-8"
          >
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-medium text-slate-300">Chapters & Page Counts</h3>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Required for micro-planning</p>
            </div>
            {chapters.map((c, idx) => (
              <div key={c.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    type="text"
                    value={c.title}
                    onChange={(e) => updateChapter(c.id, "title", e.target.value)}
                    placeholder={`e.g. Chapter ${idx + 1}: Thermodynamics`}
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="w-24 shrink-0">
                  <input
                    type="number"
                    min="1"
                    value={c.pages}
                    onChange={(e) => updateChapter(c.id, "pages", e.target.value)}
                    placeholder="Pages"
                    className="w-full bg-slate-800/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                {chapters.length > 1 && (
                  <button
                    onClick={() => removeChapter(c.id)}
                    className="p-3 text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addChapter}
              className="text-sm text-indigo-400 hover:text-indigo-300 font-medium py-2 flex items-center gap-1.5 transition-colors"
            >
              <span className="text-lg leading-none">+</span> Add another chapter
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="file"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8"
          >
            {!syllabusFile ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingSyllabus(true); }}
                onDragLeave={() => setIsDraggingSyllabus(false)}
                onDrop={handleSyllabusDrop}
                onClick={() => syllabusInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDraggingSyllabus ? "border-indigo-400 bg-indigo-500/10" : "border-white/10 hover:border-indigo-500/30 hover:bg-white/[0.02]"
                }`}
              >
                <input ref={syllabusInputRef} type="file" accept={accept.join(",")} onChange={(e) => { if (e.target.files) handleSyllabusFile(e.target.files[0]); }} className="hidden" />
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm font-medium text-slate-200 mb-1">Click or drag syllabus here</p>
                <p className="text-xs text-slate-500">{accept.join(", ")} up to {maxSize}MB</p>
              </div>
            ) : (
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{syllabusFile.name}</p>
                    <p className="text-xs text-slate-400">{(syllabusFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button onClick={() => setSyllabusFile(null)} className="text-slate-400 hover:text-rose-400 p-2">✕</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Optional Reference Book */}
      <div className="border-t border-white/5 pt-6 mb-8">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-sm font-medium text-slate-300">Reference Book (Optional)</h3>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider">For AI Content Extraction</p>
        </div>
        {!referenceBook ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingBook(true); }}
            onDragLeave={() => setIsDraggingBook(false)}
            onDrop={handleBookDrop}
            onClick={() => bookInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDraggingBook ? "border-violet-400 bg-violet-500/10" : "border-white/10 hover:border-violet-500/30 hover:bg-white/[0.02]"
            }`}
          >
            <input ref={bookInputRef} type="file" accept=".pdf" onChange={(e) => { if (e.target.files) handleBookFile(e.target.files[0]); }} className="hidden" />
            <div className="flex items-center justify-center gap-4">
              <div className="text-3xl opacity-80">📚</div>
              <div className="text-left">
                <p className="text-sm font-medium text-slate-200">Have the PDF of your book?</p>
                <p className="text-xs text-slate-500">Upload it here, or AI will fetch info from the internet.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📚</span>
              <div>
                <p className="text-sm font-medium text-slate-200 truncate max-w-[200px] sm:max-w-xs">{referenceBook.name}</p>
                <p className="text-xs text-violet-300/80">Will be used for content & questions</p>
              </div>
            </div>
            <button onClick={() => setReferenceBook(null)} className="text-slate-400 hover:text-rose-400 p-2">✕</button>
          </div>
        )}
      </div>

      {/* Error & Submit */}
      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
          <span>⚠️</span><p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}

      {uploading ? (
        <div className="text-center py-4">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden mb-2">
            <motion.div className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
          <p className="text-xs text-slate-400 animate-pulse">AI is generating your micro-level study plan...</p>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 text-white font-semibold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 relative overflow-hidden group"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <span className="relative z-10 flex items-center justify-center gap-2">
            Generate Study Plan <span className="text-lg leading-none">✨</span>
          </span>
        </motion.button>
      )}
    </GlassCard>
  );
}
