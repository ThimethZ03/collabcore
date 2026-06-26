import { useCallback, useState, useRef } from 'react';
import { Upload, X, FileIcon } from 'lucide-react';
import { cn } from '../../utils/helpers';

export default function FileUpload({ accept, maxSize, onFilesSelected, multiple = false, className }) {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const validateFile = (file) => {
    if (maxSize && file.size > maxSize) {
      setError(`File "${file.name}" exceeds maximum size of ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
      return false;
    }
    setError('');
    return true;
  };

  const handleFiles = useCallback(
    (fileList) => {
      const validFiles = Array.from(fileList).filter(validateFile);
      if (validFiles.length === 0) return;
      const updated = multiple ? [...files, ...validFiles] : validFiles;
      setFiles(updated);
      onFilesSelected?.(updated);
    },
    [files, multiple, maxSize, onFilesSelected]
  );

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    setFiles(updated);
    onFilesSelected?.(updated);
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          'border-surface-border bg-surface-input hover:border-primary/50 hover:bg-primary-light/30',
          'dark:border-dark-border dark:bg-dark-input dark:hover:border-dark-primaryAccent/50 dark:hover:bg-dark-primaryLight/20',
          dragActive && 'border-primary bg-primary-light/50 dark:border-dark-primaryAccent dark:bg-dark-primaryLight/30'
        )}
      >
        <Upload
          size={32}
          className={cn(
            'mx-auto mb-3',
            dragActive
              ? 'text-primary dark:text-dark-primaryAccent'
              : 'text-text-muted dark:text-text-muted'
          )}
        />
        <p className="text-sm font-medium text-text-primary dark:text-text-inverted mb-1">
          {dragActive ? 'Drop files here' : 'Click or drag files to upload'}
        </p>
        <p className="text-xs text-text-muted dark:text-text-muted">
          {accept ? `Accepted: ${accept}` : 'Any file type'}{' '}
          {maxSize && `• Max ${(maxSize / 1024 / 1024).toFixed(0)}MB`}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, idx) => (
            <li
              key={`${file.name}-${idx}`}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-input dark:bg-dark-elevated border border-surface-border dark:border-dark-border"
            >
              <FileIcon size={16} className="text-primary dark:text-dark-primaryAccent shrink-0" />
              <span className="flex-1 text-sm text-text-primary dark:text-text-inverted truncate">
                {file.name}
              </span>
              <span className="text-xs text-text-muted shrink-0">
                {(file.size / 1024).toFixed(1)}KB
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(idx);
                }}
                className="p-0.5 text-text-muted hover:text-danger transition-colors"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
