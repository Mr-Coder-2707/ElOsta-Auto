
import { useMemo, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  RotateCcw, 
  Wrench, 
  AlertCircle, 
  HelpCircle, 
  User, 
  Bot, 
  History, 
  Cpu, 
  ShieldCheck, 
  Settings, 
  ChevronRight,
  Menu,
  X,
  Gauge
} from 'lucide-react';
import { diagnosticData, Symptom } from '../data/diagnostics';
import { LanguageToggle } from './LanguageToggle';

type ApiDiagnosis = {
  title: string;
  cause: string;
  solution: string;
  followUp?: {
    question: string;
    options: { id: string; label: string }[];
  };
  context?: {
    symptomId: string;
  };
};

type DiagnoseResponse =
  | { match: true; diagnosis: ApiDiagnosis }
  | { match: false; message: string };

type FollowUpResponse = {
  diagnosis: { title: string; cause: string; solution: string };
};

type ApiHistoryItem = {
  role: 'user' | 'assistant';
  content: string;
};

type Message = {
  id: string;
  type: 'user' | 'bot';
  content: string;
  isScanning?: boolean;
  diagnosis?: {
    title: string;
    cause: string;
    solution: string;
    followUp?: {
      question: string;
      options: { id: string; label: string }[];
    };
  };
  timestamp: number;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  currentSymptomId: string | null;
  lastUserSymptomText: string | null;
};

type PersistedStateV1 = {
  version: 1;
  lang: 'en' | 'ar';
  activeConversationId: string;
  conversations: Conversation[];
};

const STORAGE_KEY = 'autoexpert.state.v1';

const getStrings = (lang: 'en' | 'ar') => {
  return {
    title: 'ElOsta Auto',
    subtitle: lang === 'en' ? 'Industrial Diagnostic System' : 'نظام التشخيص الصناعي',
    placeholder: lang === 'en' ? 'Enter vehicle symptoms...' : 'أدخل أعراض المركبة...',
    welcome:
      lang === 'en'
        ? 'System initialized. State symptoms for immediate diagnostic analysis.'
        : 'تم تشغيل النظام. اذكر الأعراض لبدء التحليل الفني.',
    noMatch:
      lang === 'en'
        ? 'Insufficient data. Provide more specific technical symptoms (e.g., fluid color, noise frequency).'
        : 'بيانات غير كافية. يرجى تقديم أعراض فنية محددة (مثل لون السائل، تردد الصوت).',
    diagnosisLabel: lang === 'en' ? 'Diagnosis' : 'التشخيص',
    causeLabel: lang === 'en' ? 'Root Cause' : 'السبب الرئيسي',
    solutionLabel: lang === 'en' ? 'Mechanical Solution' : 'الحل الميكانيكي',
    followUpLabel: lang === 'en' ? 'Diagnostic Follow-up' : 'متابعة تشخيصية',
    scanning: lang === 'en' ? 'Scanning vehicle systems...' : 'جاري فحص أنظمة المركبة...',
    reportTitle: lang === 'en' ? 'Technical Diagnostic Report' : 'تقرير التشخيص الفني',
    history: lang === 'en' ? 'Recent Diagnostics' : 'التشخيصات الأخيرة',
    tools: lang === 'en' ? 'System Tools' : 'أدوات النظام',
    status: lang === 'en' ? 'System Online' : 'النظام متصل',
    newChat: lang === 'en' ? 'New chat' : 'محادثة جديدة',
    untitledChat: lang === 'en' ? 'Untitled chat' : 'محادثة بدون عنوان',
    resetChat: lang === 'en' ? 'Reset chat' : 'إعادة تعيين المحادثة',
    toggleSidebar: lang === 'en' ? 'Toggle sidebar' : 'فتح/إغلاق القائمة',
    closeSidebar: lang === 'en' ? 'Close sidebar' : 'إغلاق القائمة',
    noRecentOnMobile: lang === 'en' ? 'Select a chat to continue.' : 'اختر محادثة للمتابعة.',
  };
};

const safeParseJson = <T,>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const newId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createWelcomeMessage = (lang: 'en' | 'ar'): Message => {
  const t = getStrings(lang);
  return {
    id: newId(),
    type: 'bot',
    content: t.welcome,
    timestamp: Date.now(),
  };
};

const createConversation = (lang: 'en' | 'ar'): Conversation => {
  const now = Date.now();
  const t = getStrings(lang);
  return {
    id: newId(),
    title: t.newChat,
    createdAt: now,
    updatedAt: now,
    messages: [createWelcomeMessage(lang)],
    currentSymptomId: null,
    lastUserSymptomText: null,
  };
};

const sanitizeForStorage = (state: PersistedStateV1): PersistedStateV1 => {
  // Avoid persisting transient "scanning" bubbles to prevent stale UI after reload.
  return {
    ...state,
    conversations: state.conversations.map(c => ({
      ...c,
      messages: c.messages.filter(m => !m.isScanning),
    })),
  };
};

const loadPersistedState = (): PersistedStateV1 => {
  if (typeof window === 'undefined') {
    const lang: 'en' | 'ar' = 'en';
    const conversation = createConversation(lang);
    return { version: 1, lang, activeConversationId: conversation.id, conversations: [conversation] };
  }

  const parsed = safeParseJson<PersistedStateV1>(window.localStorage.getItem(STORAGE_KEY));
  const lang: 'en' | 'ar' = parsed?.lang === 'ar' || parsed?.lang === 'en' ? parsed.lang : 'en';

  if (parsed?.version === 1 && Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
    const activeExists = parsed.conversations.some(c => c.id === parsed.activeConversationId);
    return {
      version: 1,
      lang,
      activeConversationId: activeExists ? parsed.activeConversationId : parsed.conversations[0].id,
      conversations: parsed.conversations,
    };
  }

  const conversation = createConversation(lang);
  return { version: 1, lang, activeConversationId: conversation.id, conversations: [conversation] };
};

export const ChatInterface = () => {
  const [persisted, setPersisted] = useState<PersistedStateV1>(() => loadPersistedState());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const lang = persisted.lang;
  const t = useMemo(() => getStrings(lang), [lang]);

  const activeConversation = useMemo(() => {
    return (
      persisted.conversations.find(c => c.id === persisted.activeConversationId) ??
      persisted.conversations[0]
    );
  }, [persisted.activeConversationId, persisted.conversations]);

  const messages = activeConversation?.messages ?? [];

  useEffect(() => {
    // Persist conversations + language so reload doesn't lose state.
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitizeForStorage(persisted)));
    } catch {
      // Ignore storage quota or private-mode errors.
    }
  }, [persisted]);

  useEffect(() => {
    // Switching conversations should stop any in-flight typing indicator.
    setIsTyping(false);
  }, [persisted.activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  const findSymptom = (text: string): Symptom | null => {
    const lowerText = text.toLowerCase();
    return diagnosticData.find(s => 
      s.keywords.some(k => lowerText.includes(k)) || 
      s.keywordsAr.some(k => lowerText.includes(k))
    ) || null;
  };

  const postJson = async <T,>(url: string, body: unknown, timeoutMs = 12000): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      return (await res.json()) as T;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const buildHistory = (nextUserText?: string): ApiHistoryItem[] => {
    const history: ApiHistoryItem[] = [];

    const toText = (m: Message): string => {
      if (m.content?.trim()) return m.content.trim();
      if (m.diagnosis) {
        const parts = [m.diagnosis.title, m.diagnosis.cause, m.diagnosis.solution].filter(Boolean);
        return parts.join('\n');
      }
      return '';
    };

    for (const m of messages.slice(-8)) {
      if (m.isScanning) continue;
      const content = toText(m);
      if (!content) continue;
      history.push({ role: m.type === 'user' ? 'user' : 'assistant', content });
    }

    if (nextUserText?.trim()) {
      history.push({ role: 'user', content: nextUserText.trim() });
    }

    return history;
  };

  const diagnoseViaApi = async (text: string) => {
    return await postJson<DiagnoseResponse>('/api/diagnose', { text, lang, history: buildHistory(text) });
  };

  const followUpViaApi = async (symptomId: string, optionId: string) => {
    return await postJson<FollowUpResponse>('/api/follow-up', { symptomId, optionId, lang });
  };

  const updateActiveConversation = (updater: (c: Conversation) => Conversation) => {
    setPersisted(prev => ({
      ...prev,
      conversations: prev.conversations.map(c => (c.id === prev.activeConversationId ? updater(c) : c)),
    }));
  };

  const setLang = (nextLang: 'en' | 'ar') => {
    setPersisted(prev => ({ ...prev, lang: nextLang }));
  };

  const startNewChat = () => {
    const conversation = createConversation(lang);
    setPersisted(prev => ({
      ...prev,
      conversations: [conversation, ...prev.conversations],
      activeConversationId: conversation.id,
    }));
    setSidebarOpen(false);
  };

  const setActiveChat = (conversationId: string) => {
    setPersisted(prev => ({ ...prev, activeConversationId: conversationId }));
    setSidebarOpen(false);
  };

  const resetActiveChat = () => {
    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: [createWelcomeMessage(lang)],
      currentSymptomId: null,
      lastUserSymptomText: null,
    }));
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: newId(),
      type: 'user',
      content: text,
      timestamp: Date.now(),
    };

    updateActiveConversation(c => {
      const isFirstUserMessage = !c.messages.some(m => m.type === 'user');
      const nextTitle = isFirstUserMessage ? (text.trim().slice(0, 48) || t.untitledChat) : c.title;
      return {
        ...c,
        title: nextTitle,
        updatedAt: Date.now(),
        lastUserSymptomText: text,
        messages: [...c.messages, userMsg],
      };
    });
    setInput('');
    setIsTyping(true);

    // Initial "thinking" delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Show "Scanning" message
    const scanningId = newId();
    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: [
        ...c.messages,
        {
          id: scanningId,
          type: 'bot',
          content: t.scanning,
          isScanning: true,
          timestamp: Date.now(),
        },
      ],
    }));

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Remove scanning and show diagnosis
    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: c.messages.filter(m => m.id !== scanningId),
    }));

    const symptom = findSymptom(text);

    let diagnosis: ApiDiagnosis | null = null;
    let apiNoMatchMessage: string | null = null;
    try {
      const apiResponse = await diagnoseViaApi(text);
      if (apiResponse.match) {
        diagnosis = apiResponse.diagnosis;
      } else {
        apiNoMatchMessage = apiResponse.message;
      }
    } catch {
      // Fall back to local expert rules if API is unavailable
    }

    if (!diagnosis && symptom) {
      diagnosis = {
        title: symptom.diagnosis[lang],
        cause: symptom.cause[lang],
        solution: symptom.solution[lang],
        followUp: symptom.followUp
          ? {
              question: symptom.followUp.question[lang],
              options: symptom.followUp.options.map(o => ({ id: o.id, label: o.label[lang] })),
            }
          : undefined,
        context: { symptomId: symptom.id },
      };
    }

    if (diagnosis) {
      const nextSymptomId = diagnosis.context?.symptomId ?? (symptom?.id ?? null);
      const botMsg: Message = {
        id: newId(),
        type: 'bot',
        content: '',
        diagnosis: {
          title: diagnosis.title,
          cause: diagnosis.cause,
          solution: diagnosis.solution,
          followUp: diagnosis.followUp,
        },
        timestamp: Date.now(),
      };
      updateActiveConversation(c => ({
        ...c,
        updatedAt: Date.now(),
        currentSymptomId: nextSymptomId,
        messages: [...c.messages, botMsg],
      }));
    } else {
      const botMsg: Message = {
        id: newId(),
        type: 'bot',
        content: apiNoMatchMessage ?? t.noMatch,
        timestamp: Date.now(),
      };
      updateActiveConversation(c => ({
        ...c,
        updatedAt: Date.now(),
        messages: [...c.messages, botMsg],
      }));
    }
    
    setIsTyping(false);
  };

  const handleFollowUp = async (optionId: string, optionLabel: string) => {
    const currentSymptomId = activeConversation?.currentSymptomId ?? null;
    const lastUserSymptomText = activeConversation?.lastUserSymptomText ?? null;
    const symptom = currentSymptomId ? (diagnosticData.find(s => s.id === currentSymptomId) || null) : null;
    const option = symptom?.followUp?.options.find(o => o.id === optionId) || null;

    const userMsg: Message = {
      id: newId(),
      type: 'user',
      content: option ? option.label[lang] : optionLabel,
      timestamp: Date.now(),
    };

    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: [...c.messages, userMsg],
    }));
    setIsTyping(true);

    const scanningId = newId();
    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: [...c.messages, { id: scanningId, type: 'bot', content: t.scanning, isScanning: true, timestamp: Date.now() }],
    }));

    await new Promise(resolve => setTimeout(resolve, 1500));

    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      messages: c.messages.filter(m => m.id !== scanningId),
    }));

    // If we have a local symptom follow-up option, use the dedicated follow-up endpoint.
    // Otherwise (Gemini-generated follow-up), treat it as a follow-up answer and re-diagnose via /api/diagnose.
    if (!currentSymptomId || !option) {
      const followUpPrefix = lang === 'ar' ? 'إجابة المتابعة:' : 'Follow-up answer:';
      const composedText = lastUserSymptomText
        ? `${lastUserSymptomText}\n${followUpPrefix} ${optionLabel}`
        : `${followUpPrefix} ${optionLabel}`;

      let diagnosis: ApiDiagnosis | null = null;
      let apiNoMatchMessage: string | null = null;
      try {
        const apiResponse = await diagnoseViaApi(composedText);
        if (apiResponse.match) {
          diagnosis = apiResponse.diagnosis;
        } else {
          apiNoMatchMessage = apiResponse.message;
        }
      } catch {
        // If API is unavailable, fall back to generic no-match
      }

      if (diagnosis) {
        const nextSymptomId = diagnosis.context?.symptomId ?? null;
        const botMsg: Message = {
          id: newId(),
          type: 'bot',
          content: '',
          diagnosis: {
            title: diagnosis.title,
            cause: diagnosis.cause,
            solution: diagnosis.solution,
            followUp: diagnosis.followUp,
          },
          timestamp: Date.now(),
        };
        updateActiveConversation(c => ({
          ...c,
          updatedAt: Date.now(),
          currentSymptomId: nextSymptomId,
          messages: [...c.messages, botMsg],
        }));
      } else {
        const botMsg: Message = {
          id: newId(),
          type: 'bot',
          content: apiNoMatchMessage ?? t.noMatch,
          timestamp: Date.now(),
        };
        updateActiveConversation(c => ({
          ...c,
          updatedAt: Date.now(),
          messages: [...c.messages, botMsg],
        }));
      }

      setIsTyping(false);
      return;
    }

    let diagnosis: { title: string; cause: string; solution: string } | null = null;
    try {
      const apiResponse = await followUpViaApi(currentSymptomId, optionId);
      diagnosis = apiResponse.diagnosis;
    } catch {
      // Fall back to local follow-up rules if API is unavailable
    }

    if (!diagnosis) {
      diagnosis = {
        title: option.diagnosis[lang],
        cause: option.cause[lang],
        solution: option.solution[lang],
      };
    }

    const botMsg: Message = {
      id: newId(),
      type: 'bot',
      content: '',
      diagnosis: {
        title: diagnosis.title,
        cause: diagnosis.cause,
        solution: diagnosis.solution,
      },
      timestamp: Date.now(),
    };
    updateActiveConversation(c => ({
      ...c,
      updatedAt: Date.now(),
      currentSymptomId: null,
      messages: [...c.messages, botMsg],
    }));
    setIsTyping(false);
  };

  const quickActions = [
    { id: '1', label: { en: "No Start", ar: "لا يشتغل" }, query: "car won't start" },
    { id: '2', label: { en: "Overheating", ar: "حرارة زائدة" }, query: "overheating" },
    { id: '3', label: { en: "Fluid Leak", ar: "تهريب زيت" }, query: "oil leak" },
    { id: '4', label: { en: "Engine Noise", ar: "صوت محرك" }, query: "engine noise" },
  ];

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden ${lang === 'ar' ? 'rtl' : 'ltr'}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Visual Overlay Effects */}
      <div className="scanline" />
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      {/* Sidebar - Desktop */}
      <aside className={`hidden lg:flex flex-col w-72 bg-slate-900 border-${lang === 'ar' ? 'l' : 'r'} border-slate-800 z-20`}>
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-600 rounded shadow-lg shadow-orange-900/20">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-lg tracking-tight">{t.title}</h2>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{t.status}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-8 mt-4">
          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <History className="w-3.5 h-3.5" /> {t.history}
            </h3>
            <div className="space-y-2">
              <button
                onClick={startNewChat}
                className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black tracking-wide transition-colors shadow-lg shadow-orange-900/20"
              >
                {t.newChat}
              </button>

              {[...persisted.conversations]
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setActiveChat(c.id)}
                    className={`w-full p-3 rounded-lg text-xs transition-colors flex items-center justify-between group border ${
                      c.id === persisted.activeConversationId
                        ? 'bg-slate-800 border-orange-500/40 text-slate-100'
                        : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate">{c.title || t.untitledChat}</span>
                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wrench className="w-3.5 h-3.5" /> {t.tools}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {['OBD-II', 'ECM', 'TCM', 'ABS'].map(tool => (
                <div key={tool} className="p-3 bg-slate-800/30 border border-slate-700/30 rounded-lg text-[10px] font-bold text-center text-slate-500">
                  {tool}
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto p-4 bg-orange-950/20 border border-orange-900/30 rounded-xl">
             <div className="flex items-center gap-2 mb-2 text-orange-500">
               <ShieldCheck className="w-4 h-4" />
               <span className="text-xs font-bold uppercase tracking-tight">Expert Verification</span>
             </div>
             <p className="text-[10px] text-slate-400 leading-relaxed">
               All diagnostic algorithms are based on certified technical mechanical manuals.
             </p>
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 text-[10px] text-slate-600 font-mono text-center">
          SYSTEM_UID: 48A-02-X9
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        {/* Header */}
        <header className="px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={t.toggleSidebar}
              title={t.toggleSidebar}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
             >
               <Menu className="w-6 h-6" />
             </button>
             <div className="lg:hidden flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                <span className="font-bold">{t.title}</span>
             </div>
             <div className="hidden lg:flex items-center gap-6">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-orange-500">PWR:</span> 100%
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                  <span className="text-orange-500">CPU:</span> 12%
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-3">
            <LanguageToggle lang={lang} setLang={setLang} />
            <button 
              onClick={resetActiveChat}
              aria-label={t.resetChat}
              title={t.resetChat}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: lang === 'ar' ? 300 : -300 }}
                animate={{ x: 0 }}
                exit={{ x: lang === 'ar' ? 300 : -300 }}
                className={`fixed top-0 bottom-0 ${lang === 'ar' ? 'right-0' : 'left-0'} w-72 bg-slate-900 z-40 lg:hidden shadow-2xl`}
              >
                <div className="p-6 flex items-center justify-between border-b border-slate-800">
                  <h2 className="font-bold">{t.title}</h2>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    aria-label={t.closeSidebar}
                    title={t.closeSidebar}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{t.history}</h3>

                  <button
                    onClick={startNewChat}
                    className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-black tracking-wide transition-colors"
                  >
                    {t.newChat}
                  </button>

                  <div className="space-y-2">
                    {[...persisted.conversations]
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveChat(c.id)}
                          className={`w-full p-3 rounded-lg text-xs transition-colors flex items-center justify-between group border ${
                            c.id === persisted.activeConversationId
                              ? 'bg-slate-800 border-orange-500/40 text-slate-100'
                              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <span className="truncate">{c.title || t.untitledChat}</span>
                          <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                  </div>

                  {persisted.conversations.length === 0 && (
                    <p className="text-xs text-slate-500 italic">{t.noRecentOnMobile}</p>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth"
        >
          <AnimatePresence mode="popLayout">
            {messages.length <= 1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto mb-8"
              >
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleSend(action.label[lang])}
                    className="flex items-center gap-4 p-4 bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-orange-500/50 rounded-xl text-left transition-all hover:shadow-lg hover:shadow-orange-500/5 group"
                  >
                    <div className="p-2 bg-slate-800 rounded group-hover:bg-orange-600 transition-colors">
                      <Gauge className="w-5 h-5 text-orange-500 group-hover:text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">{action.label[lang]}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Fast Diagnostic</div>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}

            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.type === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-4 max-w-[90%] md:max-w-[75%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center border ${
                    msg.type === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-orange-600 border-orange-400'
                  } shadow-lg shadow-black/20`}>
                    {msg.type === 'user' ? <User className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
                  </div>
                  
                  <div className={`space-y-3 ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.content && (
                      <div className={`px-5 py-4 rounded-2xl shadow-xl ${
                        msg.type === 'user' 
                          ? 'bg-orange-600 text-white rounded-tr-none' 
                          : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-800'
                      }`}>
                        {msg.isScanning ? (
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></span>
                              </div>
                              <span className="text-sm font-bold animate-pulse text-orange-400">{msg.content}</span>
                            </div>
                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 2, ease: "linear" }}
                                className="h-full bg-orange-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                        )}
                      </div>
                    )}

                    {msg.diagnosis && (
                      <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl overflow-hidden shadow-2xl max-w-lg">
                        <div className="bg-slate-800/80 px-5 py-3 border-b border-slate-700 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-orange-500" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">{t.reportTitle}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500">ID: {msg.id.slice(-6)}</span>
                        </div>
                        
                        <div className="p-6 space-y-6 relative">
                          <div className="absolute top-0 right-0 p-8 pointer-events-none opacity-[0.03]">
                            <Wrench className="w-32 h-32 rotate-12 text-white" />
                          </div>

                          <div className="relative">
                            <h3 className="text-orange-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                              <span className="w-4 h-[2px] bg-orange-500"></span> {t.diagnosisLabel}
                            </h3>
                            <p className="text-lg font-bold text-white tracking-tight">{msg.diagnosis.title}</p>
                          </div>

                          <div className="relative">
                            <h3 className="text-slate-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                              <span className="w-4 h-[2px] bg-slate-600"></span> {t.causeLabel}
                            </h3>
                            <p className="text-sm text-slate-400 font-medium leading-relaxed mono whitespace-pre-line">{msg.diagnosis.cause}</p>
                          </div>

                          <div className="relative bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50 shadow-inner">
                            <h3 className="text-green-500 text-[10px] font-black uppercase mb-2 flex items-center gap-2">
                              <span className="w-4 h-[2px] bg-green-500"></span> {t.solutionLabel}
                            </h3>
                            <p className="text-sm text-slate-200 leading-relaxed font-semibold whitespace-pre-line">
                              {msg.diagnosis.solution}
                            </p>
                          </div>

                          {msg.diagnosis.followUp && (
                            <div className="mt-8 pt-6 border-t border-slate-800">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                  <HelpCircle className="w-4 h-4 text-blue-400" />
                                </div>
                                <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-wider">{t.followUpLabel}</h3>
                              </div>
                              <p className="text-sm mb-5 text-slate-300 italic font-medium">{msg.diagnosis.followUp.question}</p>
                              <div className="flex flex-col gap-2">
                                {msg.diagnosis.followUp.options.map((opt) => (
                                  <button
                                    key={opt.id}
                                    onClick={() => handleFollowUp(opt.id, opt.label)}
                                    className="group flex items-center justify-between px-4 py-3 bg-slate-800/40 hover:bg-orange-600 border border-slate-700 hover:border-orange-500 rounded-xl transition-all text-slate-200 hover:text-white text-sm font-bold shadow-sm"
                                  >
                                    <span>{opt.label}</span>
                                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <span className="text-[10px] text-slate-600 font-mono block px-1">
                      TIME: {new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {isTyping && !messages[messages.length-1]?.isScanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center shadow-lg">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Input Form */}
        <div className="p-6 bg-slate-900 border-t border-slate-800">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(input);
            }}
            className="max-w-4xl mx-auto relative group"
          >
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
               <Settings className="w-5 h-5 text-slate-600 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.placeholder}
              className={`w-full bg-slate-800/50 border-2 border-slate-800 rounded-2xl py-4 focus:outline-none focus:border-orange-500/50 focus:bg-slate-800 transition-all text-slate-100 placeholder-slate-600 shadow-inner text-base font-medium ${
                lang === 'ar' ? 'pr-12 pl-16' : 'pl-12 pr-16'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              aria-label={lang === 'ar' ? 'إرسال' : 'Send'}
              title={lang === 'ar' ? 'إرسال' : 'Send'}
              className={`absolute top-2.5 bottom-2.5 px-5 bg-orange-600 hover:bg-orange-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all flex items-center justify-center shadow-lg active:scale-95 ${
                lang === 'ar' ? 'left-2.5' : 'right-2.5'
              }`}
            >
              <Send className={`w-5 h-5 ${lang === 'ar' ? 'rotate-180' : ''}`} />
            </button>
          </form>
          <div className="max-w-4xl mx-auto mt-4 flex justify-between items-center text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            <span>Core: Diagnostics_v1.0.4</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full" /> Encrypted</span>
              <span className="flex items-center gap-1"><div className="w-1 h-1 bg-green-500 rounded-full" /> Verfied</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
