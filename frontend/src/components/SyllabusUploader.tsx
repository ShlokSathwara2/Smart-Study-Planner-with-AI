"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  accept?: string[];
  maxSize?: number; // in MB
}

export function SyllabusUploader({ onFileUpload, accept = [".pdf", ".docx", ".png", ".jpg", ".jpeg"], maxSize = 10 }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    const isValidType = accept.some(ext => extension === ext.toLowerCase());
    
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

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (validateFile(file)) {
      setSelectedFile(file);
      onFileUpload(file);
    }
  }, [onFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFile(file);
    }
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append("syllabus", selectedFile);
      
      const response = await fetch("/api/syllabus/upload", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      const data = await response.json();
      console.log("Upload successful:", data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <GlassCard className="w-full max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-2">Upload Your Syllabus</h2>
        <p className="text-sm text-slate-400">
          AI will analyze your syllabus and create a personalized study plan
        </p>
      </div>

      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
          transition-all duration-300 ease-in-out
          ${isDragging 
            ? "border-indigo-400 bg-indigo-500/10 scale-[1.02]" 
            : "border-white/10 hover:border-indigo-400/50 hover:bg-white/[0.02]"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept.join(",")}
          onChange={handleFileInput}
          className="hidden"
        />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg font-medium text-slate-200 mb-2">
            {isDragging ? "Drop your file here" : "Drag & drop your syllabus"}
          </p>
          <p className="text-sm text-slate-400 mb-4">
            or click to browse
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs text-slate-500">
            {accept.map(ext => (
              <span key={ext} className="px-2 py-1 bg-white/5 rounded-md">
                {ext.toUpperCase()}
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-3">
            Maximum file size: {maxSize}MB
          </p>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-6 overflow-hidden"
          >
            <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">✅</div>
                  <div>
                    <p className="text-sm font-medium text-slate-200">{selectedFile.name}</p>
                    <p className="text-xs text-slate-400">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              {!uploading && (
                <motion.button
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleUpload}
                  className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-indigo-400 text-white font-medium py-2.5 px-4 rounded-lg hover:shadow-lg hover:shadow-indigo-500/25 transition-all duration-300"
                >
                  Analyze with AI
                </motion.button>
              )}
              
              {uploading && (
                <div className="mt-4">
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-400 to-emerald-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </div>
                  <p className="text-center text-xs text-slate-400 mt-2">
                    AI is analyzing your syllabus...
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <div className="text-xl">⚠️</div>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </motion.div>
      )}
    </GlassCard>
  );
}
