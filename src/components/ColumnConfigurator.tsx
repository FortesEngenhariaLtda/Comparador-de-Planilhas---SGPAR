import React from 'react';
import { getColumnLetter } from '../utils/spreadsheet';
import { SpreadsheetFile } from '../types';
import { Settings2, ArrowDown, HelpCircle } from 'lucide-react';

interface ColumnConfiguratorProps {
  motherFile: SpreadsheetFile | null;
  childFile: SpreadsheetFile | null;
  colIndex1: number; // Col 1 selection (index 1 / B)
  colIndex2: number; // Col 2 selection (index 7 / H)
  colIndex3: number; // Col 3 selection (index 9 / J)
  onCol1Change: (index: number) => void;
  onCol2Change: (index: number) => void;
  onCol3Change: (index: number) => void;
}

export default function ColumnConfigurator({
  motherFile,
  childFile,
  colIndex1,
  colIndex2,
  colIndex3,
  onCol1Change,
  onCol2Change,
  onCol3Change
}: ColumnConfiguratorProps) {
  // We will display a preview grid for the representative file (prioritizing mother, then child)
  const targetFile = motherFile || childFile;

  if (!targetFile) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-6 text-center text-slate-500">
        <p className="text-sm font-medium">Os dados de coluna e pré-visualização aparecerão aqui assim que você enviar ou carregar as planilhas.</p>
      </div>
    );
  }

  // Pre-calculate letters for dropdown selects
  const columnsCount = Math.max(12, targetFile.headers.length);
  const columnOptions = Array.from({ length: columnsCount }, (_, i) => ({
    index: i,
    letter: getColumnLetter(i),
    label: targetFile.headers[i] ? `${getColumnLetter(i)} - ${targetFile.headers[i]}` : `${getColumnLetter(i)} - (Sem título)`
  }));

  // Take first 5 rows for the preview
  const previewRows = targetFile.rows.slice(0, 6); // Includes header sometimes, let's just render raw values

  return (
    <div id="column-configurator-panel" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-5">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 border border-emerald-100 shrink-0">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Configuração das Colunas de Identificação</h3>
            <p className="text-xs text-slate-500">
              A regra principal busca <strong className="text-emerald-700">Coluna B</strong> + <strong className="text-emerald-700">Coluna H</strong>. A garantia contra duplicados busca <strong className="text-rose-700">Coluna H</strong> + <strong className="text-rose-700">Coluna J</strong>.
            </p>
          </div>
        </div>

        {/* Quick Configs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Coluna B (Part Number)</label>
            <select
              value={colIndex1}
              onChange={(e) => onCol1Change(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-3xs outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              {columnOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Coluna H (Fabricante)</label>
            <select
              value={colIndex2}
              onChange={(e) => onCol2Change(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-3xs outline-hidden focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              {columnOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Coluna J (Garantia Duplicados)</label>
            <select
              value={colIndex3}
              onChange={(e) => onCol3Change(Number(e.target.value))}
              className="rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 py-1.5 text-xs font-semibold text-rose-950 shadow-3xs outline-hidden focus:border-rose-550 focus:ring-2 focus:ring-rose-200 animate-pulse"
            >
              {columnOptions.map((opt) => (
                <option key={opt.index} value={opt.index}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Explanatory Banner */}
      <div className="mt-4 flex gap-3 rounded-lg bg-emerald-50/50 p-3.5 text-xs text-slate-700 border border-emerald-100">
        <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-emerald-800">Remoção de Replicados:</span> O sistema gerou uma regra extra de validação. O item é considerado duplicado caso a <strong className="text-slate-900">Coluna J ({getColumnLetter(colIndex3)})</strong> informe status duplicado ou haja redundância no cruzamento de <strong className="text-slate-900">Fabricante ({getColumnLetter(colIndex2)}) + Coluna J ({getColumnLetter(colIndex3)})</strong>.
        </div>
      </div>

      {/* Preview Section */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase">
            Pré-visualização de Dados ({targetFile.name})
          </h4>
          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full font-semibold text-slate-600">
            Mostrando primeiras 6 linhas
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 divide-x divide-slate-200 border-b border-slate-200">
                {targetFile.headers.slice(0, 12).map((h, i) => {
                  const isCol1 = i === colIndex1;
                  const isCol2 = i === colIndex2;
                  const isCol3 = i === colIndex3;
                  return (
                    <th 
                      key={i} 
                      className={`p-3 font-semibold transition-colors duration-200 ${
                        isCol1 
                          ? 'bg-emerald-500 text-white' 
                          : isCol2 
                            ? 'bg-indigo-500 text-white' 
                            : isCol3
                              ? 'bg-rose-500 text-white shadow-inner'
                              : 'text-slate-800'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="text-[10px] tracking-wider font-mono opacity-80 uppercase">
                          Excel: {getColumnLetter(i)}
                        </span>
                        <span className="truncate max-w-[120px]" title={h}>{h}</span>
                        {isCol1 && <span className="mt-1 text-[9px] bg-emerald-700/50 px-1.5 py-0.2 rounded w-fit self-start uppercase">Coluna B</span>}
                        {isCol2 && <span className="mt-1 text-[9px] bg-indigo-700/50 px-1.5 py-0.2 rounded w-fit self-start uppercase">Coluna H</span>}
                        {isCol3 && <span className="mt-1 text-[9px] bg-rose-700/50 px-1.5 py-0.2 rounded w-fit self-start uppercase">Coluna J</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {previewRows.map((row, rIdx) => {
                // Skip rendering header duplicate as a standard row if it's the first and matches the headers array
                if (rIdx === 0 && row.some((v, i) => String(v).trim() === targetFile.headers[i])) {
                  return null;
                }
                return (
                  <tr key={rIdx} className="hover:bg-slate-50/50 divide-x divide-slate-200 transition-colors">
                    {row.slice(0, 12).map((cell, cIdx) => {
                      const isCol1 = cIdx === colIndex1;
                      const isCol2 = cIdx === colIndex2;
                      const isCol3 = cIdx === colIndex3;
                      return (
                        <td 
                          key={cIdx} 
                          className={`p-3 truncate max-w-[140px] font-medium ${
                            isCol1 
                              ? 'bg-emerald-50/70 font-bold text-emerald-950 font-mono text-[11px]' 
                              : isCol2 
                                ? 'bg-indigo-50/70 font-bold text-indigo-950 font-mono text-[11px]' 
                                : isCol3
                                  ? 'bg-rose-50/70 font-bold text-rose-950 font-mono text-[11px]'
                                  : 'text-slate-600'
                          }`}
                          title={cell !== undefined ? String(cell) : ''}
                        >
                          {cell !== undefined ? String(cell) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
