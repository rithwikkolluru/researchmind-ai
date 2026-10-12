"use client";

import { useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  accentColor: string;
  isStreaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  accentColor,
  isStreaming = false,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const formattedContent = useMemo(() => content.trim() || " ", [content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch (error) {
      console.warn("Copy failed", error);
    }
  };

  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "group max-w-[86%] rounded-2xl border px-4 py-3 shadow-sm",
          role === "user"
            ? "border-transparent bg-gradient-to-br from-indigo-600 to-indigo-500 text-white"
            : "border-white/10 bg-[#171b22] text-slate-100",
        ].join(" ")}
      >
        <div className="mb-2 flex items-center justify-end gap-2">
          {role === "assistant" && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-white/10"
              aria-label="Copy message"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        <div className="markdown-renderer text-sm leading-7 text-inherit">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ inline, className, children, ...props }) {
                const value = String(children).replace(/\n$/, "");
                return inline ? (
                  <code className="rounded-md bg-black/20 px-1.5 py-0.5 text-[0.9em]" {...props}>
                    {value}
                  </code>
                ) : (
                  <pre className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-3">
                    <code className={className} {...props}>
                      {value}
                    </code>
                  </pre>
                );
              },
              p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
              ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
              ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
              li: ({ children }) => <li className="leading-6">{children}</li>,
              blockquote: ({ children }) => (
                <blockquote className="mb-3 border-l-2 border-indigo-400/70 pl-3 text-slate-300">
                  {children}
                </blockquote>
              ),
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noreferrer" className="text-indigo-300 underline underline-offset-2">
                  {children}
                </a>
              ),
            }}
          >
            {formattedContent}
          </ReactMarkdown>
        </div>

        {isStreaming && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: accentColor }} />
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-400">Streaming</span>
          </div>
        )}
      </div>
    </div>
  );
}
