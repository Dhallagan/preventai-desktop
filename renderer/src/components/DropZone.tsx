import { useRef, useState } from 'react';
import { formatBytes } from '../lib/format';

interface DropZoneProps {
  label: string;
  required?: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function DropZone({ label, required, file, onChange }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) onChange(f);
  };

  return (
    <div>
      <label className="block text-xs font-medium text-stone-500 mb-1 uppercase tracking-wide">
        {label} {required ? <span className="text-risk-high">*</span> : <span className="text-stone-300 normal-case">optional</span>}
      </label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`border border-dashed rounded px-4 py-6 text-center cursor-pointer transition-colors ${
          file
            ? 'border-risk-low bg-green-50'
            : dragOver
              ? 'border-stone-600 bg-stone-50'
              : 'border-stone-300 hover:border-stone-400'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onChange(f);
          }}
        />
        {file ? (
          <>
            <p className="text-xs font-medium text-risk-low truncate">{file.name}</p>
            <p className="text-[10px] text-green-600 mt-0.5">{formatBytes(file.size)}</p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
                if (inputRef.current) inputRef.current.value = '';
              }}
              className="text-[10px] text-stone-400 hover:text-stone-600 mt-1"
            >
              remove
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-stone-500">Drop file or click to browse</p>
            <p className="text-[10px] text-stone-400 mt-1">PDF, DOCX, or TXT</p>
          </>
        )}
      </div>
    </div>
  );
}
