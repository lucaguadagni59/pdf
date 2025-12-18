import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Send, FileText, ArrowLeft, Loader2, Bot, User, Copy, Check, Files, Download, ChevronDown, Mic, MicOff, Sparkles, X, Sun, Moon } from 'lucide-react';
import { Message, UploadedFile } from '../types';
import { sendMessageStream, generateSummary } from '../services/geminiService';

interface ChatInterfaceProps {
  files: UploadedFile[];
  onBack: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 p-1.5 text-xs font-medium text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md transition-colors"
      title="Copy response"
    >
      {isCopied ? (
        <>
          <Check size={14} className="text-emerald-500" />
          <span className="text-emerald-500">Copied</span>
        </>
      ) : (
        <>
          <Copy size={14} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ files, onBack, isDarkMode, toggleDarkMode }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summaryContent, setSummaryContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleVoiceInput = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    setInputValue('');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const isFirstMessage = messages.length === 0;
      const responseText = await sendMessageStream(
        userText,
        isFirstMessage ? files : null,
        (chunk) => {
          setStreamingContent(chunk);
        }
      );

      const modelMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, modelMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm sorry, I encountered an error while processing your request. Please try again.",
        timestamp: Date.now(),
        isError: true,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  };

  const handleGenerateSummary = async () => {
    if (isSummarizing) return;
    setIsSummarizing(true);
    setIsSummaryModalOpen(true);
    try {
      const summary = await generateSummary(files);
      setSummaryContent(summary);
    } catch (error) {
      setSummaryContent("Failed to generate summary. Please check your connection and try again.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportAsTxt = () => {
    const header = `DocuChat AI Conversation\nDocuments: ${files.map(f => f.name).join(', ')}\nExported on: ${new Date().toLocaleString()}\n\n`;
    const body = messages.map(msg => {
      const time = new Date(msg.timestamp).toLocaleTimeString();
      const role = msg.role === 'user' ? 'USER' : 'AI';
      return `[${time}] ${role}:\n${msg.text}\n${'-'.repeat(20)}`;
    }).join('\n\n');
    
    downloadFile(header + body, `docuchat-export-${Date.now()}.txt`, 'text/plain');
    setIsExportMenuOpen(false);
  };

  const exportAsJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      documents: files.map(f => ({ name: f.name, size: f.size })),
      messages: messages.map(({ id, role, text, timestamp }) => ({ role, text, timestamp }))
    };
    downloadFile(JSON.stringify(exportData, null, 2), `docuchat-export-${Date.now()}.json`, 'application/json');
    setIsExportMenuOpen(false);
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 transition-colors"
            title="Upload new documents"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              {files.length === 1 ? (
                 <>
                   <FileText size={18} className="text-indigo-600 dark:text-indigo-400" />
                   <span className="truncate max-w-[120px] sm:max-w-[200px] md:max-w-md">{files[0].name}</span>
                 </>
              ) : (
                <>
                  <Files size={18} className="text-indigo-600 dark:text-indigo-400" />
                  <span>{files.length} Documents</span>
                </>
              )}
            </h2>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span>{(totalSize / 1024 / 1024).toFixed(2)} MB</span>
              {files.length > 1 && (
                <span className="truncate max-w-[120px] hidden md:inline-block border-l border-slate-300 dark:border-slate-700 pl-2">
                   {files.map(f => f.name).join(', ')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button 
            onClick={toggleDarkMode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={handleGenerateSummary}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-sm font-semibold rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border border-indigo-100 dark:border-indigo-900/50"
          >
            <Sparkles size={16} />
            <span className="hidden sm:inline">Summary</span>
          </button>

          {messages.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden z-20">
                  <button 
                    onClick={exportAsTxt}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
                  >
                    <FileText size={16} />
                    Export as Text (.txt)
                  </button>
                  <button 
                    onClick={exportAsJson}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-2"
                  >
                    <div className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold">JSON</div>
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 opacity-60 mt-10">
            <Bot size={48} className="mb-4" />
            <p className="text-center text-lg font-medium">Ask me anything about your documents!</p>
            <p className="text-center text-sm">I can summarize, explain, or extract details.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-emerald-600 dark:bg-emerald-700 text-white'}
              `}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className={`
                px-5 py-3.5 rounded-2xl text-sm md:text-base leading-relaxed shadow-sm
                ${msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                }
                ${msg.isError ? 'border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}
              `}>
                {msg.role === 'user' ? (
                  msg.text
                ) : (
                  <>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown 
                        components={{
                          ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
                          ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2" {...props} />,
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-bold my-1" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                          code: ({node, ...props}) => <code className="bg-slate-100 dark:bg-slate-800 rounded px-1 py-0.5 text-xs font-mono" {...props} />,
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                    
                    {!msg.isError && (
                      <div className="flex justify-end mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <CopyButton text={msg.text} />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {(isLoading || streamingContent) && (
          <div className="flex w-full justify-start">
             <div className="flex gap-3 max-w-[85%] md:max-w-[75%] flex-row">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 bg-emerald-600 dark:bg-emerald-700 text-white">
                <Bot size={16} />
              </div>
              <div className="px-5 py-3.5 rounded-2xl rounded-tl-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-slate-800 dark:text-slate-200">
                 {streamingContent ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                       <ReactMarkdown>{streamingContent}</ReactMarkdown>
                    </div>
                 ) : (
                   <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                     <Loader2 size={16} className="animate-spin" />
                     <span className="text-sm">Reading documents...</span>
                   </div>
                 )}
              </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 transition-colors">
        <div className="max-w-4xl mx-auto relative flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isLoading ? "Please wait..." : "Ask a question..."}
            disabled={isLoading}
            className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-5 py-4 pr-24 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-700 transition-all shadow-inner disabled:opacity-60"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {recognitionRef.current && (
              <button
                onClick={toggleVoiceInput}
                disabled={isLoading}
                className={`
                  p-2 rounded-lg transition-all duration-200
                  ${isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-lg' 
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            )}
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className={`
                p-2 rounded-lg transition-all duration-200
                ${!inputValue.trim() || isLoading 
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                }
              `}
              title="Send message"
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
        <div className="text-center mt-2">
           <p className="text-[10px] text-slate-400 dark:text-slate-600">
             AI can make mistakes. Please verify important information.
           </p>
        </div>
      </div>

      {/* Summary Modal */}
      {isSummaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
              <div className="flex items-center gap-2">
                <Sparkles className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Document Summary</h3>
              </div>
              <button 
                onClick={() => setIsSummaryModalOpen(false)}
                className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
              {isSummarizing ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin" />
                    <Sparkles className="w-4 h-4 text-indigo-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">Analyzing all documents...</p>
                </div>
              ) : (
                <div className="prose prose-indigo dark:prose-invert max-w-none">
                  <ReactMarkdown 
                    components={{
                      ul: ({node, ...props}) => <ul className="list-disc ml-5 my-3" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal ml-5 my-3" {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3" {...props} />,
                      p: ({node, ...props}) => <p className="mb-4 text-slate-700 dark:text-slate-300 leading-relaxed" {...props} />,
                    }}
                  >
                    {summaryContent}
                  </ReactMarkdown>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              {!isSummarizing && summaryContent && (
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(summaryContent);
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-all flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copy Summary
                </button>
              )}
              <button 
                onClick={() => setIsSummaryModalOpen(false)}
                className="px-6 py-2 bg-slate-900 dark:bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-indigo-700 transition-all shadow-md active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;