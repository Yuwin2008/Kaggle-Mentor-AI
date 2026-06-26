import { useState, useEffect } from "react";
import { DatasetOverview } from "../types";
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Wrench, 
  RefreshCw, 
  Sparkles,
  Info
} from "lucide-react";

interface FailureData {
  issues_detected: string[];
  warnings: string[];
  fix_recommendations: string[];
}

interface FailureAgentProps {
  overview: DatasetOverview;
}

export default function FailureAgent({ overview }: FailureAgentProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [validationData, setValidationData] = useState<FailureData | null>(null);

  const fetchValidation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/validation", {
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
      setValidationData(data);
    } catch (err: any) {
      console.error("Validation Fetch Error:", err);
      setError(err.message || "Failed to perform dataset quality audit.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (overview) {
      const timer = setTimeout(() => {
        fetchValidation();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [overview.fileName]);

  const hasCriticalBlockers = validationData && validationData.issues_detected.some(issue => 
    !issue.toLowerCase().includes("zero immediate structural blockers")
  );

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="failure-agent-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <ShieldAlert className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Failure Agent (validation)</span>
              <span className="text-[10px] bg-rose-955/30 border border-rose-900/50 text-rose-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Quality Guard
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Inspects files for data leakages, missing target descriptors, null saturation ratios, or bad format delimiters.
            </p>
          </div>
        </div>

        {/* Manual Refresh */}
        <button
          onClick={fetchValidation}
          disabled={loading}
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
            loading 
              ? "bg-zinc-900 border-zinc-850 text-zinc-500 cursor-not-allowed" 
              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Auditing..." : "Re-Run Audit"}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-zinc-905 border-t-rose-500 animate-spin"></div>
            <ShieldAlert className="h-5 w-5 text-rose-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200 animate-pulse">Running Leakage and Quality Verification...</p>
            <p className="text-[10px] text-zinc-500 font-mono">Analyzing class ratios & redundant index dimensions</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-5 rounded-xl border border-red-955 bg-red-955/10 text-zinc-300 space-y-3 mt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-200">Validation Scan Halted</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchValidation}
            className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-red-850"
          >
            Retry Validation Audit
          </button>
        </div>
      )}

      {/* Main Validation Dashboard */}
      {!loading && !error && validationData && (
        <div className="space-y-6 mt-4">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
            hasCriticalBlockers 
              ? "bg-rose-950/15 border-rose-900/50" 
              : "bg-emerald-950/15 border-emerald-900/50"
          }`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              hasCriticalBlockers ? "bg-rose-955/30 text-rose-400" : "bg-emerald-955/30 text-emerald-400"
            }`}>
              {hasCriticalBlockers ? <AlertTriangle className="h-4.5 w-4.5" /> : <CheckCircle2 className="h-4.5 w-4.5" />}
            </div>
            <div>
              <h4 className={`text-xs font-bold uppercase tracking-wider font-mono ${
                hasCriticalBlockers ? "text-rose-400" : "text-emerald-400"
              }`}>
                {hasCriticalBlockers ? "Critical Risks Detected" : "Dataset Structurally Approved"}
              </h4>
              <p className="text-[11px] text-zinc-400 mt-0.5 leading-normal">
                {hasCriticalBlockers 
                  ? "We identified highly hazardous anomalies (like missing target definitions or extreme column data leakages) that require resolution." 
                  : "No critical structural issues or data leakages were identified. You can proceed with confidence."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Structural Issues (Blockers) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  Issues & Blockers
                </span>
              </div>
              <div className="space-y-2.5">
                {validationData.issues_detected.map((issue, idx) => {
                  const isSafe = issue.toLowerCase().includes("zero immediate structural blockers");
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 transition-all ${
                        isSafe 
                          ? "bg-zinc-900/25 border-zinc-900 text-zinc-400" 
                          : "bg-rose-955/10 border-rose-955/30 text-rose-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isSafe ? "bg-zinc-600" : "bg-rose-500 animate-ping"}`} />
                      <p className="flex-1">{issue}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Warnings (Hazards) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                  Warnings & Hazards
                </span>
              </div>
              <div className="space-y-2.5">
                {validationData.warnings.map((warn, idx) => {
                  const isSafe = warn.toLowerCase().includes("no suspicious class imbalance");
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 transition-all ${
                        isSafe 
                          ? "bg-zinc-900/25 border-zinc-900 text-zinc-400" 
                          : "bg-amber-955/10 border-amber-955/30 text-amber-200"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isSafe ? "bg-zinc-600" : "bg-amber-500"}`} />
                      <p className="flex-1">{warn}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Actionable Fix Recommendations */}
          <div className="pt-4 border-t border-zinc-900 space-y-3">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-emerald-400" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500">
                Actionable Fix Recommendations
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {validationData.fix_recommendations.map((recommendation, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-start space-x-2.5 hover:border-zinc-800 transition-all group"
                >
                  <div className="p-1 rounded-lg bg-emerald-955/20 border border-emerald-900/30 text-emerald-400 mt-0.5 group-hover:scale-105 transition-transform shrink-0">
                    <Sparkles className="h-3 w-3" />
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-normal font-normal flex-1">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
