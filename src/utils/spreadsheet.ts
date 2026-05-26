import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { SpreadsheetFile, MotherUpdateChange } from '../types';

/**
 * Converts a 0-based column index to Excel column name (e.g. 0 -> A, 1 -> B, 25 -> Z, 26 -> AA)
 */
export function getColumnLetter(colIndex: number): string {
  let letter = '';
  let temp = colIndex;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter || 'A';
}

/**
 * Parses anuploaded Excel (.xlsx, .xls) or CSV file into a standard component-friendly structure.
 */
export function parseSpreadsheet(file: File): Promise<{ headers: string[]; rows: any[][] }> {
  return new Promise((resolve, reject) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      // For CSV, let's read as text. We first try UTF-8, then fall back to ISO-8859-1 if characters look blocky.
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: false,
          skipEmptyLines: 'greedy',
          complete: (results) => {
            const data = results.data as any[][];
            if (data.length === 0) {
              resolve({ headers: [], rows: [] });
              return;
            }
            // Use first row as headers representation (or safe labels)
            const headers = data[0].map((val, idx) => String(val || '').trim() || `Coluna ${getColumnLetter(idx)}`);
            resolve({
              headers,
              rows: data
            });
          },
          error: (err) => {
            reject(err);
          }
        });
      };
      
      // Brazilian CSVs are often in ISO-8859-1 / Windows-1252
      reader.readAsText(file, 'UTF-8');
    } else {
      // Excel files
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Get raw rows
          const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (json.length === 0) {
            resolve({ headers: [], rows: [] });
            return;
          }

          // Generate friendly header names
          const maxCols = Math.max(...json.map(r => r.length), 0);
          const headers: string[] = [];
          for (let i = 0; i < maxCols; i++) {
            const cellVal = json[0] && json[0][i] !== undefined ? String(json[0][i]).trim() : '';
            headers.push(cellVal || `Coluna ${getColumnLetter(i)}`);
          }

          resolve({
            headers,
            rows: json
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

/**
 * Normalizes string values for accurate system matching.
 * Trims whitespace, lowercases, and removes extra spaces.
 */
export function normalizeValue(val: any): string {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Primary comparison engine.
 * Takes the mother spreadsheet and list of children files, returns the comparison summary.
 */
export function compareSpreadsheets(
  mother: SpreadsheetFile,
  children: SpreadsheetFile[],
  colIndex1: number, // e.g. B (index 1)
  colIndex2: number,  // e.g. H (index 7)
  colIndex3: number = 9 // e.g. J (index 9)
): {
  newItems: any[];
  commonItemsCount: number;
} {
  // 1. Create a set of composite keys from mother rows
  // Skip row 0 assuming it is the header, but let's be careful. Let's include all rows but ignore the header if it matches children header.
  // Actually, standardizing: let's build keys from all rows of Mother.
  const motherKeys = new Set<string>();
  
  // We will iterate through mother.rows. If the first row is a header, we can track it or not.
  // Generally, comparing values.
  const getRowKey = (row: any[]): string => {
    const val1 = normalizeValue(row[colIndex1]);
    const val2 = normalizeValue(row[colIndex2]);
    return `${val1}|||${val2}`;
  };

  // Add mother keys
  mother.rows.forEach((row, index) => {
    // Optional: skip header row if index === 0 and it has strings like "componente" / "nome"
    if (index === 0) {
      // We can inspect if it's header, let's keep it in the Set anyway to prevent header from being marked as difference
      const key = getRowKey(row);
      motherKeys.add(key);
      return;
    }
    const key = getRowKey(row);
    if (key && key !== '|||') {
      motherKeys.add(key);
    }
  });

  const newItems: any[] = [];
  let commonItemsCount = 0;
  
  // Set to track unique combination of Column H + Column J to identify duplicates
  const seenHJKeys = new Set<string>();

  children.forEach(child => {
    child.rows.forEach((row, rowIndex) => {
      // Skip child header row if it resembles standard labels
      if (rowIndex === 0) return;
      
      const val1 = normalizeValue(row[colIndex1]);
      const val2 = normalizeValue(row[colIndex2]);
      const val3 = normalizeValue(row[colIndex3]); // Column J (default index 9)
      const key = `${val1}|||${val2}`;

      // If key is empty, skip
      if (!val1 && !val2) return;

      if (motherKeys.has(key)) {
        commonItemsCount++;
      } else {
        // Normalizes values for the duplicates check
        const hjKey = `${val2}|||${val3}`;
        const isExplicitDuplicateColJ = val3.includes('duplicado') || val3 === 'dup' || val3 === 'repetido' || val3 === 'sim';
        
        let isDuplicateHJ = false;
        if (isExplicitDuplicateColJ) {
          isDuplicateHJ = true;
        } else if (val2 && val3) {
          if (seenHJKeys.has(hjKey)) {
            isDuplicateHJ = true;
          } else {
            seenHJKeys.add(hjKey);
          }
        }

        newItems.push({
          id: `${child.id}-${rowIndex}`,
          key,
          col1Value: row[colIndex1] !== undefined ? String(row[colIndex1]).trim() : '',
          col2Value: row[colIndex2] !== undefined ? String(row[colIndex2]).trim() : '',
          col3Value: row[colIndex3] !== undefined ? String(row[colIndex3]).trim() : '',
          rowValues: row,
          sourceFile: child.name,
          isDuplicateHJ // Flag for the UI
        });
      }
    });
  });

  return {
    newItems,
    commonItemsCount
  };
}

/**
 * Downloads a list of rows as a native .xlsx Microsoft Excel Spreadsheet files
 */
export function downloadNewItemsAsExcel(
  newItems: any[], 
  headers: string[], 
  fileName: string = 'novos_componentes.xlsx'
) {
  // Map raw Excel rows to write to spreadsheet
  const rows = newItems.map(item => item.rowValues);
  
  // Format matrix data [ [Headers], [Row 1], [Row 2], ... ]
  const rawData = [headers, ...rows];
  
  const worksheet = XLSX.utils.aoa_to_sheet(rawData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Novos Componentes');
  
  // Directly trigger client-side download
  XLSX.writeFile(workbook, fileName);
}

/**
 * Downloads a list of rows as a standard delimited UTF-8 CSV string
 */
export function downloadNewItemsAsCSV(
  newItems: any[], 
  headers: string[], 
  fileName: string = 'novos_componentes.csv'
) {
  const rows = newItems.map(item => item.rowValues);
  const rawData = [headers, ...rows];
  
  const csv = Papa.unparse(rawData);
  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csv], { type: 'text/csv;charset=utf-8;' }); // includes BOM for Excel UTF-8 support
  
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Updates the mother spreadsheet's column J with matching values (column J) from child sheets,
 * using combination of B + H as lookup key.
 */
export function updateMotherCodes(
  mother: SpreadsheetFile,
  children: SpreadsheetFile[],
  colIndex1: number, // Col B
  colIndex2: number, // Col H
  colIndex3: number  // Col J
): {
  updatedRows: any[][];
  changes: MotherUpdateChange[];
  matchCount: number;
  updateCount: number;
} {
  // Build lookup map of composite key (Col B + H) -> Col J value
  const childMap = new Map<string, string>();

  children.forEach(child => {
    child.rows.forEach((row, rowIndex) => {
      if (rowIndex === 0) return; // Skip header

      const val1 = normalizeValue(row[colIndex1]);
      const val2 = normalizeValue(row[colIndex2]);
      const val3 = row[colIndex3] !== undefined ? String(row[colIndex3]).trim() : '';

      const key = `${val1}|||${val2}`;
      if (key && key !== '|||' && val3) {
        // Direct assignment, newer/last files can overwrite or fill empty
        childMap.set(key, val3);
      }
    });
  });

  const updatedRows = mother.rows.map(row => [...row]); // Deep clone rows list
  const changes: MotherUpdateChange[] = [];
  let matchCount = 0;
  let updateCount = 0;

  updatedRows.forEach((row, rowIndex) => {
    if (rowIndex === 0) return; // Skip header

    const val1 = normalizeValue(row[colIndex1]);
    const val2 = normalizeValue(row[colIndex2]);
    const key = `${val1}|||${val2}`;

    if (key && key !== '|||' && childMap.has(key)) {
      matchCount++;
      const newValue = childMap.get(key) || '';
      const oldValue = row[colIndex3] !== undefined ? String(row[colIndex3]).trim() : '';

      if (oldValue !== newValue) {
        updateCount++;
        // Make sure row array is long enough to set cell in target index
        while (row.length <= colIndex3) {
          row.push('');
        }
        row[colIndex3] = newValue;

        changes.push({
          rowIndex,
          partNumber: row[colIndex1] !== undefined ? String(row[colIndex1]).trim() : '',
          fabricante: row[colIndex2] !== undefined ? String(row[colIndex2]).trim() : '',
          oldValue,
          newValue
        });
      }
    }
  });

  return {
    updatedRows,
    changes,
    matchCount,
    updateCount
  };
}

/**
 * Downloads a sheet grid containing all rows as an Microsoft Excel spreadsheet
 */
export function downloadRawRowsAsExcel(
  rows: any[][],
  fileName: string = 'Planilha_Mae_Atualizada.xlsx'
) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Planilha Mãe Atualizada');
  XLSX.writeFile(workbook, fileName);
}

