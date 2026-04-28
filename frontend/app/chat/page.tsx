'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/store';
import { apiClient } from '@/lib/api';
import { 
  Send, 
  Bot, 
  User, 
  Loader, 
  MessageSquare, 
  Sparkles,
  Info,
  Zap,
  Paperclip,
  Mic,
  Maximize2,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  source?: string;
}

const SUGGESTIONS = [
  "What is Adenocarcinoma?",
  "Analyze NSCLC subtypes",
  "Model confidence threshold",
  "Scan protocol standards",
  "History of patient PX-992"
];

export default function ChatPage() {
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Greetings, Dr. ${user?.username || 'Clinician'}. I am your Clinical AI Assistant, specialized in NSCLC classification. How can I assist with your diagnostic workflow today?`,
      sender: 'bot',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await apiClient.sendMessage(input);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        sender: 'bot',
        timestamp: new Date(response.timestamp),
        source: response.source,
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error: any) {
      console.error('Chat failed:', error);
      toast.error('Assistant neural link failure. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-14rem)] flex flex-col gap-8 fade-in">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
             <MessageSquare className="text-medical-primary" size={32} />
             Clinical <span className="text-medical-primary">AI Assistant</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium">Neural-linked diagnostic support and query engine.</p>
        </motion.div>
        
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-white/5 rounded-2xl">
              <div className="w-2 h-2 rounded-full bg-medical-success animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Link Active</span>
           </div>
           <button className="p-3 bg-slate-900 border border-white/5 rounded-2xl text-slate-500 hover:text-white transition-colors">
              <Maximize2 size={18} />
           </button>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-12 gap-8 min-h-0">
        {/* Sidebar / Suggestions */}
        <div className="lg:col-span-3 space-y-8 hidden lg:block overflow-y-auto custom-scrollbar pr-2">
           <section className="space-y-6">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                 <Sparkles size={16} className="text-medical-primary" />
                 Suggested Queries
              </h3>
              <div className="space-y-3">
                 {SUGGESTIONS.map((query, i) => (
                   <motion.button 
                     key={i}
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     transition={{ delay: i * 0.1 }}
                     onClick={() => setInput(query)}
                     className="w-full text-left p-4 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-medical-primary/30 text-xs font-bold text-slate-400 hover:text-white transition-all group"
                   >
                      <div className="flex items-center justify-between">
                         <span className="truncate pr-4">{query}</span>
                         <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-medical-primary" />
                      </div>
                   </motion.button>
                 ))}
              </div>
           </section>

           <div className="glass-card !bg-medical-primary/5 border-medical-primary/10 !p-6 space-y-4">
              <div className="flex items-center gap-3 text-medical-primary">
                 <Info size={18} />
                 <h4 className="text-[10px] font-black uppercase tracking-widest">Protocol Notice</h4>
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                 Assistant logic is limited to NSCLC-related clinical guidelines and system operations.
              </p>
           </div>
        </div>

        {/* Chat Main Interface */}
        <div className="lg:col-span-9 flex flex-col glass-card !p-0 overflow-hidden relative border-white/10 shadow-2xl bg-slate-950/40">
           {/* Chat Messages */}
           <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
              <AnimatePresence>
                {messages.map((m) => (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-6 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                      m.sender === 'bot' 
                      ? 'bg-gradient-to-br from-medical-primary to-medical-secondary text-white shadow-medical-primary/20' 
                      : 'bg-slate-900 border border-white/10 text-slate-400'
                    }`}>
                      {m.sender === 'bot' ? <Bot size={24} /> : <User size={24} />}
                    </div>
                    
                    <div className={`max-w-[75%] space-y-2 ${m.sender === 'user' ? 'text-right flex flex-col items-end' : ''}`}>
                      <div className={`p-5 rounded-3xl text-sm leading-relaxed font-medium ${
                        m.sender === 'bot' 
                        ? 'bg-slate-900/80 text-slate-200 border border-white/5 shadow-xl' 
                        : 'bg-medical-primary text-white shadow-lg shadow-medical-primary/10'
                      }`}>
                        {m.text}
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                           {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                         {m.source && (
                           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-medical-primary/10 border border-medical-primary/20">
                              <Sparkles size={8} className="text-medical-primary" />
                              <span className="text-[8px] font-black text-medical-primary uppercase tracking-widest">{m.source}</span>
                           </div>
                         )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {isLoading && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex gap-6"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-medical-primary to-medical-secondary text-white flex items-center justify-center shrink-0 animate-pulse shadow-medical-primary/20 shadow-lg">
                    <Bot size={24} />
                  </div>
                  <div className="bg-slate-900/80 p-5 rounded-3xl flex gap-3 items-center border border-white/5 shadow-xl">
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-medical-primary rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
           </div>

           {/* Chat Input Area */}
           <div className="p-8 bg-slate-950 border-t border-white/5 relative z-10">
              <form onSubmit={handleSend} className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-4 text-slate-600">
                   <Paperclip size={18} className="hover:text-white cursor-pointer transition-colors" />
                   <Mic size={18} className="hover:text-white cursor-pointer transition-colors" />
                </div>
                
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Query the AI assistant for NSCLC insights..."
                  className="input-field !pl-20 !pr-16 !py-4 text-sm bg-slate-900/50 border-white/5"
                  disabled={isLoading}
                />
                
                <button 
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-medical-primary text-white rounded-xl hover:bg-sky-400 transition-all shadow-lg shadow-medical-primary/20 flex items-center justify-center disabled:opacity-20"
                >
                  {isLoading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
              </form>
              <div className="mt-4 flex justify-between items-center px-2">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">End-to-End Encrypted Neural Link</p>
                 <div className="flex items-center gap-1">
                    <Zap size={12} className="text-medical-primary" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ResNet-50 v2 Core</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
