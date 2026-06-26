import { useState } from "react";
import { DatasetOverview, ColumnStat } from "../types";
import {
  FileText,
  Hash,
  Columns,
  Sparkles,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  BarChart2,
  ListFilter
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

interface DatasetSummaryProps {
  overview: DatasetOverview;
  onAskQuestion: (question: string) => void;
}

// Gorgeous dark neon colors: fuchsia, emerald, violet, sky, indigo, pink
const COLORS = ["#d946ef", "#10b981", "#8b5cf6", "#0ea5e9", "#6366f1", "#ec4899", "#14b8a6", "#f59e0b"];

export default function DatasetSummary({ overview, onAskQuestion }: DatasetSummaryProps) {
  const [activeTab, setActiveTab] = useState<"summary" | "insights" | "attributes">("summary");
  const [selectedColumn, setSelectedColumn] = useState<string>(overview.headers[0] || "");

  const activeColStat = overview.columnStats.find(c => c.name === selectedColumn);

  return (
    <div className="space-y-6" id="dataset-summary-dashboard">
      {/* Overview Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rows */}
        <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-widest">Total Rows</span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
              {overview.rowCount.toLocaleString()}
            </p>
            <div className="text-[10px] text-emerald-400 font-mono mt-1 font-semibold flex items-center gap-1">
              <span>● Complete Grounded</span>
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-widest">Attributes</span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
              {overview.colCount.toLocaleString()}
            </p>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">Categorical & Numeric</div>
          </div>
        </div>

        {/* Total Cells */}
        <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-widest">Grid Elements</span>
          <div className="mt-4">
            <p className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
              {(overview.rowCount * overview.colCount).toLocaleString()}
            </p>
            <div className="text-[10px] text-zinc-500 font-mono mt-1">Cell matrices loaded</div>
          </div>
        </div>

        {/* Missing Values */}
        {(() => {
          const totalMissing = overview.columnStats.reduce((acc, curr) => acc + curr.missingCount, 0);
          const percentMissing = ((totalMissing / ((overview.rowCount * overview.colCount) || 1)) * 100).toFixed(1);
          const hasAnomalies = Number(percentMissing) > 0;
          return (
            <div className="bg-zinc-950/45 border border-zinc-900 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-sm">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
              <span className="text-[10px] font-mono font-bold text-zinc-550 uppercase tracking-widest">Schema Density</span>
              <div className="mt-4">
                <p className="text-3xl font-bold text-zinc-100 font-mono tracking-tight">
                  {percentMissing === "0.0" ? "100%" : `${(100 - Number(percentMissing)).toFixed(1)}%`}
                </p>
                <div className={`text-[10px] font-mono mt-1 font-semibold ${hasAnomalies ? "text-amber-400" : "text-emerald-450"}`}>
                  {percentMissing}% missing values
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Main Analysis Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Summary Tabs */}
        <div className="lg:col-span-2 bg-zinc-950/45 rounded-2xl border border-zinc-900 overflow-hidden flex flex-col min-h-[480px] relative backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          {/* Tabs Navigation */}
          <div className="flex border-b border-zinc-900 bg-zinc-900/10">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-tight border-b-2 px-4 transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "summary"
                  ? "border-emerald-500 text-emerald-400 bg-zinc-950/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span>Executive Summary</span>
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-tight border-b-2 px-4 transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "insights"
                  ? "border-emerald-500 text-emerald-400 bg-zinc-950/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Lightbulb className="h-4 w-4 shrink-0" />
              <span>Key Insights</span>
            </button>
            <button
              onClick={() => setActiveTab("attributes")}
              className={`flex-1 py-3 text-xs font-mono font-bold tracking-tight border-b-2 px-4 transition-colors flex items-center justify-center space-x-2 cursor-pointer ${
                activeTab === "attributes"
                  ? "border-emerald-500 text-emerald-400 bg-zinc-950/30"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <BarChart2 className="h-4 w-4 shrink-0" />
              <span>Attributes Schema</span>
            </button>
          </div>

          {/* Tabs Content */}
          <div className="p-6 flex-1 flex flex-col justify-between">
            {activeTab === "summary" && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">Expert AI Synthesis</h4>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    {overview.aiSynthesis.summary}
                  </p>
                </div>

                <div className="border-t border-zinc-900 pt-4">
                  <h4 className="text-[10px] font-mono text-zinc-550 uppercase tracking-widest mb-2.5 flex items-center space-x-1.5 font-bold">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span>Potential Anomalies & Quality Warnings</span>
                  </h4>
                  <ul className="space-y-2">
                    {overview.aiSynthesis.potentialAnomalies.map((anomaly, idx) => (
                      <li key={idx} className="text-xs text-zinc-400 flex items-start space-x-2">
                        <span className="text-amber-550 font-bold shrink-0">•</span>
                        <span>{anomaly}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2 font-bold">Automated Discovery Discoveries</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {overview.aiSynthesis.keyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="bg-zinc-900/10 p-4 rounded-xl border border-zinc-900 flex items-start space-x-3 hover:border-zinc-800 transition"
                    >
                      <CheckCircle className="h-4 w-4 text-emerald-450 mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-zinc-200">Insight #{idx + 1}</span>
                        <p className="text-xs text-zinc-450 leading-relaxed font-normal">{insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "attributes" && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 font-bold">Quality Profile & Features Checklist</h4>
                <div className="overflow-x-auto max-h-[280px] overflow-y-auto pr-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[9px] font-mono uppercase text-zinc-550 pb-2">
                        <th className="py-2">Attribute</th>
                        <th className="py-2">Type</th>
                        <th className="py-2 text-right">Null/Empty</th>
                        <th className="py-2 text-right">Profile Detail</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/60 text-xs">
                      {overview.columnStats.map((col, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/10 text-zinc-300">
                          <td className="py-2 font-mono font-semibold text-zinc-200">{col.name}</td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold ${
                              col.type === "numeric"
                                ? "bg-emerald-950/30 border border-emerald-900/40 text-emerald-400"
                                : "bg-fuchsia-955/30 border border-fuchsia-900/40 text-fuchsia-400"
                            }`}>
                              {col.type}
                            </span>
                          </td>
                          <td className="py-2 text-right font-mono text-zinc-500 text-[11px]">
                            {col.missingCount.toLocaleString()} ({((col.missingCount / overview.rowCount) * 100).toFixed(1)}%)
                          </td>
                          <td className="py-2 text-right font-mono text-zinc-400 text-[11px]">
                            {col.type === "numeric" ? `Range: [${col.min} - ${col.max}]` : `${col.uniqueCount} uniques`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Quick Suggestions Chips */}
            <div className="border-t border-zinc-900/80 pt-4 mt-6">
              <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 block mb-2 font-bold">Prompt Directives (Ask Co-pilot)</span>
              <div className="flex flex-wrap gap-2">
                {overview.aiSynthesis.suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAskQuestion(q)}
                    className="text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-850 hover:border-zinc-700 text-left transition-colors cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Column Explorer & Plots */}
        <div className="bg-zinc-950/45 p-6 rounded-2xl border border-zinc-900 flex flex-col justify-between relative backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-1.5">
                <BarChart2 className="h-4 w-4 text-zinc-400" />
                <span>Attribute Explorer</span>
              </h3>
              <div className="flex items-center space-x-1">
                <ListFilter className="h-3.5 w-3.5 text-zinc-500" />
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="text-xs border border-zinc-850 bg-zinc-950 text-zinc-300 rounded-md py-1 px-2 focus:ring-1 focus:ring-zinc-700 cursor-pointer"
                >
                  {overview.headers.map((h, idx) => (
                    <option key={idx} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            </div>

            <p className="text-zinc-500 text-xs mb-4 leading-relaxed">
              Analyze mathematical distributions and attributes. Selected attribute: <strong className="font-mono text-zinc-300 font-semibold">{selectedColumn}</strong>
            </p>
          </div>

          <div className="flex-1 flex flex-col justify-center min-h-[220px]">
            {activeColStat ? (
              <div className="space-y-4">
                {activeColStat.type === "numeric" ? (
                  <>
                    {/* Numeric stats list */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-b border-zinc-900 pb-3">
                      <div className="bg-zinc-900/30 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-500 text-[9px] block uppercase tracking-wider">Average</span>
                        <div className="font-bold text-zinc-200 text-xs mt-0.5">{activeColStat.avg}</div>
                      </div>
                      <div className="bg-zinc-900/30 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-500 text-[9px] block uppercase tracking-wider">Sum</span>
                        <div className="font-bold text-zinc-200 text-xs mt-0.5 truncate">{activeColStat.sum?.toLocaleString()}</div>
                      </div>
                      <div className="bg-zinc-900/30 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-500 text-[9px] block uppercase tracking-wider">Min</span>
                        <div className="font-bold text-zinc-200 text-xs mt-0.5">{activeColStat.min}</div>
                      </div>
                      <div className="bg-zinc-900/30 p-2 rounded border border-zinc-900">
                        <span className="text-zinc-500 text-[9px] block uppercase tracking-wider">Max</span>
                        <div className="font-bold text-zinc-200 text-xs mt-0.5">{activeColStat.max}</div>
                      </div>
                    </div>

                    {/* Chart list */}
                    {activeColStat.distribution && activeColStat.distribution.length > 0 ? (
                      <div>
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-550 block mb-2 font-bold">Distribution Density Graph</span>
                        <div className="h-44 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={activeColStat.distribution}>
                              <XAxis dataKey="label" stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                              <YAxis stroke="#52525b" fontSize={9} tickLine={false} axisLine={false} />
                              <Tooltip
                                contentStyle={{
                                  background: "#09090b",
                                  border: "1px solid #27272a",
                                  borderRadius: "8px",
                                  fontSize: "10px",
                                  color: "#f4f4f5",
                                }}
                              />
                              <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                                {activeColStat.distribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index === 2 ? "#d946ef" : "#8b5cf6"} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-zinc-600 py-6 font-mono">No distribution data compiled.</div>
                    )}
                  </>
                ) : (
                  <>
                    {/* String unique counts */}
                    <div className="bg-zinc-900/35 border border-zinc-900 p-3 rounded-lg text-xs font-mono mb-2 flex justify-between items-center">
                      <div>
                        <span className="text-zinc-500 text-[9px] block uppercase tracking-wider">Unique Classes</span>
                        <div className="font-bold text-zinc-200 text-sm mt-0.5">{activeColStat.uniqueCount}</div>
                      </div>
                      <div>
                        <span className="text-zinc-550 text-[9px] block text-right uppercase tracking-wider">Class Stability</span>
                        <div className="font-semibold text-emerald-400 mt-0.5">Steady</div>
                      </div>
                    </div>

                    {/* Category top distributions charting */}
                    {activeColStat.topCategories && activeColStat.topCategories.length > 0 ? (
                      <div className="space-y-3">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-550 block font-bold">Top Attribute Classes</span>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                          {/* Recharts Pie */}
                          <div className="h-28 w-full flex justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={activeColStat.topCategories}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={25}
                                  outerRadius={45}
                                  paddingAngle={3}
                                  dataKey="count"
                                >
                                  {activeColStat.topCategories.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip
                                  contentStyle={{
                                    background: "#09090b",
                                    border: "1px solid #27272a",
                                    borderRadius: "8px",
                                    fontSize: "10px",
                                    color: "#f4f4f5",
                                  }}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Legend values bar progress */}
                          <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                            {activeColStat.topCategories.slice(0, 4).map((tc, tcIdx) => {
                              const totalCount = activeColStat.topCategories!.reduce((acc, curr) => acc + curr.count, 0) || 1;
                              const pct = ((tc.count / totalCount) * 100).toFixed(0);
                              return (
                                <div key={tcIdx} className="text-[10px] space-y-0.5">
                                  <div className="flex justify-between font-mono text-zinc-500">
                                    <span className="truncate max-w-[90px] text-zinc-400" title={tc.category}>{tc.category || "Empty/Null"}</span>
                                    <span>{tc.count} ({pct}%)</span>
                                  </div>
                                  <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${pct}%`,
                                        backgroundColor: COLORS[tcIdx % COLORS.length],
                                      }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center text-xs text-zinc-600 py-6 font-mono">No frequency metrics detected.</div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-zinc-600 py-6 font-mono">Select attribute target to profile statistics.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
