"use client";
import { useState } from "react";
import ResumeUpload from "@/components/ResumeUpload";
import ChatAssistant from "@/components/ChatAssistant";
import { setStoredResumeProfileId } from "@/lib/resumeProfile";

export default function ResumePage() {
  // Set once a resume has been analyzed, so the chat assistant can use
  // it as context (same profile_id the backend just created).
  const [resumeProfileId, setResumeProfileId] = useState(null);

  function handleAnalyzed(data) {
    const id = data?.profile_id || null;
    setResumeProfileId(id);
    // Also persist it -- so the chat assistant on other pages (e.g. a
    // job detail page) can reuse this same resume as context without
    // the user re-uploading or re-describing themselves there.
    setStoredResumeProfileId(id);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <p className="font-mono text-xs tracking-[0.2em] text-violet mb-3 uppercase">
        Resume → Signal
      </p>
      <h1 className="font-display text-3xl sm:text-4xl font-bold mb-2">
        Tune the board to you.
      </h1>
      <p className="text-slate mb-8 max-w-lg">
        Upload your resume and we'll rank every open role by how closely it
        matches your skills — no more scrolling through everything.
      </p>
      <ResumeUpload onAnalyzed={handleAnalyzed} />

      <ChatAssistant resumeProfileId={resumeProfileId} />
    </div>
  );
}