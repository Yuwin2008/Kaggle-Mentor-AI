import { useState, useEffect } from "react";
import { DatasetOverview } from "../types";
import { 
  Compass, 
  Cpu, 
  Zap, 
  Copy, 
  Check, 
  TrendingUp, 
  AlertCircle, 
  ShieldCheck, 
  SlidersHorizontal,
  RefreshCw
} from "lucide-react";

interface ModelStrategy {
  score: number;
  suitability: string;
  reasoning: string;
  params: string[];
}

interface StrategyData {
  summary: string;
  catboost: ModelStrategy;
  lightgbm: ModelStrategy;
  xgboost: ModelStrategy;
  generalTactics: string[];
}

interface StrategyAgentProps {
  overview: DatasetOverview;
}

export default function StrategyAgent({ overview }: StrategyAgentProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyData | null>(null);
  const [activeModel, setActiveModel] = useState<"catboost" | "lightgbm" | "xgboost">("catboost");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchStrategy = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/strategy", {
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
      setStrategyData(data);
    } catch (err: any) {
      console.error("Strategy Fetch Error:", err);
      setError(err.message || "Failed to generate ML strategic recommendations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (overview) {
      const timer = setTimeout(() => {
        fetchStrategy();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [overview.fileName]);

  const copyParamsToClipboard = (params: string[]) => {
    const text = params.join("\n");
    navigator.clipboard.writeText(text);
    setCopiedIndex(999);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="strategy-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Compass className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>ML Strategy Co-Pilot</span>
              <span className="text-[10px] bg-violet-955/30 border border-violet-900/50 text-violet-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Boosting Core
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tactical evaluation models for CatBoost, LightGBM, and XGBoost tailored to your schema features.
            </p>
          </div>
        </div>

        {/* Manual refresh */}
        <button
          onClick={fetchStrategy}
          disabled={loading}
          className={`self-start sm:self-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
            loading 
              ? "bg-zinc-900 border-zinc-850 text-zinc-500 cursor-not-allowed" 
              : "bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-300 hover:text-white"
          }`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>{loading ? "Evaluating..." : "Re-evaluate Strategy"}</span>
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-2 border-zinc-905 border-t-violet-500 animate-spin"></div>
            <Cpu className="h-5 w-5 text-violet-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-200 animate-pulse">Formulating Boosting Architectures...</p>
            <p className="text-[10px] text-zinc-500 font-mono">Calibrating learning rates & leaf split parameters</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-5 rounded-xl border border-red-955 bg-red-955/10 text-zinc-300 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-200">Strategy Engine Halted</h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={fetchStrategy}
              className="px-3 py-1.5 bg-red-900 hover:bg-red-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border border-red-850"
            >
              Retry Strategy Evaluation
            </button>
          </div>
        </div>
      )}

      {/* Main Strategy Dashboard */}
      {!loading && !error && strategyData && (
        <div className="space-y-6 mt-4">
          {/* 1. Tactical Summary Card */}
          <div className="p-4 rounded-xl bg-zinc-900/25 border border-zinc-900 space-y-2">
            <div className="flex items-center gap-2 text-violet-400">
              <TrendingUp className="h-4 w-4" />
              <span className="font-extrabold text-[10px] uppercase tracking-wider font-mono">Tactical Executive Summary</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed font-normal">
              {strategyData.summary}
            </p>
          </div>

          {/* 2. Three Model Selector & Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model Navigation List */}
            <div className="lg:col-span-1 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block font-bold mb-2">
                Boosting Frameworks
              </span>

              {(["catboost", "lightgbm", "xgboost"] as const).map((mKey) => {
                const model = strategyData[mKey];
                const isActive = activeModel === mKey;
                const isCat = mKey === "catboost";
                const isLgb = mKey === "lightgbm";
                const title = isCat ? "CatBoost" : isLgb ? "LightGBM" : "XGBoost";
                const subText = isCat 
                  ? "Symmetric split trees" 
                  : isLgb 
                  ? "Leaf-wise growth speed" 
                  : "Depth-wise extreme robust";

                return (
                  <button
                    key={mKey}
                    onClick={() => setActiveModel(mKey)}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isActive
                        ? "border-zinc-300 bg-zinc-900/60 shadow-lg"
                        : "border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/25 hover:border-zinc-800"
                    }`}
                  >
                    <div className={`p-2 rounded-lg shrink-0 ${
                      isActive 
                        ? "bg-zinc-850 text-white" 
                        : "bg-zinc-900 text-zinc-500"
                    }`}>
                      {isCat ? <SlidersHorizontal className="h-4 w-4 text-violet-400" /> : isLgb ? <Zap className="h-4 w-4 text-amber-400" /> : <Cpu className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-zinc-200 block">
                          {title}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          model.score >= 85 
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30" 
                            : "bg-zinc-900 text-zinc-400"
                        }`}>
                          {model.score}%
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate mt-0.5 font-mono">
                        {subText}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Model Recommendation Detailed View Card */}
            <div className="lg:col-span-2 bg-zinc-900/10 rounded-xl border border-zinc-900 p-5 space-y-4">
              {/* Selected Model Title row */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900/60">
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 uppercase tracking-wide font-mono">
                    {activeModel === "catboost" ? "CatBoost Optimizer" : activeModel === "lightgbm" ? "LightGBM Leaf-Wise" : "XGBoost Regularized"}
                  </h4>
                  <span className="text-[10px] text-zinc-500 block font-mono mt-0.5">
                    Suitability Matrix: <strong className="text-violet-400 font-semibold">{strategyData[activeModel].suitability}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase">Match rating</span>
                    <span className="text-xs font-bold text-zinc-200 font-mono">{strategyData[activeModel].score}%</span>
                  </div>
                  {/* Miniature progress bar */}
                  <div className="w-12 h-1.5 bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden shrink-0">
                    <div 
                      className="bg-violet-500 h-full transition-all duration-500" 
                      style={{ width: `${strategyData[activeModel].score}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Model Reasoning */}
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Reasoning Alignment</span>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {strategyData[activeModel].reasoning}
                </p>
              </div>

              {/* Hyperparameter Boilerplate copy config */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">Optimal Parameters (Python Config)</span>
                  <button
                    onClick={() => copyParamsToClipboard(strategyData[activeModel].params)}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 hover:text-white cursor-pointer transition-colors"
                  >
                    {copiedIndex === 999 ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    <span>{copiedIndex === 999 ? "Config Copied!" : "Copy Python Config"}</span>
                  </button>
                </div>
                <div className="bg-black/80 text-zinc-300 p-4 rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed max-h-40 border border-zinc-900">
                  <span className="text-zinc-600 block mb-1"># Parameter setup dictionary</span>
                  {strategyData[activeModel].params.map((param, pIdx) => (
                    <div key={pIdx} className="text-violet-300">
                      {param}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. General Validation & Pipeline Tactics */}
          <div className="pt-4 border-t border-zinc-900 space-y-3">
            <span className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-widest block">
              Validation Protocol & Pipeline Steps
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategyData.generalTactics.map((tactic, idx) => (
                <div 
                  key={idx} 
                  className="p-3.5 rounded-xl border border-zinc-900 bg-zinc-900/10 flex items-start space-x-2.5 hover:border-zinc-800 transition-all"
                >
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 leading-normal">{tactic}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
