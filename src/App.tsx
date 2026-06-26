import { useState } from "react";
import CSVUpload from "./components/CSVUpload";
import DatasetDetective from "./components/DatasetDetective";
import FailureAgent from "./components/FailureAgent";
import EDAAgent from "./components/EDAAgent";
import StrategyAgent from "./components/StrategyAgent";
import NotebookAgent from "./components/NotebookAgent";
import LeaderboardAgent from "./components/LeaderboardAgent";
import DatasetSummary from "./components/DatasetSummary";
import PreviewTable from "./components/PreviewTable";
import ChatInterface from "./components/ChatInterface";
import AgentWorkflow from "./components/AgentWorkflow";
import { DatasetOverview, Message } from "./types";
import { sampleDatasets } from "./sampleData";
import {
  FileSpreadsheet,
  Trash2,
  Database,
  ArrowRight,
  Info,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  LineChart,
  Grid,
  Sparkles,
  Zap,
  Network
} from "lucide-react";

export default function App() {
  const [datasetOverview, setDatasetOverview] = useState<DatasetOverview | null>(sampleDatasets[0].data);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Default initial greeting aligned with preloaded saas tracker
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: "init-message",
      role: "assistant",
      content: "Hello! I am your AI Data Scientist. I have pre-loaded a **SaaS Sales Tracker** preview. You can analyze regional revenue metrics, explore fields, or upload your own CSV file above. What would you like to investigate today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Handle User CSV Upload
  const handleUploadCSV = async (csvContent: string, fileName: string) => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvContent, fileName }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Parsing and synthesis failed.");
      }

      const overview: DatasetOverview = await response.json();
      setDatasetOverview(overview);

      // Seed chat history with helpful welcome for the specific dataset
      setChatMessages([
        {
          id: String(Date.now()),
          role: "assistant",
          content: `Successfully parsed and completed AI intelligence review on **${fileName}**! Found **${overview.rowCount}** records across **${overview.colCount}** variables.\n\nType below to consult average trends, query categorical details, or find potential numerical anomalies!`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to process the CSV dataset.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle interactive Chat Message Query
  const handleSendMessage = async (userText: string) => {
    const userMsg: Message = {
      id: String(Date.now()),
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updatedHistory = [...chatMessages, userMsg];
    setChatMessages(updatedHistory);
    setIsChatting(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedHistory,
          datasetOverview,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Consultation with AI failed.");
      }

      const reply = await response.json();
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: reply.content,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: "assistant",
          content: `⚠️ **AI Service Offline / Configuration Required**: ${err.message || "An unexpected error occurred while processing your message."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  // Switch to preset sample templates
  const handleSelectSample = (sample: DatasetOverview) => {
    setDatasetOverview(sample);
    setErrorMessage(null);
    setChatMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        content: `Loaded pre-computed sample dashboard **"${sample.fileName}"**! You can ask questions about its attributes right away.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Unload Dataset / Reset Workspace
  const handleClearDataset = () => {
    setDatasetOverview(null);
    setErrorMessage(null);
    setChatMessages([
      {
        id: String(Date.now()),
        role: "assistant",
        content: "Workspace reset. Please upload a new CSV dataset or click on a playground preset below to begin analysis.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="min-h-screen bg-[#050507] text-zinc-100 flex overflow-hidden font-sans selection:bg-zinc-800 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-zinc-950 border-r border-zinc-900 hidden md:flex flex-col shrink-0 h-screen sticky top-0">
        {/* Logo Banner */}
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
          <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]">
            <div className="w-3.5 h-3.5 bg-black rounded-[3px] flex items-center justify-center">
              <span className="text-[9px] font-bold text-white font-mono">K</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm tracking-tight text-zinc-100 font-sans">Kaggle Mentor AI</span>
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-mono">AI Studio</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-1.5">
          <button className="w-full flex items-center gap-3 px-3 py-2 bg-zinc-900 text-white rounded-lg font-semibold text-xs transition-colors">
            <Grid className="w-4 h-4 text-zinc-400" />
            Workspace Canvas
          </button>
          
          <div className="pt-4 pb-2 px-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 block">Active Assets</span>
          </div>

          <button 
            onClick={() => { if (datasetOverview) scrollToComponent("workflow-visualization-section"); }}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg text-xs text-left transition-colors"
          >
            <Network className="w-4 h-4 text-zinc-500" />
            Workflow Pipelines
          </button>
          <button 
            onClick={() => { 
              if (datasetOverview) {
                scrollToComponent("dataset-detective-agent"); 
              } else {
                scrollToComponent("csv-upload-container");
              }
            }}
            className="w-full flex items-center gap-3 px-3 py-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 rounded-lg text-xs text-left transition-colors"
          >
            <Database className="w-4 h-4 text-zinc-500" />
            Metadata Records
          </button>
        </nav>


      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto bg-zinc-950/20">
        {/* Top Header Bar */}
        <header className="h-16 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900 px-6 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono">
            <span>SYSTEM</span>
            <span className="text-zinc-800">/</span>
            <span>DATASETS</span>
            <span className="text-zinc-800">/</span>
            <span className="text-zinc-100 font-bold max-w-[160px] sm:max-w-[280px] truncate">
              {datasetOverview ? datasetOverview.fileName : "STANDBY"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {datasetOverview && (
              <button
                onClick={handleClearDataset}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-bold border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
              >
                Reset Workspace
              </button>
            )}
            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/50 px-2 py-0.5 rounded-full">
              LIVE
            </span>
          </div>
        </header>

        {/* Content View */}
        <div className="p-6 sm:p-8 flex-1 flex flex-col gap-8 max-w-7xl w-full mx-auto">
          {/* Section 1: CSV Upload Dropzone & Preset Selectors */}
          <section className="bg-zinc-950 border border-zinc-900 shadow-2xl p-6 rounded-2xl relative overflow-hidden" id="csv-upload-container">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                  <Database className="h-4 w-4 text-zinc-400" />
                  Dataset Grounding Core
                </h2>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  Ground our model pipeline on custom data. Load spreadsheets to trigger telemetry diagnostics, predictive formulation, and deep EDA structures.
                </p>
              </div>
            </div>

            <div className="mt-6">
              {datasetOverview ? (
                /* Selected File status container */
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-3.5">
                    <div className="p-2.5 bg-zinc-900 text-zinc-100 rounded-lg shrink-0 mt-0.5 sm:mt-0 border border-zinc-800">
                      <CheckCircle className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono uppercase bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold px-2 py-0.5 rounded-full tracking-wider">
                        Telemetry Linked
                      </span>
                      <p className="text-zinc-200 font-bold font-mono text-sm mt-1.5">
                        {datasetOverview.fileName}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        Currently grounding high-fidelity summaries, code templates, and contextual assistants.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400">
                      {datasetOverview.rowCount.toLocaleString()} records
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-850 text-zinc-400">
                      {datasetOverview.colCount} attributes
                    </span>
                  </div>
                </div>
              ) : (
                <CSVUpload
                  onUploadSuccess={handleUploadCSV}
                  isLoading={isAnalyzing}
                  errorMsg={errorMessage}
                />
              )}
            </div>

            {/* Sandbox templates list */}
            <div className="mt-6 pt-6 border-t border-zinc-900">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-3 font-semibold">
                GROUNDING TEMPLATE PRESETS
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sampleDatasets.map((sample, idx) => {
                  const isSelected = datasetOverview?.fileName === sample.data.fileName;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectSample(sample.data)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-zinc-300 bg-zinc-900/40 text-white shadow-lg"
                          : "border-zinc-900 bg-zinc-950/20 hover:bg-zinc-900/20 hover:border-zinc-800 text-zinc-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold font-mono text-zinc-200 block">
                            {sample.name}
                          </span>
                          {isSelected && (
                            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase flex items-center space-x-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                              <span>Grounded</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">{sample.description}</p>
                      </div>

                      <div className="mt-3 flex items-center text-[11px] font-bold text-zinc-400 group-hover:text-zinc-200">
                        <span>Initialize preset metrics</span>
                        <ArrowRight className="h-3 w-3 ml-1 text-zinc-500" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Render charts/analytics/chatbot workspace once grounded */}
          {datasetOverview ? (
            <div className="space-y-8">
              {/* Agent Workflow Visualization Component */}
              <AgentWorkflow 
                fileName={datasetOverview?.fileName} 
                isAnalyzing={isAnalyzing} 
                isChatting={isChatting} 
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* Analytics left column (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Dataset Detective Client Agent Diagnostic Card */}
                  <DatasetDetective overview={datasetOverview} />

                  {/* Failure Agent / Data Validation Audit */}
                  <FailureAgent overview={datasetOverview} />

                  {/* Exploratory Data Analysis (EDA) Generative AI Agent */}
                  <EDAAgent overview={datasetOverview} />

                  {/* ML Strategy Formulation Agent */}
                  <StrategyAgent overview={datasetOverview} />

                  {/* Notebook Generator Agent */}
                  <NotebookAgent overview={datasetOverview} />

                  {/* Leaderboard Coach Agent */}
                  <LeaderboardAgent overview={datasetOverview} />

                  <section className="space-y-4" id="dataset-summary-section">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400 font-mono">
                      // Metrics & Visualization Distributions
                    </h2>
                    <DatasetSummary
                      overview={datasetOverview}
                      onAskQuestion={handleSendMessage}
                    />
                  </section>

                  <section className="space-y-4" id="table-matrix-section">
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400 font-mono">
                      // Preview Matrix review
                    </h2>
                    <PreviewTable
                      headers={datasetOverview.headers}
                      rows={datasetOverview.previewRows}
                      fileName={datasetOverview.fileName}
                    />
                  </section>
                </div>

                {/* Chatbot right sticky column (1/3 width) */}
                <div className="lg:col-span-1 lg:sticky lg:top-20" id="chat-interface-container">
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-400 font-mono">
                        // Direct Q&A Assistant
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1">
                        Interact in plain markdown with complete statistical awareness.
                      </p>
                    </div>
                    <ChatInterface
                      messages={chatMessages}
                      onSendMessage={handleSendMessage}
                      onClearHistory={() =>
                        setChatMessages([
                          {
                            id: String(Date.now()),
                            role: "assistant",
                            content: "Chat log cleared. How can I help you analyze the active dataset now?",
                            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                          },
                        ])
                      }
                      isLoading={isChatting}
                      datasetOverview={datasetOverview}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Missing workspace grounding warning alert screen */
            <div className="border border-dashed border-zinc-800 p-12 text-center rounded-2xl bg-zinc-950/20 max-w-xl mx-auto space-y-4 shadow-xl">
              <HelpCircle className="h-10 w-10 text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="font-semibold text-zinc-200 text-sm">Workspace Standby</h3>
                <p className="text-xs text-zinc-500">
                  Please link a spreadsheet or select a playground preset above to activate the automated pipeline, visual analytics, and conversational assistant.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info bar */}
        <footer className="border-t border-zinc-900 mt-auto py-8 bg-zinc-950 text-center text-xs text-zinc-500 font-mono">
          <p>DATACORE STUDIO // PLATFORM ENVIRONMENT SECURITY SYSTEM</p>
          <p className="text-zinc-600 mt-1">© 2026 Sandbox Preview Mode.</p>
        </footer>
      </main>
    </div>
  );
}

// Simple helper to smooth scroll to components
function scrollToComponent(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

