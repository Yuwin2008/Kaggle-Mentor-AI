export interface DistributionBin {
  label: string;
  count: number;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface ColumnStat {
  name: string;
  type: "numeric" | "string";
  missingCount: number;
  sampleValues: string[];
  // Numeric-specific elements
  min?: number;
  max?: number;
  avg?: number;
  sum?: number;
  distribution?: DistributionBin[];
  // String-specific elements
  uniqueCount?: number;
  topCategories?: CategoryCount[];
}

export interface AISynthesis {
  summary: string;
  keyInsights: string[];
  potentialAnomalies: string[];
  suggestedQuestions: string[];
}

export interface DatasetOverview {
  fileName: string;
  rowCount: number;
  colCount: number;
  headers: string[];
  columnStats: ColumnStat[];
  previewRows: any[];
  aiSynthesis: AISynthesis;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}
