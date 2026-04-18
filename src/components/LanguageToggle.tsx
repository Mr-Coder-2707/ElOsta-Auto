
import React from 'react';
import { Languages } from 'lucide-react';

interface LanguageToggleProps {
  lang: 'en' | 'ar';
  setLang: (lang: 'en' | 'ar') => void;
}

export const LanguageToggle: React.FC<LanguageToggleProps> = ({ lang, setLang }) => {
  return (
    <div className="flex items-center gap-1 bg-slate-950/50 p-1 rounded-xl border border-slate-800 shadow-inner">
      <div className="p-1.5 text-slate-500">
        <Languages className="w-4 h-4" />
      </div>
      <button
        onClick={() => setLang('en')}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all ${
          lang === 'en' 
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLang('ar')}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
          lang === 'ar' 
            ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        عربي
      </button>
    </div>
  );
};
