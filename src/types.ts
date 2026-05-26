export interface SpreadsheetFile {
  id: string;
  name: string;
  size: number;
  headers: string[];
  rows: any[][]; // Raw array of row items
  type: 'mother' | 'child';
}

export interface ComparisonConfig {
  keyCol1Index: number; // Index of Column B (default 1)
  keyCol2Index: number; // Index of Column H (default 7)
}

export interface MissingItem {
  id: string;
  key: string;
  col1Value: string; // Col B value
  col2Value: string; // Col H value
  col3Value?: string; // Col J value
  rowValues: any[]; // The full row array
  sourceFile: string;
  isDuplicateHJ?: boolean;
}

export interface CompareSummary {
  motherUniqueCount: number;
  childTotalProcessed: number;
  newItems: MissingItem[];
  commonItemsCount: number;
}

export interface MotherUpdateChange {
  rowIndex: number;
  partNumber: string;
  fabricante: string;
  oldValue: string;
  newValue: string;
}
