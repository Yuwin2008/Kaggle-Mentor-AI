import React, { useState } from "react";
import { DatasetOverview } from "../types";
import { 
  Trophy, 
  Lightbulb, 
  TrendingUp, 
  Settings, 
  Layers, 
  GitMerge, 
  Sliders, 
  Sparkles, 
  ChevronRight,
  AlertCircle
} from "lucide-react";

interface LeaderboardAgentProps {
  overview: DatasetOverview;
}

interface CoachResponse {
  currentTier: string;
  analysis: string;
  suggestions: {
    featureEngineering: string[];
    ensembling: string[];
    tuning: string[];
  };
  additionalTips: string[];
}

export default function LeaderboardAgent({ overview }: LeaderboardAgentProps) {
  const [score, setScore] = useState<string>("");
  const [metric, setMetric] = useState<string>("accuracy");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [coachData, setCoachData] = useState<CoachResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"features" | "ensembles" | "tuning">("features");

  const metricsList = [
    { value: "accuracy", label: "Accuracy (Higher is Better)" },
    { value: "roc_auc", label: "ROC-AUC (Higher is Better)" },
    { value: "f1_score", label: "F1-Score (Higher is Better)" },
    { value: "log_loss", label: "Log Loss (Lower is Better)" },
    { value: "rmse", label: "RMSE (Lower is Better)" },
    { value: "mae", label: "MAE (Lower is Better)" },
    { value: "r2_score", label: "R2-Score (Higher is Better)" }
  ];

  const handleGetStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!score || isNaN(Number(score))) {
      setError("Please enter a valid numeric score.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          columnStats: overview.columnStats,
          rowCount: overview.rowCount,
          colCount: overview.colCount,
          fileName: overview.fileName,
          metric,
          score: Number(score)
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCoachData(data);
    } catch (err: any) {
      console.error("Leaderboard Coach Error:", err);
      setError(err.message || "Failed to retrieve leaderboard coaching strategy.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to color-code the Kaggle Tiers
  const getTierStyles = (tier: string) => {
    const t = tier.toLowerCase();
    if (t.includes("gold")) {
      return {
        bg: "bg-amber-950/20",
        text: "text-amber-400",
        border: "border-amber-900/50",
        bulletBg: "bg-amber-950/40",
        bulletIconColor: "text-amber-400"
      };
    } else if (t.includes("silver")) {
      return {
        bg: "bg-zinc-900/40",
        text: "text-zinc-350",
        border: "border-zinc-800",
        bulletBg: "bg-zinc-900",
        bulletIconColor: "text-zinc-400"
      };
    } else { // Bronze
      return {
        bg: "bg-amber-955/10",
        text: "text-amber-500",
        border: "border-amber-950/30",
        bulletBg: "bg-amber-955/20",
        bulletIconColor: "text-amber-500"
      };
    }
  };

  const tierStyle = coachData ? getTierStyles(coachData.currentTier) : null;

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="leaderboard-agent-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header Info */}
      <div className="flex items-center gap-3 pb-4 border-b border-zinc-900/80">
        <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
          <Trophy className="h-5 w-5 text-amber-400 animate-pulse" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span>Leaderboard Coach Agent</span>
            <span className="text-[10px] bg-amber-950/30 border border-amber-900/50 text-amber-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              Kaggle Coach
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Submit your validation score to extract tailored feature engineering, ensembling, and hyperparameter directives.
          </p>
        </div>
      </div>

      {/* Input Score Form */}
      <form onSubmit={handleGetStrategy} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 mt-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
            Validation Metric
          </label>
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value)}
            className="w-full h-9 text-xs rounded-lg border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-zinc-350 focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer"
          >
            {metricsList.map(item => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
            Your Current Score
          </label>
          <input
            type="text"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            placeholder="e.g. 0.785"
            className="w-full h-9 text-xs rounded-lg border border-zinc-850 bg-zinc-950 px-2.5 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-700 font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="h-9 w-full bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-900 disabled:text-zinc-600 text-black text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer border border-white"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-black" />
          )}
          <span>{loading ? "Analyzing Score..." : "Get Improvement Strategy"}</span>
        </button>
      </form>

      {error && (
        <div className="p-3.5 bg-red-950/10 border border-red-950 text-red-400 rounded-xl text-xs flex items-center gap-2 mt-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Coach Diagnostic Report */}
      {coachData ? (
        <div className="space-y-6 mt-4">
          {/* Diagnostic Tier Block */}
          <div className={`p-4 rounded-xl border ${tierStyle?.border} ${tierStyle?.bg} space-y-3`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-zinc-500">
                Coaching Audit Diagnosis
              </span>
              <div className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border font-mono uppercase ${tierStyle?.border} ${tierStyle?.bg} ${tierStyle?.text}`}>
                <Trophy className="h-3.5 w-3.5 shrink-0" />
                {coachData.currentTier}
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              {coachData.analysis}
            </p>
          </div>

          {/* Tabbed Action Suggestions */}
          <div className="space-y-4">
            {/* Tabs Headers */}
            <div className="flex border-b border-zinc-900 p-1 gap-1 bg-zinc-900/20 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("features")}
                className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "features"
                    ? "bg-zinc-900 text-zinc-100 shadow border border-zinc-850"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                Features
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("ensembles")}
                className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "ensembles"
                    ? "bg-zinc-900 text-zinc-100 shadow border border-zinc-850"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <GitMerge className="h-3.5 w-3.5" />
                Ensembles
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("tuning")}
                className={`flex-1 py-1.5 text-xs font-bold font-mono rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  activeTab === "tuning"
                    ? "bg-zinc-900 text-zinc-100 shadow border border-zinc-850"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Tuning
              </button>
            </div>

            {/* Suggestions Content list */}
            <div className="space-y-3 min-h-[140px]">
              {activeTab === "features" && coachData.suggestions.featureEngineering.map((item, index) => (
                <div key={index} className="flex gap-3.5 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-900/10 transition">
                  <div className={`w-7 h-7 rounded-lg ${tierStyle?.bulletBg} border border-zinc-900 flex items-center justify-center shrink-0`}>
                    <Lightbulb className={`h-3.5 w-3.5 ${tierStyle?.bulletIconColor}`} />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {item}
                  </p>
                </div>
              ))}

              {activeTab === "ensembles" && coachData.suggestions.ensembling.map((item, index) => (
                <div key={index} className="flex gap-3.5 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-900/10 transition">
                  <div className={`w-7 h-7 rounded-lg ${tierStyle?.bulletBg} border border-zinc-900 flex items-center justify-center shrink-0`}>
                    <GitMerge className={`h-3.5 w-3.5 ${tierStyle?.bulletIconColor}`} />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {item}
                  </p>
                </div>
              ))}

              {activeTab === "tuning" && coachData.suggestions.tuning.map((item, index) => (
                <div key={index} className="flex gap-3.5 p-4 rounded-xl border border-zinc-900 bg-zinc-950/20 hover:border-zinc-800 hover:bg-zinc-900/10 transition">
                  <div className={`w-7 h-7 rounded-lg ${tierStyle?.bulletBg} border border-zinc-900 flex items-center justify-center shrink-0`}>
                    <Settings className={`h-3.5 w-3.5 ${tierStyle?.bulletIconColor}`} />
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Advanced tips list */}
          {coachData.additionalTips && coachData.additionalTips.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-zinc-900/80">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-550 flex items-center gap-1.5 font-mono">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                Grandmaster Post-Processing Directives
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {coachData.additionalTips.map((tip, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-zinc-900/10 border border-zinc-900 flex items-start gap-2.5 hover:border-zinc-800 transition">
                    <ChevronRight className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-normal">
                      {tip}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20 mt-4">
          <Lightbulb className="h-9 w-9 text-zinc-700" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-zinc-300">
              No Score Submitted Yet
            </p>
            <p className="text-[11px] text-zinc-500 max-w-sm px-6">
              Enter your current validation evaluation score to unlock custom Grandmaster rank tactics.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
