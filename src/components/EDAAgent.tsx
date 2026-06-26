import { useState, useEffect } from "react";
import { DatasetOverview } from "../types";
import { 
  Sparkles, 
  AlertTriangle, 
  Wand2, 
  BrainCircuit, 
  RefreshCw, 
  Lightbulb, 
  ShieldAlert, 
  Settings2,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

interface EDAData {
  insights: string[];
  risks: string[];
  preprocessingSuggestions: string[];
}

interface EDAAgentProps {
  overview: DatasetOverview;
}

export default function EDAAgent({ overview }: EDAAgentProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [edaData, setEdaData] = useState<EDAData | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "risks" | "preprocessing">("insights");
  const [loadingMessage, setLoadingMessage] = useState<string>("Analyzing statistics...");

  // Messages to cycle through during Gemini analysis to keep user engaged
  const loadingMessages = [
    "Correlating statistical indices...",
    "Querying Gemini neural models...",
    "Auditing continuous & discrete distributions...",
    "Profiling quality risks & outliers...",
    "Synthesizing preprocessing suggestions...",
  ];

  // Fetch EDA analysis
  const runEDAAudit = async () => {
    setLoading(true);
    setError(null);
    
    // Cycle messages
    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[msgIndex]);
    }, 2500);

    try {
      const response = await fetch("/api/eda", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnStats: overview.columnStats,
          rowCount: overview.rowCount,
          colCount: overview.colCount,
          fileName: overview.fileName,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setEdaData(data);
    } catch (err: any) {
      console.error("EDA Audit error:", err);
      setError(err.message || "Failed to complete the EDA audit.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  // Automatically trigger when the dataset changes with a stagger delay to avoid simultaneous API requests
  useEffect(() => {
    if (overview) {
      const timer = setTimeout(() => {
        runEDAAudit();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [overview.fileName]);

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="eda-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header with Title and Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <BrainCircuit className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>EDA Co-Pilot Agent</span>
              <span className="text-[10px] bg-emerald-950/30 border border-emerald-900/50 text-emerald-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Generative AI
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Exploratory analysis, risk identification, and prescriptive preparation modeling.
            </p>
          </div>
        </div>

        {/* Manual trigger button */}
        <button
          onClick={runEDAAudit}
          disabled={loading}
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
            loading 
              ? "bg-zinc-900 border-zinc-850 text-zinc-500 cursor-not-allowed" 
              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Auditing..." : "Re-run Audit"}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-zinc-905 border-t-emerald-500 animate-spin"></div>
            <BrainCircuit className="h-5 w-5 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200 animate-pulse">{loadingMessage}</p>
            <p className="text-[10px] text-zinc-500 font-mono">Invoking Gemini LLM server via DataCore Routing</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-5 rounded-xl border border-red-950 bg-red-950/10 text-zinc-300 space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-200">EDA Extraction Interrupted</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {error.includes("GEMINI_API_KEY") 
                  ? "Your Gemini API key appears to be missing or invalid. Please check the 'Settings > Secrets' panel to configure process.env.GEMINI_API_KEY." 
                  : error}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={runEDAAudit}
              className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-red-800"
            >
              Retry Audit
            </button>
          </div>
        </div>
      )}

      {/* Main EDA Board */}
      {!loading && !error && edaData && (
        <div className="space-y-6 mt-4">
          {/* Tabs header */}
          <div className="flex border-b border-zinc-900 gap-2 overflow-x-auto pb-[1px]">
            <button
              onClick={() => setActiveTab("insights")}
              className={`pb-3 px-3.5 font-bold text-xs font-mono tracking-tight transition-all border-b-2 -mb-[2px] flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "insights"
                  ? "border-emerald-500 text-emerald-400 font-extrabold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Insights ({edaData.insights.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("risks")}
              className={`pb-3 px-3.5 font-bold text-xs font-mono tracking-tight transition-all border-b-2 -mb-[2px] flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "risks"
                  ? "border-amber-500 text-amber-400 font-extrabold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Risks ({edaData.risks.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("preprocessing")}
              className={`pb-3 px-3.5 font-bold text-xs font-mono tracking-tight transition-all border-b-2 -mb-[2px] flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "preprocessing"
                  ? "border-indigo-500 text-indigo-400 font-extrabold"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              <span>Preprocessing ({edaData.preprocessingSuggestions.length})</span>
            </button>
          </div>

          {/* Tab content area */}
          <div className="transition-all duration-300">
            {activeTab === "insights" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {edaData.insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-zinc-800 transition-all group flex gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/20 text-emerald-400 border border-emerald-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">Insight #{idx + 1}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-normal">{insight}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "risks" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {edaData.risks.map((risk, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-amber-950/40 bg-amber-950/10 hover:bg-amber-950/20 transition-all group flex gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-950/20 text-amber-400 border border-amber-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block">Risk Flag #{idx + 1}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-normal">{risk}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "preprocessing" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {edaData.preprocessingSuggestions.map((suggestion, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-zinc-900 bg-zinc-900/10 hover:bg-zinc-900/30 hover:border-zinc-800 transition-all group flex gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-950/20 text-indigo-400 border border-indigo-900/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Settings2 className="h-3.5 w-3.5" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-widest block">Action Suggestions #{idx + 1}</span>
                      <p className="text-xs text-zinc-300 leading-relaxed font-normal">{suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Case summary banner */}
          <div className="p-4 rounded-xl bg-zinc-900/20 border border-zinc-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs mt-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
              <div className="space-y-0.5">
                <p className="font-semibold text-zinc-300">Model Grounding Validation</p>
                <p className="text-[11px] text-zinc-500 font-mono truncate max-w-[280px] sm:max-w-sm">
                  {overview.fileName} ({overview.rowCount.toLocaleString()} rows x {overview.colCount} parameters)
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono bg-emerald-950/20 border border-emerald-900/30 px-2.5 py-1 rounded-full">
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Telemetry Verified</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
