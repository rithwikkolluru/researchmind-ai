"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Wand2, Download, RefreshCw, Sparkles, Image as ImageIcon, Laugh, Rocket, BookOpen, Sword, Star, Zap } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tab = "meme" | "imagine";

interface Category {
  id: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  gradient: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES: Category[] = [
  {
    id: "study_life",
    icon: <BookOpen size={22} />,
    label: "Study Life",
    hint: "Me crying at 3am before the final exam surrounded by empty coffee cups",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    id: "scifi_research",
    icon: <Rocket size={22} />,
    label: "Sci-Fi Research",
    hint: "My thesis defence presentation on Mars in a futuristic lab",
    gradient: "from-violet-500 to-purple-400",
  },
  {
    id: "college_meme",
    icon: <Laugh size={22} />,
    label: "College Meme",
    hint: "Professor explaining something while students are sleeping in class",
    gradient: "from-yellow-500 to-orange-400",
  },
  {
    id: "dream_project",
    icon: <Star size={22} />,
    label: "Dream Project",
    hint: "My research paper turning into a real rocket launching into space",
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    id: "fantasy",
    icon: <Sword size={22} />,
    label: "Fantasy",
    hint: "A student warrior fighting a giant dragon labelled Deadline",
    gradient: "from-rose-500 to-pink-400",
  },
  {
    id: "general",
    icon: <Zap size={22} />,
    label: "Anything!",
    hint: "Describe anything you can imagine...",
    gradient: "from-slate-500 to-gray-400",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ImageDropZone({
  label,
  file,
  preview,
  onFile,
}: {
  label: string;
  file: File | null;
  preview: string | null;
  onFile: (f: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f && f.type.startsWith("image/")) onFile(f);
    },
    [onFile]
  );

  return (
    <div
      className="relative group cursor-pointer"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
      <div
        className={`
          w-full h-48 rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden
          flex flex-col items-center justify-center gap-3
          ${preview ? "border-transparent" : "border-white/20 hover:border-purple-400/60 bg-white/5 hover:bg-white/10"}
        `}
      >
        {preview ? (
          <>
            <img src={preview} alt="preview" className="w-full h-full object-cover rounded-2xl" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center">
              <span className="text-white text-sm font-medium flex items-center gap-2">
                <Upload size={16} /> Change Image
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <ImageIcon size={24} className="text-white/50" />
            </div>
            <div className="text-center">
              <p className="text-white/70 text-sm font-medium">{label}</p>
              <p className="text-white/30 text-xs mt-1">Click or drag & drop</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function FunZonePage() {
  const [activeTab, setActiveTab] = useState<Tab>("meme");

  // Meme Mixer state
  const [memeFile, setMemeFile] = useState<File | null>(null);
  const [memePreview, setMemePreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [mixResult, setMixResult] = useState<string | null>(null);
  const [mixLoading, setMixLoading] = useState(false);
  const [mixError, setMixError] = useState<string | null>(null);

  // Imagine It state
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [prompt, setPrompt] = useState(CATEGORIES[0].hint);
  const [imagineResult, setImagineResult] = useState<string | null>(null);
  const [imagineLoading, setImagineLoading] = useState(false);
  const [imagineError, setImagineError] = useState<string | null>(null);

  // ── Handlers ──
  const handleMemeFile = (f: File) => {
    setMemeFile(f);
    setMemePreview(URL.createObjectURL(f));
    setMixResult(null);
  };

  const handlePhotoFile = (f: File) => {
    setPhotoFile(f);
    setPhotoPreview(URL.createObjectURL(f));
    setMixResult(null);
  };

  const handleMix = async () => {
    if (!memeFile || !photoFile) return;
    setMixLoading(true);
    setMixError(null);
    setMixResult(null);
    try {
      const form = new FormData();
      form.append("meme", memeFile);
      form.append("photo", photoFile);
      form.append("opacity", "0.80");
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/fun/meme-mix`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Mix failed");
      }
      const blob = await res.blob();
      setMixResult(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setMixError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setMixLoading(false);
    }
  };

  const handleImagine = async () => {
    if (!prompt.trim()) return;
    setImagineLoading(true);
    setImagineError(null);
    setImagineResult(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${apiBase}/api/fun/imagine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          category: selectedCategory.id,
          width: 1024,
          height: 768,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Server error" }));
        throw new Error(err.detail || "Generation failed");
      }
      const blob = await res.blob();
      setImagineResult(URL.createObjectURL(blob));
    } catch (e: unknown) {
      setImagineError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setImagineLoading(false);
    }
  };

  const downloadImage = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat);
    setPrompt(cat.hint);
    setImagineResult(null);
    setImagineError(null);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #12052e 50%, #0a1a2e 100%)" }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #a855f7 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #ec4899 0%, transparent 70%)", filter: "blur(60px)" }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(60px)" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/8">
        <Link
          href="/chat"
          className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Back to Mentor
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
            <Sparkles size={16} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">Fun Zone</h1>
            <p className="text-[10px] text-white/40 leading-tight">Student Creative Studio</p>
          </div>
        </div>

        <div className="w-24" /> {/* spacer */}
      </header>

      {/* Tab Switcher */}
      <div className="relative z-10 flex justify-center mt-8 px-4">
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
          <button
            onClick={() => setActiveTab("meme")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === "meme"
                ? "text-white shadow-lg"
                : "text-white/40 hover:text-white/70"
            }`}
            style={activeTab === "meme" ? { background: "linear-gradient(135deg, #a855f7, #ec4899)" } : {}}
          >
            <Laugh size={16} />
            Meme Mixer
          </button>
          <button
            onClick={() => setActiveTab("imagine")}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
              activeTab === "imagine"
                ? "text-white shadow-lg"
                : "text-white/40 hover:text-white/70"
            }`}
            style={activeTab === "imagine" ? { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" } : {}}
          >
            <Wand2 size={16} />
            Imagine It
          </button>
        </div>
      </div>

      {/* ── MEME MIXER TAB ── */}
      {activeTab === "meme" && (
        <main className="relative z-10 max-w-3xl mx-auto px-4 py-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">
              <span style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Meme Mixer
              </span>
            </h2>
            <p className="text-white/40 text-sm">Upload a meme + your photo → AI blends them into one epic image</p>
          </div>

          {/* Upload Zone */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-widest">Step 1 — Meme / Background</p>
              <ImageDropZone label="Upload Meme Image" file={memeFile} preview={memePreview} onFile={handleMemeFile} />
            </div>
            <div>
              <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-widest">Step 2 — Your Photo</p>
              <ImageDropZone label="Upload Your Photo" file={photoFile} preview={photoPreview} onFile={handlePhotoFile} />
            </div>
          </div>

          {/* Mix Button */}
          <button
            onClick={handleMix}
            disabled={!memeFile || !photoFile || mixLoading}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (!memeFile || !photoFile || mixLoading)
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg,#a855f7,#ec4899)",
              boxShadow: (!memeFile || !photoFile || mixLoading) ? "none" : "0 0 30px rgba(168,85,247,0.4)",
            }}
          >
            {mixLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Mixing magic...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Mix It! 🔥
              </>
            )}
          </button>

          {/* Error */}
          {mixError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {mixError}
            </div>
          )}

          {/* Result */}
          {mixResult && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-white/40 font-medium mb-3 uppercase tracking-widest text-center">Your Masterpiece 🎨</p>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={mixResult} alt="Mixed result" className="w-full object-contain max-h-[500px]" />
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => downloadImage(mixResult, "meme-mix.jpg")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#a855f7,#ec4899)", boxShadow: "0 4px 20px rgba(168,85,247,0.4)" }}
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setMixResult(null); handleMix(); }}
                className="mt-4 w-full py-3 rounded-xl text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2 border border-white/10 hover:border-white/20"
              >
                <RefreshCw size={14} />
                Generate Again
              </button>
            </div>
          )}
        </main>
      )}

      {/* ── IMAGINE IT TAB ── */}
      {activeTab === "imagine" && (
        <main className="relative z-10 max-w-3xl mx-auto px-4 py-10">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">
              <span style={{ background: "linear-gradient(90deg,#3b82f6,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Imagine It
              </span>
            </h2>
            <p className="text-white/40 text-sm">Pick a vibe, describe your idea, and watch AI paint it for you</p>
          </div>

          {/* Category Cards */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategorySelect(cat)}
                className={`p-4 rounded-2xl border text-left transition-all duration-300 hover:scale-[1.02] ${
                  selectedCategory.id === cat.id
                    ? "border-transparent scale-[1.02]"
                    : "border-white/10 hover:border-white/20 bg-white/5"
                }`}
                style={selectedCategory.id === cat.id
                  ? { background: `linear-gradient(135deg, rgba(${cat.gradient.includes("blue") ? "59,130,246" : cat.gradient.includes("violet") ? "139,92,246" : cat.gradient.includes("yellow") ? "234,179,8" : cat.gradient.includes("emerald") ? "16,185,129" : cat.gradient.includes("rose") ? "244,63,94" : "100,116,139"},0.25) 0%, rgba(0,0,0,0) 100%)`, border: "1px solid rgba(255,255,255,0.15)" }
                  : {}}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-gradient-to-br ${cat.gradient} bg-opacity-20`}
                  style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}>
                  {cat.icon}
                </div>
                <p className="text-sm font-semibold text-white/80">{cat.label}</p>
              </button>
            ))}
          </div>

          {/* Prompt Input */}
          <div className="mb-5">
            <p className="text-xs text-white/40 font-medium mb-2 uppercase tracking-widest">Describe your image</p>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder="Describe what you want to see..."
              className="w-full px-5 py-4 rounded-2xl bg-white/6 border border-white/12 text-white text-sm placeholder-white/25 resize-none outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all"
              style={{ backdropFilter: "blur(10px)" }}
            />
            <p className="text-xs text-white/25 mt-1 text-right">{prompt.length} chars</p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleImagine}
            disabled={!prompt.trim() || imagineLoading}
            className="w-full py-4 rounded-2xl font-bold text-base transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: (!prompt.trim() || imagineLoading)
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg,#3b82f6,#8b5cf6)",
              boxShadow: (!prompt.trim() || imagineLoading) ? "none" : "0 0 30px rgba(139,92,246,0.4)",
            }}
          >
            {imagineLoading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Painting your vision...
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generate! ✨
              </>
            )}
          </button>

          {/* Loading shimmer */}
          {imagineLoading && (
            <div className="mt-8 rounded-2xl overflow-hidden border border-white/10" style={{ height: "380px" }}>
              <div className="w-full h-full animate-pulse" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }} />
            </div>
          )}

          {/* Error */}
          {imagineError && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
              {imagineError}
            </div>
          )}

          {/* Result */}
          {imagineResult && !imagineLoading && (
            <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xs text-white/40 font-medium mb-3 uppercase tracking-widest text-center">Your Creation 🖼️</p>
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img src={imagineResult} alt="Generated" className="w-full object-contain max-h-[500px]" />
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => downloadImage(imagineResult, "imagine-it.jpg")}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
                    style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", boxShadow: "0 4px 20px rgba(139,92,246,0.4)" }}
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <button
                onClick={handleImagine}
                className="mt-4 w-full py-3 rounded-xl text-sm text-white/50 hover:text-white transition-colors flex items-center justify-center gap-2 border border-white/10 hover:border-white/20"
              >
                <RefreshCw size={14} />
                Generate Again (different result)
              </button>
            </div>
          )}
        </main>
      )}

      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
