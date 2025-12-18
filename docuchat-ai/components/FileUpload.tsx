import React, { useState, useRef } from 'react';
import { UploadedFile } from '../types';
import { Upload, FileText, AlertCircle, Loader2, Files } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: UploadedFile[]) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (fileList: FileList | File[]) => {
    setError(null);
    const files = Array.from(fileList);
    
    if (files.length === 0) return;

    // Validation
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        setError('Only PDF files are allowed.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) { // 20MB limit per file
        setError(`File "${file.name}" exceeds 20MB limit.`);
        return;
      }
    }

    setIsLoading(true);

    try {
      const filePromises = files.map(file => new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64Data = e.target?.result as string;
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64Data,
          });
        };
        reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
        reader.readAsDataURL(file);
      }));

      const uploadedFiles = await Promise.all(filePromises);
      onFileSelect(uploadedFiles);
      
    } catch (err) {
      console.error(err);
      setError('Failed to process files. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4">
      <div 
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ease-in-out
          flex flex-col items-center justify-center min-h-[400px] bg-white dark:bg-slate-900 shadow-sm
          ${isDragging 
            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]' 
            : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
        />

        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <Loader2 className="w-16 h-16 text-indigo-600 mb-4 animate-spin" />
            <p className="text-lg font-medium text-slate-700 dark:text-slate-200">Processing Documents...</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">This may take a few seconds</p>
          </div>
        ) : (
          <>
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center mb-6 transition-colors duration-300
              ${isDragging ? 'bg-indigo-200 dark:bg-indigo-800' : 'bg-indigo-100 dark:bg-slate-800'}
            `}>
              {isDragging ? (
                <Upload className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Files className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
              )}
            </div>

            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              {isDragging ? 'Drop files here!' : 'Upload your PDFs'}
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xs mx-auto leading-relaxed">
              Drag and drop your PDF documents here, or click the button to browse your files.
            </p>

            <button
              onClick={handleButtonClick}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Select Documents
            </button>

            {error && (
              <div className="absolute bottom-6 left-0 right-0 px-4">
                <div className="flex items-center justify-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/20 py-2 px-4 rounded-lg mx-auto w-fit">
                  <AlertCircle size={16} />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
            
            <p className="absolute bottom-4 text-xs text-slate-400 dark:text-slate-500">
              Supported format: PDF (Max 20MB per file)
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;