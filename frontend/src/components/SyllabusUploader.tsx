"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface ChapterInput { id: string; title: string; pages: string; }

export interface SyllabusUploadData {
  type: "file" | "manual";
  file?: File;
  chapters?: { title: string; pages: number }[];
  referenceBook?: File;
}

interface SyllabusUploaderProps {
  onSyllabusSubmit: (data: SyllabusUploadData) => Promise<boolean>;
  accept?: string[];
  maxSize?: number;
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
  const [syllabusFile, setSyllabusFile] = useState<File | null>(null);
  const [chapters, setChapters] = useState<ChapterInput[]>([{ id: "1", title: "", pages: "" }]);
  const [referenceBook, setReferenceBook] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);

  const syllabusInputRef = useRef<HTMLInputElement>(null);
  const bookInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!accept.some((e) => ext === e.toLowerCase())) {
      setError(`Invalid file type. Accepted: ${accept.join(", ")}`);
      return false;
    }
    if (file.size / 1024 / 1024 > maxSize) {
      setError(`File too large. Maximum: ${maxSize}MB`);
      return false;
    }
    return true;
  };

  const validatePdfOnly = (file: File): boolean => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Reference book must be a PDF file.");
      return false;
    }
    if (file.size / 1024 / 1024 > 50) { setError("Book file too large (max 50MB)"); return false; }
    return true;
  };

  const handleSyllabusFile = useCallback((file: File) => { setError(null); if (validateFile(file)) setSyllabusFile(file); }, []);
  const handleSyllabusDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingSyllabus(false);
    if (e.dataTransfer.files?.[0]) handleSyllabusFile(e.dataTransfer.files[0]);
  }, [handleSyllabusFile]);

  const handleBookFile = useCallback((file: File) => { setError(null); if (validatePdfOnly(file)) setReferenceBook(file); }, []);
  const handleBookDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setIsDraggingBook(false);
    if (e.dataTransfer.files?.[0]) handleBookFile(e.dataTransfer.files[0]);
  }, [handleBookFile]);

  const addChapter = () => setChapters([...chapters, { id: Math.random().toString(), title: "", pages: "" }]);
  const updateChapter = (id: string, field: "title" | "pages", value: string) =>
    setChapters(chapters.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  const removeChapter = (id: string) => { if (chapters.length > 1) setChapters(chapters.filter((c) => c.id !== id)); };

  const handleSubmit = async () => {
    setError(null);
    let data: SyllabusUploadData;
    if (mode === "file") {
      if (!syllabusFile) { setError("Please upload a syllabus file."); return; }
      data = { type: "file", file: syllabusFile, referenceBook: referenceBook || undefined };
    } else {
      const valid = chapters.filter((c) => c.title.trim() !== "" && parseInt(c.pages) > 0);
      if (valid.length === 0) { setError("Please enter at least one chapter with page count."); return; }
      data = { type: "manual", chapters: valid.map((c) => ({ title: c.title, pages: parseInt(c.pages) })), referenceBook: referenceBook || undefined };
    }
    setUploading(true);
    setProgress(0);
    // Simulate progress
    const iv = setInterval(() => setProgress((p) => Math.min(p + 8, 90)), 200);
    try {
      await onSyllabusSubmit(data);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      clearInterval(iv);
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      {/* Header card */}
      <GlassCard glow glowColor="indigo" className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))", border: "1px solid rgba(99,102,241,0.3)" }}>
            🧠
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-50">Configure Your Syllabus</h2>
            <p className="text-sm text-slate-400 mt-0.5">AI will analyze it and build a micro-level study plan</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mt-5 flex p-1 rounded-xl w-fit"
          style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {(["manual", "file"] as const).map((m) => (
            <motion.button key={m} onClick={() => setMode(m)} whileTap={{ scale: 0.96 }}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                mode === m ? "text-indigo-200" : "text-slate-500 hover:text-slate-300"}`}
              style={mode === m ? {
                background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))",
                border: "1px solid rgba(99,102,241,0.25)",
                boxShadow: "0 2px 12px rgba(99,102,241,0.2)"
              } : {}}
            >
              {m === "manual" ? "✍️ Type Manually" : "📎 Upload File"}
            </motion.button>
          ))}
        </div>
      </GlassCard>

      {/* Dynamic content */}
      <AnimatePresence mode="wait">
        {mode === "manual" ? (
          <motion.div key="manual" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <span className="h-5 w-5 rounded bg-indigo-500/20 flex items-center justify-center text-xs">📋</span>
                  Chapters & Page Counts
                </h3>
                <span className="text-[10px] text-indigo-400/60 uppercase tracking-widest">Required for micro-planning</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {chapters.map((c, idx) => (
                    <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex gap-3 items-center">
                      <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold text-indigo-400/70 shrink-0"
                        style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)" }}>
                        {idx + 1}
                      </div>
                      <input
                        type="text" value={c.title}
                        onChange={(e) => updateChapter(c.id, "title", e.target.value)}
                        placeholder={`Chapter ${idx + 1}: e.g. Thermodynamics`}
                        className="flex-1 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus-glow transition-all"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      <input
                        type="number" min="1" value={c.pages}
                        onChange={(e) => updateChapter(c.id, "pages", e.target.value)}
                        placeholder="Pages"
                        className="w-20 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus-glow transition-all text-center"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                      />
                      {chapters.length > 1 && (
                        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => removeChapter(c.id)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                          ✕
                        </motion.button>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <motion.button whileHover={{ x: 4 }} onClick={addChapter}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 transition-colors">
                <span className="h-5 w-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-base leading-none">+</span>
                Add another chapter
              </motion.button>
            </GlassCard>
          </motion.div>
        ) : (
          <motion.div key="file" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <GlassCard className="p-6">
              {!syllabusFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingSyllabus(true); }}
                  onDragLeave={() => setIsDraggingSyllabus(false)}
                  onDrop={handleSyllabusDrop}
                  onClick={() => syllabusInputRef.current?.click()}
                  className="rounded-xl p-10 text-center cursor-pointer transition-all duration-200 relative overflow-hidden"
                  style={{
                    border: `2px dashed ${isDraggingSyllabus ? "rgba(99,102,241,0.6)" : "rgba(255,255,255,0.10)"}`,
                    background: isDraggingSyllabus ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <input ref={syllabusInputRef} type="file" accept={accept.join(",")}
                    onChange={(e) => { if (e.target.files) handleSyllabusFile(e.target.files[0]); }} className="hidden" />
                  <motion.div animate={{ y: isDraggingSyllabus ? -4 : 0 }} className="text-5xl mb-3">📄</motion.div>
                  <p className="text-sm font-semibold text-slate-200 mb-1">Drop your syllabus here</p>
                  <p className="text-xs text-slate-500">or click to browse · {accept.join(", ")} up to {maxSize}MB</p>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl p-4 flex items-center justify-between"
                  style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="text-sm font-medium text-slate-200">{syllabusFile.name}</p>
                      <p className="text-xs text-emerald-400/80">{(syllabusFile.size / 1024 / 1024).toFixed(2)} MB · Ready</p>
                    </div>
                  </div>
                  <button onClick={() => setSyllabusFile(null)} className="text-slate-500 hover:text-rose-400 p-2 transition">✕</button>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reference Book */}
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <span className="text-base">📚</span> Reference Book
            <span className="text-[10px] text-slate-600 bg-white/5 rounded-full px-2 py-0.5 border border-white/[0.06]">Optional</span>
          </h3>
          <p className="text-[10px] text-slate-600 uppercase tracking-wider">For AI Content Extraction</p>
        </div>
        {!referenceBook ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingBook(true); }}
            onDragLeave={() => setIsDraggingBook(false)}
            onDrop={handleBookDrop}
            onClick={() => bookInputRef.current?.click()}
            className="rounded-xl p-5 cursor-pointer transition-all duration-200"
            style={{
              border: `2px dashed ${isDraggingBook ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.08)"}`,
              background: isDraggingBook ? "rgba(139,92,246,0.07)" : "transparent",
            }}
          >
            <input ref={bookInputRef} type="file" accept=".pdf"
              onChange={(e) => { if (e.target.files) handleBookFile(e.target.files[0]); }} className="hidden" />
            <div className="flex items-center gap-4">
              <div className="text-3xl opacity-70">📗</div>
              <div>
                <p className="text-sm font-medium text-slate-300">Have the PDF of your textbook?</p>
                <p className="text-xs text-slate-500 mt-0.5">Upload it — or AI will fetch info from the internet</p>
              </div>
            </div>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl p-4 flex items-center justify-between"
            style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.25)" }}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📗</span>
              <div>
                <p className="text-sm font-medium text-slate-200 truncate max-w-xs">{referenceBook.name}</p>
                <p className="text-xs text-violet-400/80">Will be used for content & questions</p>
              </div>
            </div>
            <button onClick={() => setReferenceBook(null)} className="text-slate-500 hover:text-rose-400 p-2 transition">✕</button>
          </motion.div>
        )}
      </GlassCard>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl p-4 flex gap-3 items-start"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <span className="text-base">⚠️</span>
            <p className="text-sm text-red-300">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submit */}
      {uploading ? (
        <GlassCard className="p-6">
          <div className="text-center space-y-3">
            <div className="text-2xl animate-spin-slow">⚙️</div>
            <p className="text-sm font-medium text-slate-300 animate-pulse">AI is building your micro-level study plan...</p>
            <div className="relative h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
              <motion.div className="h-full rounded-full"
                initial={{ width: "0%" }} animate={{ width: `${progress}%` }}
                style={{ background: "linear-gradient(90deg, #6366f1, #a78bfa, #34d399)" }}
                transition={{ duration: 0.3 }} />
            </div>
            <p className="text-xs text-slate-500">{progress}% complete</p>
          </div>
        </GlassCard>
      ) : (
        <motion.button
          whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          className="w-full relative overflow-hidden rounded-2xl py-4 px-6 font-bold text-white text-base glass-shine"
          style={{
            background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #6366f1 100%)",
            backgroundSize: "200% 100%",
            boxShadow: "0 4px 24px rgba(99,102,241,0.4), 0 0 0 1px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2.5">
            <span>✨</span> Generate Study Plan <span className="text-indigo-200 font-normal text-sm">→</span>
          </span>
        </motion.button>
      )}
    </div>
  );
}
