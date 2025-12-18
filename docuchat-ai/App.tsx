import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import { UploadedFile, AppState } from './types';
import { Sparkles, ShieldCheck, Sun, Moon } from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.UPLOAD);
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleFileSelect = (files: UploadedFile[]) => {
    setCurrentFiles(files);
    setAppState(AppState.CHAT);
  };

  const handleBack = () => {
    if (window.confirm("Going back will clear the current chat session. Continue?")) {
      setAppState(AppState.UPLOAD);
      setCurrentFiles([]);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {appState === AppState.UPLOAD && (
        <>
          {/* Header for Upload Screen */}
          <header className="w-full py-8 px-6 flex flex-col items-center justify-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-lg">
                <Sparkles className="text-white w-6 h-6" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                DocuChat <span className="text-indigo-600">AI</span>
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">Secure, Local Document Analysis</p>
            
            <button 
              onClick={toggleDarkMode}
              className="absolute top-8 right-8 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </header>

          {/* Main Content for Upload Screen */}
          <main className="flex-1 flex flex-col items-center justify-center p-6 space-y-12">
            <FileUpload onFileSelect={handleFileSelect} />
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full px-4">
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    ⚡ Instant Analysis
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No waiting for indexing. Gemini reads your document instantly using its massive context window.
                  </p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    📄 PDF Native
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Specifically optimized for PDF documents. Preserves context and structure for better answers.
                  </p>
               </div>
               <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" /> Secure Processing
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your document is processed in a transient session. We don't store your data permanently.
                  </p>
               </div>
            </div>
          </main>
          
          <footer className="py-6 text-center text-slate-400 dark:text-slate-600 text-sm">
            Powered by Gemini 2.5 Flash
          </footer>
        </>
      )}

      {appState === AppState.CHAT && currentFiles.length > 0 && (
        <div className="h-full">
          <ChatInterface 
            files={currentFiles} 
            onBack={handleBack} 
            isDarkMode={isDarkMode} 
            toggleDarkMode={toggleDarkMode} 
          />
        </div>
      )}
    </div>
  );
};

export default App;