import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface PreviewTableProps {
  headers: string[];
  rows: any[];
  fileName: string;
}

export default function PreviewTable({ headers, rows, fileName }: PreviewTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  
  const itemsPerPage = 8;

  // Filter rows based on search term
  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    return rows.filter((row) =>
      headers.some((header) => {
        const val = String(row[header] || "").toLowerCase();
        return val.includes(searchTerm.toLowerCase());
      })
    );
  }, [rows, headers, searchTerm]);

  // Sort rows based on selection
  const sortedRows = useMemo(() => {
    const sortableItems = [...filteredRows];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        // Try parsing numbers
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
        }

        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        if (aStr < bStr) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRows, sortConfig]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedRows.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedRows, currentPage]);

  const totalPages = Math.ceil(sortedRows.length / itemsPerPage) || 1;

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    setCurrentPage(1);
  };

  const downloadProcessedCSV = () => {
    // Generate CSV string from the parsed rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => headers.map(h => {
        const field = String(row[h] || "");
        return field.includes(",") ? `"${field.replace(/"/g, '""')}"` : field;
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `analysis_${fileName || "dataset.csv"}`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-zinc-950/45 border border-zinc-900 rounded-2xl relative overflow-hidden backdrop-blur-sm" id="preview-table-container">
      {/* Decorative top gradient line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* Table Action bar */}
      <div className="p-5 border-b border-zinc-900/85 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-zinc-900/10">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
            <span>Data Preview Matrix</span>
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-850 text-zinc-400">
              Grid rows
            </span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            Interactive tabular grid showing sample dataset items.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search sample rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="text-xs bg-zinc-950 border border-zinc-850 rounded-lg pl-9 pr-4 py-2 w-full sm:w-56 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-zinc-100 placeholder-zinc-600"
            />
          </div>

          {/* Export Button */}
          <button
            onClick={downloadProcessedCSV}
            className="inline-flex items-center space-x-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 rounded-lg border border-zinc-800 font-medium transition-colors cursor-pointer hover:text-white"
            title="Download formatted dataset copy"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Actual Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-900 bg-zinc-950/40 text-[9px] font-mono uppercase tracking-wider text-zinc-500">
              <th className="py-3 px-4 font-semibold text-center w-12">#</th>
              {headers.map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="py-3 px-4 font-semibold cursor-pointer select-none hover:text-zinc-200 transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>{header}</span>
                    {sortConfig?.key === header && (
                      <span className="text-zinc-300 font-bold font-mono">
                        {sortConfig.direction === "asc" ? " ↑" : " ↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/60 text-xs font-normal">
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, idx) => (
                <tr
                  key={row._rowId || idx}
                  className="hover:bg-zinc-900/20 transition-colors text-zinc-300"
                >
                  <td className="py-2.5 px-4 text-center font-mono text-[10px] text-zinc-600 bg-zinc-950/20">
                    {row._rowId}
                  </td>
                  {headers.map((header) => (
                    <td key={header} className="py-2.5 px-4 truncate max-w-[200px] text-zinc-350" title={row[header]}>
                      {row[header] !== undefined && row[header] !== null ? String(row[header]) : "-"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 1} className="py-8 text-center text-zinc-500 font-mono text-xs">
                  No records match search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-zinc-900/80 flex items-center justify-between text-xs text-zinc-550 bg-zinc-900/10">
          <div>
            Showing <span className="font-semibold text-zinc-350">
              {((currentPage - 1) * itemsPerPage) + 1}
            </span> to <span className="font-semibold text-zinc-350">
              {Math.min(currentPage * itemsPerPage, sortedRows.length)}
            </span> of <span className="font-semibold text-zinc-350">{sortedRows.length}</span> entries
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-950 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-zinc-400">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-950 disabled:opacity-30 disabled:pointer-events-none hover:bg-zinc-900 text-zinc-400 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
