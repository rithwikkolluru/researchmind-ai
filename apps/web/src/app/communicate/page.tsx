"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, Mail, Send, Copy, RefreshCw, Loader2, Check,
  User, Target, MessageSquare, Palette, ChevronRight, Sparkles
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type Recipient = { value: string; label: string; emoji: string };
type Purpose   = { value: string; label: string };
type Tone      = { value: string; label: string; color: string };

// ── Data ─────────────────────────────────────────────────────────────────────
const RECIPIENTS: Recipient[] = [
  { value: "professor",          label: "Professor",         emoji: "👨‍🏫" },
  { value: "research_professor", label: "Research Professor", emoji: "🔬" },
  { value: "researcher",         label: "Researcher",        emoji: "🧪" },
  { value: "hr_recruiter",       label: "HR / Recruiter",    emoji: "💼" },
  { value: "manager",            label: "Manager",           emoji: "👔" },
  { value: "college_faculty",    label: "College Faculty",   emoji: "🏛️" },
  { value: "office_admin",       label: "Office / Admin",    emoji: "📋" },
  { value: "project_guide",      label: "Project Guide",     emoji: "🗺️" },
  { value: "teammate",           label: "Teammate",          emoji: "🤝" },
  { value: "friend",             label: "Friend",            emoji: "😊" },
  { value: "senior_alumni",      label: "Senior / Alumni",   emoji: "🎓" },
  { value: "client",             label: "Client",            emoji: "🏢" },
];

const PURPOSES: Purpose[] = [
  { value: "research_collaboration", label: "Research Collaboration" },
  { value: "project_guidance",       label: "Ask for Project Guidance" },
  { value: "request_meeting",        label: "Request a Meeting" },
  { value: "recommendation",         label: "Ask for Recommendation" },
  { value: "internship_inquiry",     label: "Internship Inquiry" },
  { value: "research_internship",    label: "Research Internship" },
  { value: "paper_discussion",       label: "Paper Discussion" },
  { value: "deadline_extension",     label: "Deadline Extension" },
  { value: "leave_request",          label: "Leave Request" },
  { value: "follow_up",              label: "Follow-up" },
  { value: "thank_you",              label: "Thank You" },
  { value: "introduction",           label: "Introduction / Networking" },
  { value: "job_inquiry",            label: "Job Inquiry" },
  { value: "custom",                 label: "Custom Purpose" },
];

const TONES: Tone[] = [
  { value: "professional", label: "Professional", color: "bg-blue-600" },
  { value: "warm",          label: "Warm",         color: "bg-orange-500" },
  { value: "confident",     label: "Confident",    color: "bg-purple-600" },
  { value: "humble",        label: "Humble",       color: "bg-green-600" },
  { value: "academic",      label: "Academic",     color: "bg-indigo-600" },
  { value: "concise",       label: "Concise",      color: "bg-gray-600" },
  { value: "friendly",      label: "Friendly",     color: "bg-yellow-600" },
  { value: "formal",        label: "Formal",       color: "bg-slate-600" },
];

const EXP_LEVELS = [
  "First-year Student", "B.Tech Student", "M.Tech Student",
  "Research Student", "Graduate Student", "Professional",
];

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CommunicatePage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [purpose, setPurpose]     = useState<Purpose | null>(null);
  const [context, setContext]     = useState("");
  const [tone, setTone]           = useState<Tone>(TONES[0]);
  const [expLevel, setExpLevel]   = useState(EXP_LEVELS[1]);
  const [desiredOutcome, setDesiredOutcome] = useState("Reply to me");

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState("");
  const [generatedEmail, setGeneratedEmail]   = useState("");
  const [emailReason, setEmailReason]         = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError]   = useState("");

  const canGenerate = recipient && purpose && context.trim().length > 20;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError("");
    setGeneratedEmail("");
    setGeneratedSubject("");
    setEmailReason("");

    try {
      const res = await fetch("http://localhost:8000/api/communicate/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: recipient!.value,
          recipient_label: recipient!.label,
          purpose: purpose!.value,
          purpose_label: purpose!.label,
          context: context.trim(),
          tone: tone.value,
          experience_level: expLevel,
          desired_outcome: desiredOutcome,
        }),
      });

      if (!res.ok) throw new Error("Server error. Please try again.");

      const data = await res.json();
      setGeneratedSubject(data.subject);
      setGeneratedEmail(data.email);
      setEmailReason(data.reason);
      setStep(2);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${generatedSubject}\n\n${generatedEmail}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #0a0f1a 0%, #0d0620 50%, #0a1628 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(80px)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(80px)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/8">
        <Link href="/chat" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
          <ArrowLeft size={16} /> Back to Mentor
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #6366f1)" }}>
            <Mail size={16} />
          </div>
          <div>
            <h1 className="text-base font-bold">AI Communication Mentor</h1>
            <p className="text-[10px] text-white/40">ResearchMind · Smart Email Generator</p>
          </div>
        </div>
        <div className="w-32" />
      </header>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">

        {/* Step 1: Input Form */}
        {step === 1 && (
          <div className="space-y-8">
            {/* Who are you writing to */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <User size={16} className="text-blue-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Who are you writing to?</h2>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {RECIPIENTS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setRecipient(r)}
                    className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      recipient?.value === r.value
                        ? "border-blue-500/60 bg-blue-900/30 text-white"
                        : "border-white/8 bg-white/4 text-white/50 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div className="text-lg mb-1">{r.emoji}</div>
                    <div className="text-xs font-semibold">{r.label}</div>
                  </button>
                ))}
              </div>
            </section>

            {/* What is the purpose */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Target size={16} className="text-purple-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">What is the purpose?</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setPurpose(p)}
                    className={`px-4 py-2 rounded-full text-sm border transition-all ${
                      purpose?.value === p.value
                        ? "border-purple-500/60 bg-purple-900/30 text-white font-semibold"
                        : "border-white/10 text-white/50 hover:text-white hover:border-white/25 bg-white/4"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Context */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-emerald-400" />
                <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Tell me what happened</h2>
                <span className="text-white/30 text-xs font-normal">— I'll turn it into a professional email</span>
              </div>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder={`Example: "I met Professor Dr. Sharma yesterday and discussed my research project on computer vision. She told me to send the initial idea. I want to send it today and ask if we can discuss it next week."`}
                rows={5}
                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/12 text-white text-sm placeholder-white/25 resize-none outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
              />
              <p className="text-xs text-white/25 mt-1 text-right">{context.length} chars</p>
            </section>

            {/* Tone + Options row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Palette size={16} className="text-orange-400" />
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Writing Tone</h2>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TONES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        tone.value === t.value
                          ? `${t.color} border-transparent text-white`
                          : "border-white/10 text-white/50 hover:text-white bg-white/4"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles size={16} className="text-yellow-400" />
                  <h2 className="text-sm font-bold text-white/80 uppercase tracking-widest">Your Experience Level</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXP_LEVELS.map(e => (
                    <button
                      key={e}
                      onClick={() => setExpLevel(e)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        expLevel === e
                          ? "border-yellow-500/60 bg-yellow-900/30 text-yellow-200"
                          : "border-white/10 text-white/50 hover:text-white bg-white/4"
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Desired outcome */}
            <section>
              <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-widest">What do you want the recipient to do?</p>
              <div className="flex flex-wrap gap-2">
                {["Reply to me","Schedule a meeting","Approve my request","Consider my application","Give feedback","Provide guidance","Accept my proposal"].map(o => (
                  <button
                    key={o}
                    onClick={() => setDesiredOutcome(o)}
                    className={`px-4 py-2 rounded-full text-xs border transition-all ${
                      desiredOutcome === o
                        ? "border-indigo-500/60 bg-indigo-900/30 text-indigo-200 font-semibold"
                        : "border-white/10 text-white/50 hover:text-white bg-white/4"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </section>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">{error}</div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: canGenerate && !isGenerating ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "rgba(255,255,255,0.06)",
                boxShadow: canGenerate && !isGenerating ? "0 0 30px rgba(99,102,241,0.35)" : "none",
              }}
            >
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> Crafting your email...</>
              ) : (
                <><Mail size={18} /> Generate Professional Email <ChevronRight size={16} /></>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Generated Email */}
        {step === 2 && generatedEmail && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                <ArrowLeft size={14} /> Edit inputs
              </button>
              <span className="text-xs text-white/30">
                {recipient?.emoji} {recipient?.label} · {purpose?.label} · {tone.label} tone
              </span>
            </div>

            {/* Email card */}
            <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
              {/* Subject */}
              <div className="px-6 py-4 border-b border-white/8 bg-white/3">
                <p className="text-xs text-white/30 uppercase tracking-widest mb-1">Subject</p>
                <p className="text-white font-semibold">{generatedSubject}</p>
              </div>
              {/* Body */}
              <div className="px-6 py-5">
                <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{generatedEmail}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg,#3b82f6,#6366f1)", boxShadow: "0 4px 20px rgba(99,102,241,0.3)" }}
              >
                {copied ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Email</>}
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-white/25 text-white/60 hover:text-white transition-all"
              >
                <RefreshCw size={14} /> Regenerate
              </button>
              <button
                onClick={() => { setStep(1); setGeneratedEmail(""); setGeneratedSubject(""); }}
                className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-white/10 hover:border-white/25 text-white/60 hover:text-white transition-all"
              >
                Write New Email
              </button>
            </div>

            {/* Why this works */}
            {emailReason && (
              <div className="rounded-2xl border border-white/8 p-5" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3">💡 Why this email works</p>
                <p className="text-sm text-white/60 leading-relaxed">{emailReason}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
