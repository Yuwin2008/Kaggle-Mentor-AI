import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Database, 
  Eye, 
  BarChart3, 
  Compass, 
  Terminal, 
  Trophy, 
  MessageSquareCode,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
  CheckCircle2,
  ShieldAlert
} from "lucide-react";

interface AgentNode {
  id: string;
  name: string;
  role: string;
  targetId: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  glowColor: string;
}

interface AgentWorkflowProps {
  fileName: string | undefined;
  isAnalyzing: boolean;
  isChatting: boolean;
}

export default function AgentWorkflow({ fileName, isAnalyzing, isChatting }: AgentWorkflowProps) {
  const [activePulseNode, setActivePulseNode] = useState<string>("source");
  const [simulatedStream, setSimulatedStream] = useState<boolean>(false);
  const [streamProgress, setStreamProgress] = useState<number>(0);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, "idle" | "running" | "ready">>({
    detective: "ready",
    failure: "ready",
    eda: "ready",
    strategy: "ready",
    notebook: "ready",
    leaderboard: "ready"
  });

  const nodes: AgentNode[] = [
    {
      id: "source",
      name: "CSV Grounding Source",
      role: "Grounding Data Core",
      targetId: "csv-upload-container",
      icon: Database,
      description: "Secure baseline dataset parsed into structural rows, numeric metrics, and categories.",
      color: "text-emerald-400 border-emerald-500/20 bg-emerald-950/10",
      glowColor: "rgba(16, 185, 129, 0.15)"
    },
    {
      id: "detective",
      name: "Data Agent (structure)",
      role: "Structural Analyst",
      targetId: "detective-container",
      icon: Eye,
      description: "Examines column data types, parses row structures, computes standard error metrics, and aggregates categories.",
      color: "text-indigo-400 border-indigo-500/20 bg-indigo-950/10",
      glowColor: "rgba(99, 102, 241, 0.15)"
    },
    {
      id: "failure",
      name: "Failure Agent (validation)",
      role: "Quality Assurance Guard",
      targetId: "failure-agent-container",
      icon: ShieldAlert,
      description: "Detects missing target column descriptors, wrong file formats, data leakages, extreme class imbalances, and useless redundant attributes.",
      color: "text-rose-400 border-rose-500/20 bg-rose-950/10",
      glowColor: "rgba(244, 63, 94, 0.15)"
    },
    {
      id: "eda",
      name: "EDA Agent (insights)",
      role: "Visual Feature Analyzer",
      targetId: "eda-container",
      icon: BarChart3,
      description: "Generates continuous distribution histogram summaries, target correlations, and captures advanced visual insight recommendations.",
      color: "text-sky-400 border-sky-500/20 bg-sky-950/10",
      glowColor: "rgba(56, 189, 248, 0.15)"
    },
    {
      id: "strategy",
      name: "Strategy Agent (models)",
      role: "Architecture Selector",
      targetId: "strategy-container",
      icon: Compass,
      description: "Recommends the best modeling approach based on dataset structures, and maps XGBoost, LightGBM, and CatBoost hyperparameter parameters.",
      color: "text-violet-400 border-violet-500/20 bg-violet-950/10",
      glowColor: "rgba(139, 92, 246, 0.15)"
    },
    {
      id: "notebook",
      name: "Notebook Agent (code)",
      role: "Python Code Architect",
      targetId: "notebook-container",
      icon: Terminal,
      description: "Produces instantly-copyable, robust end-to-end executable Scikit-Learn pipelines and submission estimators.",
      color: "text-fuchsia-400 border-fuchsia-500/20 bg-fuchsia-950/10",
      glowColor: "rgba(217, 70, 239, 0.15)"
    },
    {
      id: "leaderboard",
      name: "Coach Agent (improvement loop)",
      role: "Kaggle Grandmaster Coach",
      targetId: "leaderboard-agent-container",
      icon: Trophy,
      description: "Accepts validation submissions to diagnose underfitting, advise on advanced ensembling blends, and trigger local improvement sweeps.",
      color: "text-amber-400 border-amber-500/20 bg-amber-950/10",
      glowColor: "rgba(245, 158, 11, 0.15)"
    }
  ];

  // React to actual analyzing and chatting states
  useEffect(() => {
    if (isAnalyzing) {
      setAgentStatuses({
        detective: "running",
        failure: "running",
        eda: "running",
        strategy: "running",
        notebook: "idle",
        leaderboard: "idle"
      });
      setActivePulseNode("detective");
    } else {
      setAgentStatuses({
        detective: "ready",
        failure: "ready",
        eda: "ready",
        strategy: "ready",
        notebook: "ready",
        leaderboard: "ready"
      });
      setActivePulseNode("source");
    }
  }, [isAnalyzing]);

  // Trigger manual flow handshake simulation
  const startSimulation = () => {
    if (simulatedStream) return;
    setSimulatedStream(true);
    setStreamProgress(0);
    
    const nodesSeq = ["source", "detective", "failure", "eda", "strategy", "notebook", "leaderboard"];
    let step = 0;
    
    const interval = setInterval(() => {
      step += 1;
      setStreamProgress((step / (nodesSeq.length - 1)) * 100);
      
      if (step < nodesSeq.length) {
        setActivePulseNode(nodesSeq[step]);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setSimulatedStream(false);
          setActivePulseNode("source");
          setStreamProgress(0);
        }, 1500);
      }
    }, 900);
  };

  const scrollToComponent = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm" id="workflow-visualization-section">
      {/* Decorative dark background graticule */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(39,39,42,0.12),transparent_60%)] pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
      
      {/* Telemetry Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 mb-6 border-b border-zinc-900/80">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-zinc-500 font-bold">
              AI Multi-Agent Pipeline Orchestration
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
            Interactive Workflow Architecture
            {fileName && (
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-medium">
                {fileName}
              </span>
            )}
          </h2>
        </div>

        <button
          onClick={startSimulation}
          disabled={simulatedStream || isAnalyzing}
          className="h-8 px-4 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-xs font-semibold text-zinc-200 hover:text-white rounded-lg border border-zinc-800 flex items-center gap-2 transition cursor-pointer"
        >
          <Zap className={`h-3 w-3 ${simulatedStream ? "text-emerald-400 animate-bounce" : "text-amber-400"}`} />
          {simulatedStream ? "Streaming Pulse..." : "Test Pipeline Handshake"}
        </button>
      </div>

      {/* SVG Connection Path for desktop flow */}
      <div className="relative z-10">
        {/* Desktop Circuit Line Flow */}
        <div className="hidden lg:block absolute left-12 right-12 top-11 h-[2px] bg-zinc-900 pointer-events-none">
          <motion.div 
            className="h-full bg-gradient-to-r from-emerald-500 via-indigo-500 via-sky-500 via-violet-500 via-fuchsia-500 via-amber-500 to-rose-500"
            initial={{ width: "0%" }}
            animate={{ width: simulatedStream ? `${streamProgress}%` : isAnalyzing ? "50%" : "100%" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>

        {/* Nodes Flex Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 relative">
          {nodes.map((node, index) => {
            const IconComponent = node.icon;
            const isNodeActive = activePulseNode === node.id;
            const status = node.id === "source" ? "ready" : agentStatuses[node.id] || "idle";

            return (
              <div
                key={node.id}
                onClick={() => scrollToComponent(node.targetId)}
                className="group flex flex-col items-center text-center cursor-pointer relative"
              >
                {/* Node Halo container */}
                <div className="relative mb-3 flex items-center justify-center">
                  {/* Glowing background ring */}
                  {isNodeActive && (
                    <span className="absolute inset-0 rounded-full scale-150 animate-pulse pointer-events-none" style={{ backgroundColor: node.glowColor }} />
                  )}

                  {/* Circle Button */}
                  <div 
                    className={`w-14 h-14 rounded-xl border flex items-center justify-center transition-all duration-300 relative z-10 ${
                      isNodeActive 
                        ? `border-zinc-300 bg-zinc-900 scale-105 shadow-md shadow-zinc-950`
                        : `border-zinc-850 bg-zinc-950/80 hover:border-zinc-700`
                    }`}
                  >
                    <IconComponent className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${node.color}`} />
                    
                    {/* Status corner badge indicator */}
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 rounded-full items-center justify-center text-[8px] border border-zinc-900 shadow bg-zinc-950">
                      {status === "ready" && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      )}
                      {status === "running" && (
                        <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
                      )}
                      {status === "idle" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                      )}
                    </span>
                  </div>

                  {/* Horizontal Connection Trail beads for mobile visual */}
                  {index < nodes.length - 1 && (
                    <div className="lg:hidden absolute top-1/2 -right-2 w-4 h-[1px] bg-zinc-900 z-0 pointer-events-none" />
                  )}
                </div>

                {/* Info Text details */}
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-zinc-200 group-hover:text-zinc-100 transition-colors truncate max-w-[110px]">
                    {node.name}
                  </h4>
                  <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-tight">
                    {node.role}
                  </p>
                </div>

                {/* Detailed Hover Tooltip */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none absolute top-full mt-2 w-48 bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] p-2.5 rounded-lg shadow-xl z-50 text-left leading-relaxed">
                  <div className="font-bold text-zinc-100 mb-1 flex items-center justify-between">
                    <span>{node.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">{status}</span>
                  </div>
                  {node.description}
                  <div className="mt-1.5 text-[9px] text-amber-400 font-mono flex items-center gap-1">
                    <span>Jump to block</span>
                    <ArrowRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workflow Telemetry Footer status bar */}
      <div className="mt-6 pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-mono text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Active Source
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Detective Ready
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Formulator Ready
          </span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <Activity className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span>Pipeline: secure mathematical sandbox</span>
        </div>
      </div>
    </div>
  );
}
