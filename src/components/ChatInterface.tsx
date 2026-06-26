import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Trash2, RefreshCw } from "lucide-react";
import { Message, DatasetOverview } from "../types";

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  isLoading: boolean;
  datasetOverview: DatasetOverview | null;
}

// Simple parser to render basic markdown elements in AI response blocks
function MarkdownSnippet({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-xs md:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // Unordered list
        if (line.trim().startsWith("- ")) {
          const content = line.trim().substring(2);
          return (
            <div key={idx} className="flex items-start space-x-2 pl-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>{renderInlineFormatting(content)}</span>
            </div>
          );
        }
        // Ordered list
        if (/^\d+\.\s/.test(line.trim())) {
          const match = line.trim().match(/^(\d+)\.\s(.*)/);
          if (match) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2 font-sans">
                <span className="text-emerald-400 font-semibold">{match[1]}.</span>
                <span>{renderInlineFormatting(match[2])}</span>
              </div>
            );
          }
        }
        // Bold headers or subtitles
        if (line.trim().startsWith("### ")) {
          return (
            <h4 key={idx} className="text-xs font-bold uppercase tracking-wider text-zinc-100 mt-3 mb-1 font-mono">
              {renderInlineFormatting(line.trim().substring(4))}
            </h4>
          );
        }
        if (line.trim().startsWith("## ")) {
          return (
            <h3 key={idx} className="text-sm font-bold text-zinc-100 mt-4 mb-2 font-mono">
              {renderInlineFormatting(line.trim().substring(3))}
            </h3>
          );
        }
        // Plain block with styling
        if (line.trim() === "") {
          return <div key={idx} className="h-1" />;
        }

        return <p key={idx}>{renderInlineFormatting(line)}</p>;
      })}
    </div>
  );
}

// Handles parsing bold text (**text**) and code elements (`code`)
function renderInlineFormatting(content: string) {
  const parts: React.ReactNode[] = [];
  let currentKey = 0;
  
  // Custom regex to step through bold and inline code marks sequentially
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const splitWords = content.split(regex);

  splitWords.forEach((word) => {
    if (word.startsWith("**") && word.endsWith("**")) {
      parts.push(
        <strong key={currentKey++} className="font-semibold text-zinc-100">
          {word.slice(2, -2)}
        </strong>
      );
    } else if (word.startsWith("`") && word.endsWith("`")) {
      parts.push(
        <code key={currentKey++} className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-fuchsia-400">
          {word.slice(1, -1)}
        </code>
      );
    } else {
      parts.push(<span key={currentKey++}>{word}</span>);
    }
  });

  return parts;
}

export default function ChatInterface({
  messages,
  onSendMessage,
  onClearHistory,
  isLoading,
  datasetOverview,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatically scroll down on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText("");
  };

  const chips = [
    { label: "Summarize trends", text: "Please summarize the most prominent trends or correlations in this dataset, and tell me if there is a connection between variables." },
    { label: "Find outliers", text: "Are there any outliers, extreme values or data anomalies in this dataset? Can you identify where they occurred?" },
    { label: "Suggest analysis", text: "What additional mathematical charts, ratios or regression models could help extract more insights from this data?" },
  ];

  return (
    <div className="bg-zinc-950/45 rounded-2xl border border-zinc-900 flex flex-col h-[520px] backdrop-blur-sm relative overflow-hidden" id="chat-interface-card">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header bar */}
      <div className="p-4 border-b border-zinc-900/80 bg-zinc-900/10 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-850 text-emerald-400 shadow-inner">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-100 uppercase tracking-wide font-mono">
              Co-Pilot Assistant
            </h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-mono">Gemini-3.5 Connected</span>
            </div>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={onClearHistory}
            className="p-1 px-2.5 rounded-lg border border-zinc-850 text-zinc-500 hover:text-red-400 hover:border-red-950/40 text-[10px] font-mono flex items-center space-x-1.5 transition cursor-pointer"
            title="Clean chat logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Zone */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-2.5 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse space-x-reverse" : "mr-auto"
            }`}
          >
            {/* Avatar block */}
            <div
              className={`p-1.5 rounded-lg shrink-0 border ${
                msg.role === "user"
                  ? "bg-zinc-100 border-white text-black"
                  : "bg-zinc-900 border-zinc-850 text-emerald-400"
              }`}
            >
              {msg.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
            </div>

            {/* Bubble contents */}
            <div
              className={`p-3 rounded-2xl text-zinc-300 transition-colors ${
                msg.role === "user"
                  ? "bg-zinc-900/80 border border-zinc-800 rounded-tr-none text-zinc-200"
                  : "bg-zinc-950/20 border border-zinc-900 rounded-tl-none"
              }`}
            >
              <MarkdownSnippet text={msg.content} />
              <div className={`mt-1.5 text-right text-[8px] font-mono block pb-0 ${msg.role === "user" ? "text-zinc-500" : "text-zinc-500"}`}>
                {msg.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center space-x-2 mr-auto max-w-[85%]">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-850 text-emerald-400 shrink-0">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="p-3 bg-zinc-950/20 border border-zinc-900 rounded-xl rounded-tl-none flex items-center space-x-2">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-400" />
              <span className="text-[10px] text-zinc-550 font-mono">Compiling stats...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && datasetOverview && !isLoading && (
        <div className="px-4 py-2 bg-zinc-950/10 border-t border-zinc-900 shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">Common dataset queries</span>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => onSendMessage(chip.text)}
                className="text-[10px] font-mono bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-850 hover:border-zinc-700 rounded-md px-2 py-1 transition-colors hover:text-white text-left cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Message input bar */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-900 shrink-0 bg-zinc-950/40 flex space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={datasetOverview ? "Ask a question about your dataset variables..." : "Upload a CSV dataset to initiate Co-pilot chat..."}
          disabled={!datasetOverview || isLoading}
          className="flex-1 text-xs md:text-sm bg-zinc-950 border border-zinc-850 focus:outline-none focus:ring-1 focus:ring-zinc-700 rounded-lg py-2 px-3 text-zinc-200 placeholder-zinc-650 disabled:opacity-40"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading || !datasetOverview}
          className="p-2.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black font-medium transition-colors disabled:opacity-30 flex items-center justify-center shrink-0 cursor-pointer border border-white"
        >
          <Send className="h-3.5 w-3.5 text-black" />
        </button>
      </form>
    </div>
  );
}
