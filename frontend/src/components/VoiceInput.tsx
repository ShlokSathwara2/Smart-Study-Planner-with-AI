'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';

interface VoiceInputProps {
  userId: string;
  syllabusId: string;
  onSessionLogged?: (result: any) => void;
}

export function VoiceInput({ userId, syllabusId, onSessionLogged }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await uploadAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', blob, 'recording.webm');
      formData.append('userId', userId);
      formData.append('syllabusId', syllabusId);

      const res = await fetch('/api/voice-input/log-session', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.ok) {
        setResult(data);
        onSessionLogged?.(data);
        
        // Show success notification
        if (data.sessionLogged) {
          alert(`✅ Session logged: ${data.intent.topic} for ${data.intent.durationMinutes} minutes`);
        } else {
          alert(`📝 Transcribed: "${data.transcription}"`);
        }
      } else {
        alert(`❌ Error: ${data.error || 'Failed to process voice input'}`);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload audio. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="space-y-4">
      {/* Microphone Button */}
      <motion.button
        onClick={toggleRecording}
        disabled={processing}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
          recording
            ? 'bg-red-500 animate-pulse shadow-red-500/50'
            : processing
            ? 'bg-slate-600 cursor-not-allowed'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-indigo-500/30'
        }`}
      >
        {recording ? (
          // Stop icon
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <rect x="5" y="5" width="10" height="10" rx="1" />
          </svg>
        ) : processing ? (
          // Loading spinner
          <svg className="animate-spin w-8 h-8 text-white" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          // Microphone icon
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
        )}
      </motion.button>

      {/* Status Text */}
      <div className="text-center">
        {recording ? (
          <p className="text-sm text-red-400 font-medium">
            🔴 Recording... Click to stop
          </p>
        ) : processing ? (
          <p className="text-sm text-indigo-400 font-medium">
            ⚙️ Processing your voice...
          </p>
        ) : (
          <p className="text-sm text-slate-400">
            🎤 Tap to speak
          </p>
        )}
      </div>

      {/* Result Display */}
      {result && (
        <GlassCard className="p-4 bg-emerald-500/10 border border-emerald-500/20">
          <h4 className="text-sm font-semibold text-emerald-300 mb-2">
            {result.sessionLogged ? '✅ Session Logged' : '📝 Transcription'}
          </h4>
          
          {result.sessionLogged && (
            <div className="space-y-2 text-sm">
              <p className="text-slate-200">
                <strong>Topic:</strong> {result.intent.topic}
              </p>
              <p className="text-slate-200">
                <strong>Duration:</strong> {result.intent.durationMinutes} minutes
              </p>
              {result.intent.notes && (
                <p className="text-slate-200">
                  <strong>Notes:</strong> {result.intent.notes}
                </p>
              )}
              <p className="text-slate-400 text-xs mt-2">
                Confidence: {result.intent.confidence}%
              </p>
            </div>
          )}
          
          {!result.sessionLogged && result.transcription && (
            <p className="text-sm text-slate-200 italic">
              "{result.transcription}"
            </p>
          )}
        </GlassCard>
      )}

      {/* Instructions */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>💡 <strong>How to use:</strong></p>
        <p>• Click the microphone to start recording</p>
        <p>• Say what you studied (e.g., "I studied calculus for 45 minutes")</p>
        <p>• Click again to stop and auto-log your session</p>
      </div>
    </div>
  );
}
