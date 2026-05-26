import { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Search,
  Sparkles,
  Download,
  AlertTriangle,
  Layers,
  Info,
  ListTodo,
  RefreshCw,
  FileText,
  Check,
  ChevronRight,
  HelpCircle,
  FileDown
} from 'lucide-react';
import FileDropzone from './components/FileDropzone';
import ColumnConfigurator from './components/ColumnConfigurator';
import { 
  parseSpreadsheet, 
  compareSpreadsheets, 
  downloadNewItemsAsExcel, 
  downloadNewItemsAsCSV,
  getColumnLetter,
  updateMotherCodes,
  downloadRawRowsAsExcel
} from './utils/spreadsheet';
import { sampleMotherFile, sampleChildFile } from './utils/sampleData';
import { SpreadsheetFile, MissingItem, MotherUpdateChange } from './types';

// Page size for pagination
const ITEMS_PER_PAGE = 10;

export default function App() {
  // Spreadsheet state
  const [motherFile, setMotherFile] = useState<SpreadsheetFile | null>(null);
  const [childFiles, setChildFiles] = useState<SpreadsheetFile[]>([]);
  
  // Custom column index selection
  const [colIndexB, setColIndexB] = useState<number>(1); // Index 1 is column B (Part Number)
  const [colIndexH, setColIndexH] = useState<number>(7); // Index 7 is column H (Fabricante)
  const [colIndexJ, setColIndexJ] = useState<number>(9); // Index 9 is column J (duplicate status or key)
  const [removeDuplicates, setRemoveDuplicates] = useState<boolean>(true); // default true for removing duplicates!

  // App functional tab switcher
  const [activeTab, setActiveTab] = useState<'missing' | 'updateColJ'>('missing');
  const [updateSearchQuery, setUpdateSearchQuery] = useState('');
  const [currentUpdatePage, setCurrentUpdatePage] = useState(1);

  // Interactive app states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChildFilter, setSelectedChildFilter] = useState<string>('all');
  const [registeredItemKeys, setRegisteredItemKeys] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Helper function to show notifications
  const triggerNotification = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // 1. Loader handlers
  const handleMotherSelected = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    try {
      const { headers, rows } = await parseSpreadsheet(file);
      setMotherFile({
        id: `mother-${Date.now()}`,
        name: file.name,
        size: Math.round(file.size / 1024),
        headers,
        rows,
        type: 'mother'
      });
      triggerNotification(`Planilha Mãe "${file.name}" carregada com sucesso!`);
    } catch (err) {
      console.error(err);
      triggerNotification('Erro ao processar a planilha mãe. Verifique o arquivo.', 'info');
    }
  };

  const handleChildrenSelected = async (files: File[]) => {
    if (files.length === 0) return;
    
    const parsedFiles: SpreadsheetFile[] = [];
    for (const file of files) {
      try {
        const { headers, rows } = await parseSpreadsheet(file);
        parsedFiles.push({
          id: `child-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          name: file.name,
          size: Math.round(file.size / 1024),
          headers,
          rows,
          type: 'child'
        });
      } catch (err) {
        console.error(err);
      }
    }

    if (parsedFiles.length > 0) {
      setChildFiles(prev => [...prev, ...parsedFiles]);
      triggerNotification(`${parsedFiles.length} planilha(s) filha(s) adicionadas.`);
    }
  };

  // Remove individual child file
  const removeChildFile = (id: string, name: string) => {
    setChildFiles(prev => prev.filter(f => f.id !== id));
    triggerNotification(`Planilha "${name}" removida da verificação.`);
  };

  // Remove mother sheet
  const removeMotherFile = () => {
    setMotherFile(null);
    triggerNotification('Planilha Mãe removida.');
  };

  // Load sample demonstration data
  const loadDemoData = () => {
    setMotherFile(sampleMotherFile);
    setChildFiles([sampleChildFile]);
    setColIndexB(1); // Column B
    setColIndexH(7); // Column H
    setColIndexJ(9); // Column J
    setRegisteredItemKeys(new Set());
    setCurrentPage(1);
    triggerNotification('Dados de demonstração carregados! Compare ou modifique as colunas.', 'success');
  };

  // Clear all loaded sheets
  const clearAllData = () => {
    setMotherFile(null);
    setChildFiles([]);
    setRegisteredItemKeys(new Set());
    setCurrentPage(1);
    triggerNotification('Todos os dados foram limpos.', 'info');
  };

  // 2. Perform comparison calculations
  const comparisonResults = useMemo(() => {
    if (!motherFile || childFiles.length === 0) {
      return { newItems: [], commonItemsCount: 0 };
    }
    return compareSpreadsheets(motherFile, childFiles, colIndexB, colIndexH, colIndexJ);
  }, [motherFile, childFiles, colIndexB, colIndexH, colIndexJ]);

  // Precalculate codes update result for the mother sheet
  const motherUpdateResults = useMemo(() => {
    if (!motherFile || childFiles.length === 0) {
      return { updatedRows: [], changes: [], matchCount: 0, updateCount: 0 };
    }
    return updateMotherCodes(motherFile, childFiles, colIndexB, colIndexH, colIndexJ);
  }, [motherFile, childFiles, colIndexB, colIndexH, colIndexJ]);

  // Filter and search inside the mother updates list
  const filteredUpdates = useMemo(() => {
    if (!motherUpdateResults.changes) return [];
    
    return motherUpdateResults.changes.filter(change => {
      if (!updateSearchQuery.trim()) return true;
      const q = updateSearchQuery.toLowerCase();
      return (
        change.partNumber.toLowerCase().includes(q) ||
        change.fabricante.toLowerCase().includes(q) ||
        change.oldValue.toLowerCase().includes(q) ||
        change.newValue.toLowerCase().includes(q) ||
        String(change.rowIndex).includes(q)
      );
    });
  }, [motherUpdateResults.changes, updateSearchQuery]);

  const paginatedUpdates = useMemo(() => {
    const startIndex = (currentUpdatePage - 1) * ITEMS_PER_PAGE;
    return filteredUpdates.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUpdates, currentUpdatePage]);

  const totalUpdatePages = Math.ceil(filteredUpdates.length / ITEMS_PER_PAGE) || 1;

  // Precalculates duplicates size
  const duplicatesCount = useMemo(() => {
    return comparisonResults.newItems.filter(item => item.isDuplicateHJ).length;
  }, [comparisonResults.newItems]);

  // Total lines evaluated
  const totalChildRowsEvaluated = useMemo(() => {
    return childFiles.reduce((acc, file) => acc + (file.rows.length - 1), 0);
  }, [childFiles]);

  // Filter and Search Results
  const filteredNewItems = useMemo(() => {
    let items = comparisonResults.newItems as MissingItem[];

    // Remove duplicates based on Column H + J combo if toggle is active
    if (removeDuplicates) {
      items = items.filter(item => !item.isDuplicateHJ);
    }

    return items.filter(item => {
      // Filter by child spreadsheet source if not set to 'all'
      if (selectedChildFilter !== 'all' && item.sourceFile !== selectedChildFilter) {
        return false;
      }
      
      // Filter by query (searches in PartNumber, Fabricante, or Column J)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const bMatch = item.col1Value.toLowerCase().includes(query);
        const hMatch = item.col2Value.toLowerCase().includes(query);
        const jMatch = item.col3Value ? item.col3Value.toLowerCase().includes(query) : false;
        return bMatch || hMatch || jMatch;
      }

      return true;
    });
  }, [comparisonResults.newItems, searchQuery, selectedChildFilter, removeDuplicates]);

  // Group list of child file names for filtering
  const childFileNames = useMemo(() => {
    return Array.from(new Set(childFiles.map(f => f.name)));
  }, [childFiles]);

  // Toggle item dynamic registry check
  const toggleItemRegistry = (key: string) => {
    const newSet = new Set(registeredItemKeys);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setRegisteredItemKeys(newSet);
  };

  // Batch mark all filtered as registered
  const markAllFilteredAsRegistered = () => {
    const newSet = new Set(registeredItemKeys);
    filteredNewItems.forEach(item => newSet.add(item.key));
    setRegisteredItemKeys(newSet);
    triggerNotification('Todos os itens visíveis foram marcados como cadastrados!');
  };

  // Clear registry checkoffs
  const clearRegistryCheckoffs = () => {
    setRegisteredItemKeys(new Set());
    triggerNotification('Progresso de cadastro reiniciado.');
  };

  // Download logic
  const handleExportXLSX = () => {
    if (filteredNewItems.length === 0) return;
    
    // Choose the headers from the first child file, or a consolidated default
    const headers = childFiles[0]?.headers || ['Item Nova Planilha'];
    
    // Name matches mother name if possible
    const dateStr = new Date().toISOString().split('T')[0];
    const exportName = `Novos_Componentes_Para_Subir_${dateStr}.xlsx`;
    
    downloadNewItemsAsExcel(filteredNewItems, headers, exportName);
    triggerNotification('Download do arquivo Excel (.xlsx) iniciado!');
  };

  const handleExportCSV = () => {
    if (filteredNewItems.length === 0) return;
    const headers = childFiles[0]?.headers || ['Item Nova Planilha'];
    const dateStr = new Date().toISOString().split('T')[0];
    const exportName = `Novos_Componentes_Para_Subir_${dateStr}.csv`;
    
    downloadNewItemsAsCSV(filteredNewItems, headers, exportName);
    triggerNotification('Download do arquivo CSV (.csv) iniciado com codificação UTF-8!');
  };

  const handleDownloadUpdatedMotherFile = () => {
    if (!motherFile || motherUpdateResults.updatedRows.length === 0) return;
    
    // Create downloaded file name (e.g. original name with suffix _SGPBimCode_Atualizado)
    const originalName = motherFile.name;
    const dotIdx = originalName.lastIndexOf('.');
    const baseName = dotIdx !== -1 ? originalName.substring(0, dotIdx) : originalName;
    const ext = dotIdx !== -1 ? originalName.substring(dotIdx) : '.xlsx';
    
    const downloadName = `${baseName}_SGPBimCode_Atualizado${ext}`;
    
    downloadRawRowsAsExcel(motherUpdateResults.updatedRows, downloadName);
    triggerNotification(`Planilha Mãe salva dinamicamente com ${motherUpdateResults.updateCount} códigos (SGPBimCode) preenchidos!`);
  };

  // Pagination calculator
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredNewItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredNewItems, currentPage]);

  const totalPages = Math.ceil(filteredNewItems.length / ITEMS_PER_PAGE) || 1;

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div
          id="system-notification"
          className="fixed bottom-6 right-6 z-50 flex max-w-md items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xl transition-all duration-300 animate-slide-up"
        >
          <div className={`rounded-full p-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
            {notification.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <Info className="h-5 w-5" />}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-950">Sistema</p>
            <p className="text-xs text-slate-500 mt-0.5">{notification.message}</p>
          </div>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Branding Title */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-500 p-2.5 text-white shadow-md shadow-emerald-100">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950">
                  Comparador Inteligente de Planilhas
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Cadastros Industriais de Componentes baseados nas Colunas B & H
                </p>
              </div>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-2.5">
              <button
                id="btn-demo-load"
                onClick={loadDemoData}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800 shadow-3xs transition hover:bg-emerald-100 focus:outline-hidden focus:ring-2 focus:ring-emerald-200"
              >
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>Carregar Demonstração (Teste)</span>
              </button>
              
              {(motherFile || childFiles.length > 0) && (
                <button
                  id="btn-clear-all"
                  onClick={clearAllData}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-600 shadow-3xs transition hover:bg-slate-50 hover:text-slate-950 focus:outline-hidden"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Limpar Tudo</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Subtitle / Objective Helper */}
        <div className="mb-8 rounded-2xl bg-slate-900 p-6 text-white shadow-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Instruções de Comparação
              </span>
              <h2 className="mt-2 text-lg font-bold">Procurando Componentes Novos Não Cadastrados</h2>
              <p className="mt-1 text-sm text-slate-300">
                Insira abaixo a planilha <strong className="text-white">Mãe (ex: EDIÇÃO_...)</strong> que possui os componentes já registrados no sistema. Depois envie as planilhas <strong className="text-white">Filhas (novas solicitações)</strong>. O sistema listará quais peças das filhas estão ausentes na mãe cruzando as colunas B e H simultaneamente.
              </p>
            </div>
            
            <div className="flex shrink-0 items-center gap-4 border-t border-slate-800 pt-4 md:border-t-0 md:pt-0">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>Coluna B ({getColumnLetter(colIndexB)}) = Part Number / Código</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                <span>Coluna H ({getColumnLetter(colIndexH)}) = Fabricante</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dropzone Grids Layout */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Section Mother Upload */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-xs font-bold text-emerald-700 border border-emerald-200">1</span>
                <span className="text-sm font-bold text-slate-900">Planilha MÃE (EDIÇÃO_)</span>
              </div>
              {motherFile && (
                <button
                  onClick={removeMotherFile}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 transition"
                  title="Remover planilha"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            {motherFile ? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-slate-100 bg-emerald-50/10 p-6 text-center">
                <div className="rounded-full bg-emerald-100 p-3 text-emerald-600 mb-3">
                  <FileSpreadsheet className="h-7 w-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 truncate max-w-xs">{motherFile.name}</h4>
                <p className="text-xs text-slate-500 mt-1 font-semibold">{motherFile.rows.length} linhas indexadas</p>
                <div className="mt-4 flex gap-1.5">
                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    Sincronizada (Mãe)
                  </span>
                  <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-600">{motherFile.size} KB</span>
                </div>
              </div>
            ) : (
              <FileDropzone
                id="mother-uploader"
                title="Arraste e solte a Planilha MÃE"
                subtitle="Ex: EDIÇÃO_Cadastro_Componentes.xlsx, .xls ou .csv"
                acceptText="Recomendável: Colunas B e H válidas"
                onFilesSelected={handleMotherSelected}
                multiple={false}
                isMother={true}
              />
            )}
          </div>

          {/* Section Daughter Spreadsheets Upload */}
          <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-200">2</span>
                <span className="text-sm font-bold text-slate-900">Planilhas FILHAS (Listas Novas)</span>
              </div>
              {childFiles.length > 0 && (
                <span className="text-xs font-bold bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full">
                  {childFiles.length} file(s)
                </span>
              )}
            </div>

            <FileDropzone
              id="children-uploader"
              title="Arraste uma ou MULTIPLAS Planilhas FILHAS"
              subtitle="Formatos compatíveis: .xlsx, .xls ou .csv"
              acceptText="Identificamos itens redundantes e novos"
              onFilesSelected={handleChildrenSelected}
              multiple={true}
              uploadedFileNames={childFiles.map(f => f.name)}
            />

            {childFiles.length > 0 && (
              <div className="mt-4 space-y-1 max-h-[140px] overflow-y-auto pr-1">
                {childFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span className="truncate font-semibold text-slate-900" title={f.name}>{f.name}</span>
                      <span className="text-[10px] text-slate-500">({f.rows.length} rows)</span>
                    </div>
                    <button
                      onClick={() => removeChildFile(f.id, f.name)}
                      className="text-slate-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel Component Showcase */}
        {(motherFile || childFiles.length > 0) && (
          <div className="mb-8">
            <ColumnConfigurator
              motherFile={motherFile}
              childFile={childFiles[0] || null}
              colIndex1={colIndexB}
              colIndex2={colIndexH}
              colIndex3={colIndexJ}
              onCol1Change={setColIndexB}
              onCol2Change={setColIndexH}
              onCol3Change={setColIndexJ}
            />
          </div>
        )}

        {/* Validation Check State */}
        {!motherFile || childFiles.length === 0 ? (
          /* Empty state warning card */
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center shadow-xs">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-4 animate-bounce">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-amber-900">Aguardando Envio das Planilhas</h3>
            <p className="mt-2 text-sm text-amber-800 max-w-lg mx-auto leading-relaxed">
              Para identificarmos os novos itens em lote, precisamos que você carregue pelo menos{' '}
              <strong className="text-slate-950 font-bold">1 Planilha Mãe</strong>{' '}
              e pelo menos{' '}
              <strong className="text-slate-950 font-bold">1 Planilha Filha</strong>.{' '}
              Ou clique no botão de <span className="font-semibold text-emerald-800 underline cursor-pointer" onClick={loadDemoData}>demonstração</span> acima para testar agora mesmo!
            </p>
          </div>
        ) : (
          /* Comparison reports space */
          <div id="comparison-reports-section" className="space-y-8 animate-fade-in">
            
            {/* Tab navigation */}
            <div className="flex flex-col sm:flex-row border-b border-slate-250 bg-slate-100/50 p-1 rounded-xl sm:bg-transparent sm:p-0 sm:rounded-none sm:border-b">
              <button 
                id="tab-missing-items"
                onClick={() => {
                  setActiveTab('missing');
                  setCurrentPage(1);
                }}
                className={`py-3 px-5 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center justify-center sm:justify-start gap-2 outline-none cursor-pointer ${
                  activeTab === 'missing' 
                    ? 'border-rose-500 text-rose-600 bg-white sm:bg-transparent rounded-lg sm:rounded-none shadow-3xs sm:shadow-none' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Search className="h-4 w-4 shrink-0 text-rose-500" />
                <span>1. Identificar Itens Novos</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'missing' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'}`}>
                  {filteredNewItems.length}
                </span>
              </button>
              <button 
                id="tab-update-codes"
                onClick={() => {
                  setActiveTab('updateColJ');
                  setCurrentUpdatePage(1);
                }}
                className={`py-3 px-5 font-bold text-xs sm:text-sm border-b-2 transition-all flex items-center justify-center sm:justify-start gap-2 outline-none cursor-pointer ${
                  activeTab === 'updateColJ' 
                    ? 'border-emerald-500 text-emerald-600 bg-white sm:bg-transparent rounded-lg sm:rounded-none shadow-3xs sm:shadow-none' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <RefreshCw className="h-4 w-4 shrink-0 text-emerald-500" />
                <span>2. Atualizar SGPBimCode na Mãe</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${activeTab === 'updateColJ' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                  {motherUpdateResults.updateCount}
                </span>
              </button>
            </div>

            {activeTab === 'missing' ? (
              <div className="space-y-8 animate-fade-in">
                {/* Bento Metrics block */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase mb-4">Relatório Consolidado</h3>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* Metric 1 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Mãe Cadastros</span>
                    <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><Layers className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-slate-900">{motherFile.rows.length - 1}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">Componentes oficiais na {motherFile.name}</p>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Filhas Pesquisadas</span>
                    <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600"><FileText className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-slate-900">{totalChildRowsEvaluated}</p>
                    <p className="text-xs text-slate-500 mt-1 truncate">Itens lidos em {childFiles.length} planilha(s) filhas</p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Novos para Adicionar</span>
                    <span className="rounded-lg bg-rose-50 p-1.5 text-rose-600"><AlertTriangle className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-black text-rose-600">
                      {comparisonResults.newItems.length - (removeDuplicates ? duplicatesCount : 0)}
                    </p>
                    <p className="text-xs text-rose-500 mt-1 font-semibold truncate">
                      {removeDuplicates && duplicatesCount > 0 
                        ? `(${duplicatesCount} replicados removidos)` 
                        : 'Itens ausentes na Planilha Mãe'}
                    </p>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800">Itens Restantes</span>
                    <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700"><ListTodo className="h-4 w-4" /></span>
                  </div>
                  <div className="mt-3">
                    {/* Remaining equals total new minus what they registered */}
                    <p className="text-2xl font-black text-emerald-950">
                      {Math.max(0, comparisonResults.newItems.length - registeredItemKeys.size)}
                    </p>
                    <p className="text-xs text-emerald-700 mt-1 truncate">
                      Pendente de cadastro manual no seu ERP
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Results Grid Table */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              
              {/* Table Controls Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                      <span>Lista de Novos Componentes Unificados</span>
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                        {filteredNewItems.length} componentes encontrados
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Estes componentes foram identificados nas planilhas filhas mas não contam em estoque / mãe.
                    </p>
                  </div>

                  {/* Actions for File Exporting */}
                  <div className="flex flex-wrap items-center gap-2">
                    {filteredNewItems.length > 0 && (
                      <>
                        <button
                          id="btn-export-xlsx"
                          onClick={handleExportXLSX}
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-900 transition focus:outline-hidden"
                          title="Baixar somente itens não cadastrados"
                        >
                          <Download className="h-4 w-4 text-emerald-400" />
                          <span>Baixar Excel (.xlsx)</span>
                        </button>

                        <button
                          id="btn-export-csv"
                          onClick={handleExportCSV}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                          title="Baixar arquivo TXT/CSV delimitado"
                        >
                          <FileDown className="h-4 w-4 text-slate-500" />
                          <span>Baixar CSV</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Live inputs search & filtering */}
                <div className="mt-5 grid gap-3 sm:grid-cols-12">
                  
                  {/* Search query box */}
                  <div className="relative sm:col-span-5">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      id="search-input"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1); // resett on typing
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-xs font-medium text-slate-800 outline-hidden transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                      placeholder="Filtrar por Part Number, Fabricante ou ID..."
                    />
                  </div>

                  {/* Daughter files source selector filter */}
                  <div className="sm:col-span-2">
                    <select
                      id="source-filter-select"
                      value={selectedChildFilter}
                      onChange={(e) => {
                        setSelectedChildFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 px-3 text-xs font-semibold text-slate-800 outline-hidden focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
                    >
                      <option value="all">Filtro: Todos</option>
                      {childFileNames.map((name, i) => (
                        <option key={i} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deduplication check */}
                  <div className="sm:col-span-3 flex items-center bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:border-rose-300 transition-colors">
                    <label className="flex items-center gap-2 cursor-pointer w-full select-none">
                      <input
                        type="checkbox"
                        checked={removeDuplicates}
                        onChange={(e) => {
                          setRemoveDuplicates(e.target.checked);
                          setCurrentPage(1);
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer accent-rose-500"
                      />
                      <div className="text-left leading-normal">
                        <p className="text-[10px] font-bold text-rose-700 leading-tight">Remover Replicados</p>
                        <p className="text-[9px] text-slate-500 font-medium leading-none">Combinação H + J ({getColumnLetter(colIndexJ)})</p>
                      </div>
                    </label>
                  </div>

                  {/* Checklist actions */}
                  <div className="sm:col-span-2 flex justify-end gap-1.5">
                    <button
                      onClick={markAllFilteredAsRegistered}
                      disabled={filteredNewItems.length === 0}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-1 transition duration-150 flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Confirmar</span>
                    </button>

                    {registeredItemKeys.size > 0 && (
                      <button
                        onClick={clearRegistryCheckoffs}
                        className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3.5 text-xs font-bold transition duration-150 shrink-0"
                        title="Zerar marcados"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* Grid content */}
              {filteredNewItems.length === 0 ? (
                /* No items matching filters */
                <div className="p-12 text-center text-slate-500">
                  <p className="text-sm font-semibold text-slate-900">Nenhum componente novo encontrado para os filtros ativos.</p>
                  <p className="text-xs text-slate-400 mt-1">Experimente limpar a sua busca ou trocar os arquivos inseridos.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-slate-600">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 divide-x divide-slate-100 uppercase tracking-wider text-[10px] text-slate-500 font-bold">
                        <th className="p-3 w-12 text-center">Feito</th>
                        <th className="p-3">Código / Part Number (B)</th>
                        <th className="p-3">Fabricante (H)</th>
                        <th className="p-3">Garantia (Coluna J)</th>
                        <th className="p-3">Planilha de Origem</th>
                        {/* Show another column in child sheet if exists */}
                        <th className="p-3">Dados Extras (Linha Completa)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedItems.map((item) => {
                        const isRegistered = registeredItemKeys.has(item.key);
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors divide-x divide-slate-100 hover:bg-slate-50/50 
                              ${isRegistered ? 'bg-emerald-50/40 text-slate-400 line-through' : 'bg-white'}`}
                          >
                            {/* Checkbox */}
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleItemRegistry(item.key)}
                                className={`mx-auto flex h-5 w-5 items-center justify-center rounded-md border transition-all duration-200
                                  ${isRegistered 
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-xs' 
                                    : 'border-slate-300 hover:border-emerald-500 text-transparent'
                                  }`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </td>

                            {/* Column B value representation (Highlight) */}
                            <td className="p-3">
                              <div className="font-mono text-[11px] font-bold text-slate-900 bg-slate-100/70 py-1 px-1.5 rounded w-fit">
                                {item.col1Value || '(Sem valor)'}
                              </div>
                            </td>

                            {/* Column H value representation (Highlight) */}
                            <td className="p-3">
                              <div className="font-mono text-[11px] font-semibold text-indigo-950 bg-indigo-50/50 py-1 px-1.5 rounded w-fit">
                                {item.col2Value || 'N/A'}
                              </div>
                            </td>

                            {/* Column J value representation (Highlight) */}
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-mono text-[11px] font-semibold text-rose-950 bg-rose-50/50 py-1 px-1.5 rounded w-fit">
                                  {item.col3Value || '(Nenhum)'}
                                </div>
                                {item.isDuplicateHJ && (
                                  <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold text-rose-800 border border-rose-200">
                                    Replicado (H+J)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Origin Child spreadsheet name */}
                            <td className="p-3 truncate max-w-[150px]" title={item.sourceFile}>
                              <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-semibold">
                                {item.sourceFile}
                              </span>
                            </td>

                            {/* Extra row values stringified as quick visual helper */}
                            <td className="p-3">
                              <p className="truncate max-w-[340px] text-slate-400 text-[11px] italic" title={item.rowValues.join(' | ')}>
                                {item.rowValues.map(v => v !== undefined && String(v).trim() ? String(v).trim() : '').filter(Boolean).slice(0, 5).join(' ➜ ')}
                              </p>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Table pagination footer controls */}
              {filteredNewItems.length > 0 && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-500">
                    Exibindo {Math.min(filteredNewItems.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredNewItems.length, currentPage * ITEMS_PER_PAGE)} de {filteredNewItems.length} novos componentes
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 text-xs font-bold rounded-lg ${
                          currentPage === page
                            ? 'bg-rose-500 text-white shadow-3xs'
                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Próxima
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Brazilian Helpful tips for database indexing */}
            <div className="rounded-2xl border border-rose-100 bg-rose-50/20 p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                <span>Próximo Passo: Como subir para o sistema?</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Você identificou <span className="font-bold text-rose-600">{filteredNewItems.length} componentes em falta</span>. Recomenda-se clicar no botão <strong className="text-slate-900 font-bold">Baixar Excel (.xlsx)</strong> para exportar uma planilha contendo apenas as linhas que estão ausentes na Planilha Mãe, depois utilize a planilha exportada para fazer o upload em lote (cadastro em massa) do seu ERP / sistema de controle de componentes.
              </p>
            </div>
              </div>
            ) : (
              /* Tab 2: Update SGPBimCode / Column J */
              <div className="space-y-8 animate-fade-in">
                
                {/* Bento Metrics block */}
                <div>
                  <h3 className="text-sm font-bold tracking-wider text-slate-500 uppercase mb-4">Relatório de Preenchimento</h3>
                  
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Metric 1: Total rows on mother */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Componentes na Mãe</span>
                        <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600"><Layers className="h-4 w-4" /></span>
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-black text-slate-900">{motherFile.rows.length - 1}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">Total registrado originalmente</p>
                      </div>
                    </div>

                    {/* Metric 2: Matches in children */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">Correspondentes Achados</span>
                        <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-700 font-bold"><Check className="h-4 w-4" /></span>
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-black text-indigo-950 font-mono">{motherUpdateResults.matchCount}</p>
                        <p className="text-xs text-slate-500 mt-1 truncate">Itens das filhas com chave B+H existente</p>
                      </div>
                    </div>

                    {/* Metric 3: Updates with code modifications */}
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-3xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800">Células que serão preenchidas</span>
                        <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700 animate-pulse"><Sparkles className="h-4 w-4" /></span>
                      </div>
                      <div className="mt-3">
                        <p className="text-2xl font-black text-emerald-600 font-mono">{motherUpdateResults.updateCount}</p>
                        <p className="text-xs text-emerald-700 mt-1 font-semibold truncate">Células da Coluna J alteradas</p>
                      </div>
                    </div>

                    {/* Metric 4: Direct Export Button */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-950 text-white p-5 shadow-3xs flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">Planilha Completa</span>
                        <span className="rounded-lg bg-slate-800 p-1.5 text-emerald-400"><FileDown className="h-4 w-4" /></span>
                      </div>
                      <button
                        onClick={handleDownloadUpdatedMotherFile}
                        disabled={motherUpdateResults.updatedRows.length === 0}
                        className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs py-2 px-3 transition shadow-md hover:shadow-emerald-950/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Baixar Mãe Atualizada</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Updates Change Log Table component */}
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  
                  {/* Table Header Controls */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-2">
                          <span>Resumo de Alterações na Planilha Mãe</span>
                          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                            {filteredUpdates.length} células modificadas
                          </span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Valores da coluna J que serão transferidos das filhas para a mãe
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Search box within updates */}
                        <div className="relative w-full max-w-xs">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-4 w-4 text-slate-400" />
                          </div>
                          <input
                            type="text"
                            value={updateSearchQuery}
                            onChange={(e) => {
                              setUpdateSearchQuery(e.target.value);
                              setCurrentUpdatePage(1);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-9 pr-4 text-xs font-semibold text-slate-800 outline-hidden transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                            placeholder="Buscar por código ou PN..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table Element */}
                  {filteredUpdates.length === 0 ? (
                    <div className="p-10 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-2">
                        <Info className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">Nenhuma alteração encontrada</p>
                      <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto leading-normal">
                        {updateSearchQuery ? 'Tente ajustar os critérios de pesquisa.' : 'Nenhuma linha da planilha Mãe encontrou correspondência com novidades na Coluna J de suas planilhas filhas anexadas.'}
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                            <th className="p-3 w-20 text-center">Linha Mãe</th>
                            <th className="p-3">Part Number (B)</th>
                            <th className="p-3">Fabricante (H)</th>
                            <th className="p-3">Código Atual (Mãe J)</th>
                            <th className="p-3 w-10 text-center"></th>
                            <th className="p-3">Novo Código (Filha J)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {paginatedUpdates.map((change, idx) => {
                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                {/* Row index inside the mother sheet */}
                                <td className="p-3 text-center font-mono font-bold text-slate-500 bg-slate-50/50">
                                  {change.rowIndex + 1}
                                </td>

                                {/* Part Number (B) */}
                                <td className="p-3 font-semibold text-slate-900 font-mono text-[11px] select-all">
                                  {change.partNumber}
                                </td>

                                {/* Manufacturer (H) */}
                                <td className="p-3 font-medium text-slate-600">
                                  {change.fabricante}
                                </td>

                                {/* Old Code */}
                                <td className="p-3 font-mono text-[11px] text-slate-400 italic">
                                  {change.oldValue || '(Vazio)'}
                                </td>

                                {/* Seta Arrow */}
                                <td className="p-3 text-center text-slate-450">
                                  <ChevronRight className="h-4 w-4 mx-auto text-emerald-500" />
                                </td>

                                {/* New Code */}
                                <td className="p-3">
                                  <span className="inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1 text-[11px] font-bold text-emerald-800 font-mono shadow-3xs select-all">
                                    {change.newValue}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Table pagination footer controls */}
                  {filteredUpdates.length > 0 && (
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-500">
                        Exibindo {Math.min(filteredUpdates.length, (currentUpdatePage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(filteredUpdates.length, currentUpdatePage * ITEMS_PER_PAGE)} de {filteredUpdates.length} alterações
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setCurrentUpdatePage(p => Math.max(1, p - 1))}
                          disabled={currentUpdatePage === 1}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Anterior
                        </button>
                        {Array.from({ length: totalUpdatePages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentUpdatePage(page)}
                            className={`w-7 h-7 text-xs font-bold rounded-lg ${
                              currentUpdatePage === page
                                ? 'bg-emerald-500 text-white shadow-3xs'
                                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setCurrentUpdatePage(p => Math.min(totalUpdatePages, p + 1))}
                          disabled={currentUpdatePage === totalUpdatePages}
                          className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-white font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* Tips for Brazilian database matching ERP code updates */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/20 p-6 mt-6">
                  <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <Info className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    <span>Atualização de SGPBimCode na Planilha Mãe</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    As planilhas filhas carregadas contêm os códigos ERP mais recentes na Coluna J. Ao associar a planilha mãe, o sistema preenche imediatamente a Coluna J correspondente aos mesmos itens na planilha mãe com os dados corretos do sgbpimcode de forma automatizada de instantânea. Clique no botão de download acima para salvar o arquivo de cadastro oficial atualizado.
                  </p>
                </div>

              </div>
            )}

          </div>
        )}

        {/* Documentation / FAQ Accordion */}
        <div className="mt-12 border-t border-slate-200 pt-8">
          <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-500" />
            <span>Perguntas Frequentes & Detalhes Técnicos</span>
          </h3>

          <div id="faq-accordions" className="grid gap-4 md:grid-cols-2">
            
            <div className="rounded-xl border border-slate-200 bg-white p-4.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Como o cruzamento B + H é feito?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Cada linha da planilha mãe e da filha é verificada. O sistema gera uma chave composta combinando o conteúdo da segunda coluna (Coluna B) com a oitava coluna (Coluna H) desconsiderando letras maiúsculas/minúsculas e espaços excedentes. Se a combinação não for encontrada na mãe, o item é adicionado à lista.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>E se houver registros duplicados nas filhas?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                O comparador avalia todas as linhas de todas as planilhas filhas anexadas. Se o mesmo componente novo estiver solicitado múltiplas vezes em arquivos filhas diferentes ou na mesma página, ele aparecerá associado a cada local correspondente para facilitar o seu rastreio de compras e quantidades.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Quais formatos de arquivo são suportados?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Você pode anexar planilhas geradas pelo Microsoft Excel (<strong className="text-slate-800">.xlsx</strong>) ou versões antigas (<strong className="text-slate-800">.xls</strong>), bem como arquivos separados por vírgula (<strong className="text-slate-800">.csv</strong>). O processamento é 100% no seu navegador e nenhum dado é enviado para servidores externos.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4.5">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <ChevronRight className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Por que usar o botão de Demonstração?</span>
              </h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Ao clicar em "Carregar Demonstração (Teste)", o aplicativo é preenchido com dados realistas de componentes industriais brasileiros para validar a regra de duplicados na coluna B (ex: um chip temporizador NE555 que possui Yageo vs STMicroelectronics cadastrados).
              </p>
            </div>

          </div>
        </div>

      </main>

      {/* Workspace Footer */}
      <footer className="mt-20 border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Comparador Inteligente de Planilhas. Desenvolvido em React & Tailwind CSS.</p>
        </div>
      </footer>

    </div>
  );
}
