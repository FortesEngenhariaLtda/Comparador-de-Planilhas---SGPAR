import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FileDropzoneProps {
  id: string;
  title: string;
  subtitle: string;
  acceptText: string;
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  uploadedFileNames?: string[];
  isMother?: boolean;
}

export default function FileDropzone({
  id,
  title,
  subtitle,
  acceptText,
  onFilesSelected,
  multiple = false,
  uploadedFileNames = [],
  isMother = false
}: FileDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const fileArray: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        fileArray.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      setError(`Arquivo(s) inválidos: ${invalidFiles.join(', ')}. Use apenas .xlsx, .xls ou .csv`);
      return;
    }

    setError(null);
    onFilesSelected(fileArray);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    processFiles(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    processFiles(e.target.files);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id={`dropzone-container-${id}`} className="space-y-2">
      <div
        id={`dropzone-${id}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer select-none
          ${isDragActive 
            ? 'border-emerald-500 bg-emerald-50/50' 
            : isMother 
              ? 'border-slate-300 hover:border-emerald-500 bg-white hover:bg-slate-50/50'
              : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-slate-50/50'
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={`input-file-${id}`}
          className="hidden"
          multiple={multiple}
          accept=".xlsx,.xls,.csv"
          onChange={handleChange}
        />

        <div className={`mb-4 rounded-full p-4 transition-colors duration-200
          ${isDragActive 
            ? 'bg-emerald-100 text-emerald-600' 
            : isMother 
              ? 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600'
              : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
          }`}
        >
          {uploadedFileNames.length > 0 ? (
            <FileSpreadsheet className="h-8 w-8 animate-pulse text-emerald-600" />
          ) : (
            <Upload className="h-8 w-8" />
          )}
        </div>

        <p className="text-sm font-medium text-slate-950">
          {title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>
        <span className="mt-4 inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors group-hover:bg-slate-200">
          Pesquisar arquivo
        </span>

        {acceptText && (
          <p className="mt-2 text-[10px] text-slate-400 font-mono">
            {acceptText}
          </p>
        )}
      </div>

      {error && (
        <div id={`dropzone-error-${id}`} className="flex items-center gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploadedFileNames.length > 0 && (
        <div id={`dropzone-success-list-${id}`} className="space-y-1.5 pt-1">
          <div className="text-xs font-semibold text-slate-700">
            {uploadedFileNames.length === 1 ? 'Arquivo carregado:' : 'Arquivos carregados:'}
          </div>
          {uploadedFileNames.map((name, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 border border-emerald-100"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate">{name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
