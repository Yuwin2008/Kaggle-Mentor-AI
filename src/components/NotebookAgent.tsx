import { useState, useEffect } from "react";
import { DatasetOverview } from "../types";
import { 
  FileCode, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  RefreshCw, 
  Terminal, 
  BookOpen, 
  CheckCircle2, 
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface NotebookCell {
  cell_type: "markdown" | "code";
  source: string[];
}

interface NotebookData {
  cells: NotebookCell[];
}

interface NotebookAgentProps {
  overview: DatasetOverview;
}

export default function NotebookAgent({ overview }: NotebookAgentProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notebookData, setNotebookData] = useState<NotebookData | null>(null);
  const [copiedCellIndex, setCopiedCellIndex] = useState<number | null>(null);
  const [copiedEntire, setCopiedEntire] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("Drafting Kaggle environment...");
  const [expandedCellIndex, setExpandedCellIndex] = useState<number | null>(0); // Default expand first cell

  const loadingMessages = [
    "Injecting dataset schema into pipeline...",
    "Defining ColumnTransformers for missing variables...",
    "Assembling XGBoost validation routines...",
    "Creating feature importance visualizers...",
    "Configuring Kaggle folder fallback structures...",
  ];

  const fetchNotebook = async () => {
    setLoading(true);
    setError(null);

    let msgIndex = 0;
    const interval = setInterval(() => {
      msgIndex = (msgIndex + 1) % loadingMessages.length;
      setLoadingMessage(loadingMessages[msgIndex]);
    }, 2000);

    try {
      const response = await fetch("/api/notebook", {
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
      setNotebookData(data);
    } catch (err: any) {
      console.error("Notebook Generation Error:", err);
      setError(err.message || "Failed to generate Kaggle starter notebook.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (overview) {
      const timer = setTimeout(() => {
        fetchNotebook();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [overview.fileName]);

  const copyCellCode = (lines: string[], index: number) => {
    const text = lines.join("");
    navigator.clipboard.writeText(text);
    setCopiedCellIndex(index);
    setTimeout(() => setCopiedCellIndex(null), 2000);
  };

  const copyEntireNotebookCode = () => {
    if (!notebookData) return;
    const allCode = notebookData.cells
      .map(cell => {
        if (cell.cell_type === "markdown") {
          return cell.source.map(line => `# ${line}`).join("");
        } else {
          return cell.source.join("");
        }
      })
      .join("\n\n# " + "=".repeat(70) + "\n\n");
    
    navigator.clipboard.writeText(allCode);
    setCopiedEntire(true);
    setTimeout(() => setCopiedEntire(false), 2000);
  };

  const downloadIpynb = () => {
    if (!notebookData) return;

    // Build the fully-compliant .ipynb JSON structure
    const ipynb = {
      cells: notebookData.cells.map((cell, idx) => {
        const isCode = cell.cell_type === "code";
        // Ensure every line ends with a newline, except maybe the last one to prevent Jupyter parsing quirks
        const processedSource = cell.source.map((line, lineIdx) => {
          if (lineIdx === cell.source.length - 1) {
            return line;
          }
          return line.endsWith("\n") ? line : line + "\n";
        });

        return {
          cell_type: cell.cell_type,
          metadata: {},
          source: processedSource,
          ...(isCode 
            ? { outputs: [], execution_count: null } 
            : {}
          )
        };
      }),
      metadata: {
        kernelspec: {
          display_name: "Python 3 (ipykernel)",
          language: "python",
          name: "python3"
        },
        language_info: {
          codemirror_mode: {
            name: "ipython",
            version: 3
          },
          file_extension: ".py",
          mimetype: "text/x-python",
          name: "python",
          nbconvert_exporter: "python",
          pygments_lexer: "ipython3",
          version: "3.10.0"
        }
      },
      nbformat: 4,
      nbformat_minor: 2
    };

    const blob = new Blob([JSON.stringify(ipynb, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    
    // Create friendly file name
    const baseName = overview.fileName.replace(/\.[^/.]+$/, "");
    a.href = url;
    a.download = `${baseName}_kaggle_starter.ipynb`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Extract metadata for the summary panel
  const detectedTarget = overview.columnStats.find(c => {
    const l = c.name.toLowerCase();
    return l.includes("target") || l.includes("label") || l.includes("class") || l.includes("price") || l.includes("churn") || l.includes("survived") || l.includes("y") || l.includes("output");
  })?.name || overview.columnStats[overview.columnStats.length - 1]?.name || "target";

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="notebook-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <FileCode className="h-5 w-5 text-fuchsia-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Notebook Generator Agent</span>
              <span className="text-[10px] bg-fuchsia-955/30 border border-fuchsia-900/50 text-fuchsia-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Kaggle Expert
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Generates fully working Jupyter Starter Notebooks customized for your schema.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {notebookData && (
            <>
              <button
                onClick={copyEntireNotebookCode}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 transition cursor-pointer"
                title="Copy entire notebook as a single combined Python script"
              >
                {copiedEntire ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedEntire ? "Script Copied!" : "Copy Python Script"}</span>
              </button>

              <button
                onClick={downloadIpynb}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-zinc-100 hover:bg-zinc-200 text-black shadow-sm transition cursor-pointer border border-white"
              >
                <Download className="h-3.5 w-3.5 text-black" />
                <span>Download .ipynb</span>
              </button>
            </>
          )}

          <button
            onClick={fetchNotebook}
            disabled={loading}
            className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 rounded-lg transition cursor-pointer border border-transparent hover:border-zinc-900"
            title="Re-generate Notebook"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-fuchsia-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-2 border-zinc-905 border-t-fuchsia-500 rounded-full animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-fuchsia-400 animate-pulse" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-zinc-200 animate-pulse">
              {loadingMessage}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">
              Structuring Kaggle-ready ML modeling matrices
            </p>
          </div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-950/10 border border-red-950 rounded-xl flex items-start gap-3">
          <Info className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-200">
              {error}
            </p>
            <button
              onClick={fetchNotebook}
              className="text-xs font-bold text-fuchsia-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Retry notebook generation
            </button>
          </div>
        </div>
      ) : notebookData ? (
        <div className="space-y-6 mt-4">
          {/* Quick Specifications Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-zinc-900/10 rounded-xl border border-zinc-900">
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550 block font-bold">
                Inferred Target
              </span>
              <p className="text-xs font-mono font-bold text-zinc-200 truncate">
                {detectedTarget}
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550 block font-bold">
                Total Cells
              </span>
              <p className="text-xs font-mono text-zinc-200">
                {notebookData.cells.length} blocks ({notebookData.cells.filter(c => c.cell_type === "code").length} code)
              </p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] uppercase font-mono tracking-widest text-zinc-550 block font-bold">
                Framework Targets
              </span>
              <p className="text-xs font-mono text-zinc-200">
                Pandas, Scikit-Learn, XGBoost
              </p>
            </div>
          </div>

          {/* Interactive Jupyter Notebook Cells */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500">
                Jupyter Cell Streams
              </h4>
              <span className="text-[9px] text-zinc-650 font-mono">
                Click headers to collapse/expand cell parameters
              </span>
            </div>

            <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
              {notebookData.cells.map((cell, index) => {
                const isExpanded = expandedCellIndex === index;
                const isCode = cell.cell_type === "code";
                const codeSnippet = cell.source.slice(0, 2).join("");

                return (
                  <div 
                    key={index}
                    className={`rounded-xl border transition overflow-hidden ${
                      isExpanded 
                        ? "border-zinc-800 bg-zinc-950/90 shadow-2xl" 
                        : "border-zinc-900 bg-zinc-950/20 hover:border-zinc-800"
                    }`}
                  >
                    {/* Cell Title / Header */}
                    <div 
                      onClick={() => setExpandedCellIndex(isExpanded ? null : index)}
                      className={`flex items-center justify-between p-3 cursor-pointer select-none transition ${
                        isExpanded 
                          ? "bg-zinc-900/60" 
                          : "bg-transparent hover:bg-zinc-900/10"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Jupyter In/Out Label */}
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0 select-none">
                          {isCode ? `In [${index + 1}]:` : `[Markdown]` }
                        </span>
                        
                        <div className="truncate text-xs text-zinc-300 font-medium">
                          {isCode ? (
                            <span className="font-mono text-fuchsia-400 truncate">
                              {codeSnippet.substring(0, 60)}{codeSnippet.length > 60 ? "..." : ""}
                            </span>
                          ) : (
                            <span className="text-zinc-200 truncate">
                              {cell.source[0]?.replace(/^#+\s*/, "") || "Markdown Documentation"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyCellCode(cell.source, index);
                          }}
                          className="p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/80 rounded transition cursor-pointer"
                          title="Copy cell content"
                        >
                          {copiedCellIndex === index ? (
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>

                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-zinc-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-zinc-500" />
                        )}
                      </div>
                    </div>

                    {/* Cell Expansion Body */}
                    {isExpanded && (
                      <div className="border-t border-zinc-900 bg-black/90">
                        {isCode ? (
                          <div className="relative">
                            <pre className="p-4 text-zinc-300 font-mono text-xs overflow-x-auto leading-relaxed max-h-[280px]">
                              <code>{cell.source.join("")}</code>
                            </pre>
                            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-widest font-mono bg-zinc-900 text-zinc-500 border border-zinc-800">
                              python3
                            </span>
                          </div>
                        ) : (
                          <div className="p-4 text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap">
                            {cell.source.join("")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Callouts */}
          <div className="p-4 rounded-xl bg-zinc-900/15 border border-zinc-900 flex items-start gap-3">
            <Info className="h-5 w-5 text-fuchsia-400 mt-0.5 shrink-0" />
            <div className="space-y-1 text-xs">
              <h5 className="font-bold text-zinc-200 font-mono uppercase tracking-wider text-[10px]">
                JUPYTER DISPATCH DISCOURSE
              </h5>
              <p className="text-zinc-400 leading-relaxed">
                Download the completed `.ipynb` layout above. Disembark to your <a href="https://www.kaggle.com/code" target="_blank" rel="noopener noreferrer" className="font-semibold underline text-fuchsia-450 hover:text-fuchsia-400">Kaggle Notebooks Dashboard</a>, select <strong>"New Notebook"</strong>, click <strong>File &gt; Import Notebook</strong> and ingest the layout instantly.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center border border-dashed border-zinc-850 rounded-2xl bg-zinc-950/20">
          <BookOpen className="h-10 w-10 text-zinc-700" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-zinc-300">
              No Notebook Drafted
            </p>
            <p className="text-xs text-zinc-500">
              Trigger notebook compilation to build a robust Kaggle-ready ML pipeline.
            </p>
          </div>
          <button
            onClick={fetchNotebook}
            className="px-4 py-2 text-xs font-bold text-white bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl shadow-lg transition cursor-pointer"
          >
            Draft Kaggle Notebook
          </button>
        </div>
      )}
    </div>
  );
}
