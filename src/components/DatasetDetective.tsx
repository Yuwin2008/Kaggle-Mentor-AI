import { useState } from "react";
import { DatasetOverview } from "../types";
import {
  Search,
  AlertTriangle,
  Fingerprint,
  Database,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye
} from "lucide-react";

interface DatasetDetectiveProps {
  overview: DatasetOverview;
}

export default function DatasetDetective({ overview }: DatasetDetectiveProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "numeric" | "string">("all");
  const [expandedCol, setExpandedCol] = useState<string | null>(null);

  // 1. Gather stats
  const totalRows = overview.rowCount;
  const totalCols = overview.colCount;
  
  // 2. Detect missing values
  const columnsWithMissing = overview.columnStats.filter((c) => c.missingCount > 0);
  const totalMissingCells = overview.columnStats.reduce((sum, c) => sum + c.missingCount, 0);
  const totalCells = totalRows * totalCols;
  const missingRatio = ((totalMissingCells / (totalCells || 1)) * 100).toFixed(2);

  // 3. Detect categorical (string) columns
  const categoricalCols = overview.columnStats.filter((c) => c.type === "string");
  const numericCols = overview.columnStats.filter((c) => c.type === "numeric");

  // 4. Detective logic classifications
  const dataDensity = totalMissingCells === 0 ? "Prism-Perfect (100% complete)" : `Sparse (${missingRatio}% missing)`;
  const primaryAttributeType = categoricalCols.length >= numericCols.length ? "Categorical Heavy" : "Numerical Dense";

  // Filter columns based on search and type filters
  const filteredCols = overview.columnStats.filter((col) => {
    const matchesSearch = col.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || col.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 p-6 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="dataset-detective-agent">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Header Profile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-900/80 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-850 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0">
            <Search className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
              <span>Dataset Detective Agent</span>
              <span className="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                Telemetry Scan
              </span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Automated structural sweeps, outlier profiling, and datatype classification intelligence.
            </p>
          </div>
        </div>

        {/* Audit Status pill */}
        <div className="self-start sm:self-auto flex items-center gap-2 px-3 py-1 bg-zinc-900/40 border border-zinc-850 rounded-lg text-[10px] font-mono text-zinc-400">
          <Fingerprint className="h-3.5 w-3.5 text-zinc-500" />
          <span>UUID: SECURE</span>
        </div>
      </div>

      {/* Detective Diagnosis Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {/* Card 1: Row Diagnostics */}
        <div className="bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/20 transition-all">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-550 font-bold uppercase tracking-widest">
              Telemetry 01 // Rows
            </div>
            <h4 className="text-2xl font-extrabold tracking-tight text-white font-mono">
              {totalRows.toLocaleString()}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 font-mono">Row Cardinality</p>
          </div>
          <p className="text-[11px] text-zinc-555 mt-3 leading-relaxed border-t border-zinc-900/40 pt-2">
            Successfully parsed {totalRows} indices. Represents a <span className="text-zinc-300 font-medium">{totalRows > 1000 ? "High-Capacity" : "Compact Sample"}</span> spreadsheet.
          </p>
        </div>

        {/* Card 2: Column Count */}
        <div className="bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/20 transition-all">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-555 font-bold uppercase tracking-widest">
              Telemetry 02 // Fields
            </div>
            <h4 className="text-2xl font-extrabold tracking-tight text-white font-mono">
              {totalCols.toLocaleString()}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 font-mono">Column Dimensions</p>
          </div>
          <p className="text-[11px] text-zinc-555 mt-3 leading-relaxed border-t border-zinc-900/40 pt-2 truncate">
            Headers: {overview.headers.slice(0, 2).map(h => `"${h}"`).join(", ")}
            {totalCols > 2 && "..."}
          </p>
        </div>

        {/* Card 3: Missing Value Diagnostic */}
        <div className="bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/20 transition-all">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-555 font-bold uppercase tracking-widest">
              Telemetry 03 // Quality
            </div>
            <div className="flex items-baseline space-x-1.5">
              <h4 className="text-2xl font-extrabold tracking-tight text-white font-mono">
                {totalMissingCells}
              </h4>
              <span className="text-[10px] font-mono text-zinc-500">({missingRatio}%)</span>
            </div>
            <p className="text-[10px] font-bold text-zinc-400 font-mono">Null Entries</p>
          </div>
          <div className="text-[11px] text-zinc-500 mt-3 leading-relaxed border-t border-zinc-900/40 pt-2">
            {columnsWithMissing.length > 0 ? (
              <span className="truncate block">
                Warning in: <span className="font-mono text-amber-500">{columnsWithMissing.map(c => c.name).slice(0, 2).join(", ")}</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 shrink-0" /> Pristine completeness.
              </span>
            )}
          </div>
        </div>

        {/* Card 4: Categorical Columns Classifier */}
        <div className="bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between hover:border-zinc-800 hover:bg-zinc-900/20 transition-all">
          <div className="space-y-1">
            <div className="text-[9px] font-mono text-zinc-555 font-bold uppercase tracking-widest">
              Telemetry 04 // Type
            </div>
            <h4 className="text-2xl font-extrabold tracking-tight text-white font-mono">
              {categoricalCols.length}
            </h4>
            <p className="text-[10px] font-bold text-zinc-400 font-mono">Categorical Tags</p>
          </div>
          <p className="text-[11px] text-zinc-555 mt-3 leading-relaxed border-t border-zinc-900/40 pt-2 truncate">
            {categoricalCols.length > 0 ? (
              <span>
                Pivots like: <span className="text-zinc-300">"{categoricalCols[0].name}"</span>.
              </span>
            ) : (
              <span>Pure continuous float space.</span>
            )}
          </p>
        </div>
      </div>

      {/* Detective's Quick Insights Box */}
      <div className="mt-5 p-4 rounded-xl bg-zinc-900/40 border border-zinc-900 flex items-start space-x-3 text-xs leading-relaxed text-zinc-400">
        <Sparkles className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <span className="font-bold text-zinc-200 block uppercase tracking-wider text-[10px] font-mono mb-0.5">
            DETECTIVE RECONNAISSANCE VERDICT
          </span>
          <p>
            Structure identified as a <strong className="text-zinc-100 font-semibold">{primaryAttributeType}</strong> architecture. Overall index rating is <strong className="text-emerald-400 font-semibold">{dataDensity}</strong>.
            {categoricalCols.length > 0 && ` Continuous distribution is optimally partitioned by categorical pivot identifier "${categoricalCols[0].name}".`}
          </p>
        </div>
      </div>

      {/* Interactive Metadata Records Directory */}
      <div className="mt-8 pt-6 border-t border-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-xs font-bold font-mono text-zinc-350 uppercase tracking-widest flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-zinc-400" />
              <span>Attributes Schema & Metadata Catalog</span>
            </h4>
            <p className="text-[11px] text-zinc-550 mt-0.5">
              Explore structural footprints, null distributions, and value profiles for all attributes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3 w-3 text-zinc-550" />
              <input
                type="text"
                placeholder="Filter attributes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-xs bg-zinc-950 border border-zinc-850 rounded-lg pl-8 pr-3 py-1.5 w-full sm:w-44 focus:outline-none focus:ring-1 focus:ring-zinc-800 text-zinc-200 placeholder-zinc-650"
              />
            </div>

            {/* Type Filtering Selector */}
            <div className="flex bg-zinc-900/40 border border-zinc-850 rounded-lg p-0.5">
              {(["all", "numeric", "string"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 text-[10px] font-mono rounded font-semibold transition cursor-pointer capitalize ${
                    typeFilter === t
                      ? "bg-zinc-800 text-zinc-200"
                      : "text-zinc-550 hover:text-zinc-350"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog List */}
        <div className="bg-zinc-950/20 border border-zinc-900 rounded-xl overflow-hidden divide-y divide-zinc-900/80">
          {filteredCols.length > 0 ? (
            filteredCols.map((col) => {
              const isExpanded = expandedCol === col.name;
              const completenessPct = ((1 - col.missingCount / totalRows) * 100).toFixed(1);
              const isFullyComplete = col.missingCount === 0;

              return (
                <div key={col.name} className="transition-colors hover:bg-zinc-900/5">
                  {/* Summary Row */}
                  <div
                    onClick={() => setExpandedCol(isExpanded ? null : col.name)}
                    className="flex flex-col md:flex-row md:items-center justify-between p-4 cursor-pointer gap-4 select-none"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="text-zinc-600">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="font-mono text-xs font-bold text-zinc-200 block truncate" title={col.name}>
                          {col.name}
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider ${
                            col.type === "numeric"
                              ? "bg-emerald-950/30 border border-emerald-900/40 text-emerald-400"
                              : "bg-fuchsia-955/30 border border-fuchsia-900/40 text-fuchsia-400"
                          }`}>
                            {col.type}
                          </span>
                          <span className={`text-[10px] font-mono ${isFullyComplete ? "text-emerald-500" : "text-amber-500"}`}>
                            {completenessPct}% Dense
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-450 md:text-right font-mono">
                      <div className="min-w-[120px]">
                        <span className="text-[9px] text-zinc-550 block uppercase tracking-wider">Distinct Range</span>
                        <span className="text-zinc-300 font-semibold truncate block">
                          {col.type === "numeric" ? (
                            `[${col.min} to ${col.max}]`
                          ) : (
                            `${col.uniqueCount} distinct keys`
                          )}
                        </span>
                      </div>

                      <div className="min-w-[120px] hidden sm:block">
                        <span className="text-[9px] text-zinc-555 block uppercase tracking-wider">Metrics</span>
                        <span className="text-zinc-300 font-semibold truncate block">
                          {col.type === "numeric" ? (
                            `Mean: ${col.avg}`
                          ) : (
                            `Top: ${col.topCategories?.[0]?.category || "N/A"}`
                          )}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1.5 text-zinc-500 hover:text-zinc-355 transition-colors">
                        <Eye className="h-3.5 w-3.5" />
                        <span className="text-[10px]">Inspect</span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content Drawer */}
                  {isExpanded && (
                    <div className="px-11 pb-4 pt-1 border-t border-zinc-900/60 bg-zinc-900/10 space-y-4">
                      {/* Sub-grid: Stats & Profile */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3">
                        {/* Profile Info */}
                        <div className="space-y-2">
                          <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Attribute Footprint</span>
                          <div className="bg-zinc-950/30 border border-zinc-900 rounded-lg p-3 space-y-1.5 text-[11px] font-mono">
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Completeness:</span>
                              <span className={isFullyComplete ? "text-emerald-400" : "text-amber-400"}>
                                {completenessPct}% ({totalRows - col.missingCount}/{totalRows} non-null)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-zinc-500">Missing/Null Count:</span>
                              <span className={isFullyComplete ? "text-zinc-400" : "text-amber-400"}>
                                {col.missingCount}
                              </span>
                            </div>
                            {col.type === "numeric" ? (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Aggregate Sum:</span>
                                  <span className="text-zinc-300 truncate max-w-[100px]">{col.sum?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-zinc-500">Average/Mean:</span>
                                  <span className="text-zinc-300">{col.avg}</span>
                                </div>
                              </>
                            ) : (
                              <div className="flex justify-between">
                                <span className="text-zinc-500">Distinct Categories:</span>
                                <span className="text-zinc-300">{col.uniqueCount}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Sample Values */}
                        <div className="space-y-2 md:col-span-2">
                          <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Telemetry Sample Sequence</span>
                          <div className="bg-zinc-950/30 border border-zinc-900 rounded-lg p-3 min-h-[74px] flex flex-wrap gap-1.5 items-center">
                            {col.sampleValues && col.sampleValues.length > 0 ? (
                              col.sampleValues.slice(0, 12).map((val, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-zinc-900/60 border border-zinc-850 rounded text-[10px] font-mono text-zinc-300 max-w-[150px] truncate"
                                  title={val}
                                >
                                  {val === "" ? <span className="text-zinc-650 italic">empty</span> : val}
                                </span>
                              ))
                            ) : (
                              <span className="text-zinc-600 text-xs font-mono">No sequence data compiled.</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Distribution profile */}
                      <div className="border-t border-zinc-900/40 pt-3">
                        {col.type === "numeric" && col.distribution && col.distribution.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Distribution Density Map</span>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                              {col.distribution.map((bin, idx) => {
                                const maxCount = Math.max(...col.distribution!.map(b => b.count)) || 1;
                                const barPercent = ((bin.count / maxCount) * 100).toFixed(0);
                                return (
                                  <div key={idx} className="bg-zinc-900/20 border border-zinc-900/60 rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                      <span className="truncate max-w-[80px]" title={bin.label}>{bin.label}</span>
                                      <span className="text-zinc-300 font-semibold">{bin.count}</span>
                                    </div>
                                    <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-emerald-500 rounded-full"
                                        style={{ width: `${barPercent}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : col.type === "string" && col.topCategories && col.topCategories.length > 0 ? (
                          <div className="space-y-2">
                            <span className="text-[9px] font-mono text-zinc-555 uppercase tracking-wider block font-bold">Leading Cardinal Classes</span>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              {col.topCategories.map((cat, idx) => {
                                const totalCatCount = col.topCategories!.reduce((acc, curr) => acc + curr.count, 0) || 1;
                                const pct = ((cat.count / totalCatCount) * 100).toFixed(0);
                                return (
                                  <div key={idx} className="bg-zinc-900/20 border border-zinc-900/60 rounded-lg p-2.5 space-y-1.5">
                                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                      <span className="truncate max-w-[90px]" title={cat.category || "Null/Empty"}>
                                        {cat.category || <span className="text-zinc-650 italic">Null/Empty</span>}
                                      </span>
                                      <span className="text-zinc-300 font-semibold">{cat.count}</span>
                                    </div>
                                    <div className="h-1 bg-zinc-950 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-fuchsia-500 rounded-full"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <span className="text-[8px] font-mono text-zinc-600 block text-right">{pct}% of sample</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs font-mono text-zinc-600">
              No attributes match the query or filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
