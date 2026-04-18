type DeveloperLandingProps = {
  onStart?: () => void;
};

type Developer = {
  name: string;
  role: string;
  highlights: string;
};

const DEVELOPERS: Developer[] = [
  {
    name: 'Mahmoud Sabry Elkhawas',
    role: 'Lead Software Engineer & Architect',
    highlights: 'Architecture • Semantic Analysis • Intermediate Representation (IR)',
  },
  {
    name: 'Abdelrahman Zakaria',
    role: 'Compiler Engineer',
    highlights: 'Lexical & Syntax Analysis • Code Generation (Assembly) • Parsing',
  },
  {
    name: 'Abdelrahman Adel',
    role: 'Frontend Developer',
    highlights: 'Web Interfaces • User-friendly VSC-like Environment',
  },
];

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase();
};

export function DeveloperLanding({ onStart }: DeveloperLandingProps) {
  return (
    <div className="h-screen w-full overflow-auto">
      <div className="relative min-h-screen w-full rtl">
        <div className="absolute inset-0 mechanical-gradient" />
        <div className="absolute inset-0 hazard-pattern" />
        <div className="scanline" />

        <div className="relative mx-auto min-h-screen w-full max-w-6xl px-6 py-8">
          <header className="sticky top-0 z-20 -mx-6 mb-10 border-b border-slate-800 bg-slate-950/60 px-6 py-4 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40">
                  <span className="mono text-sm font-bold text-orange-400">EA</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-extrabold tracking-tight">ElOsta Auto</span>
                  <span className="text-xs text-slate-400">Developer Landing</span>
                </div>
              </div>

              {onStart ? (
                <button
                  type="button"
                  onClick={onStart}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-orange-400"
                >
                  فتح نظام التشخيص
                </button>
              ) : null}
            </div>
          </header>

          <main className="mx-auto flex w-full max-w-6xl flex-col gap-10">
            <section className="rounded-3xl border border-slate-800 bg-slate-950/50 p-8">
              <div className="flex flex-col gap-4">
                <p className="mono text-xs text-orange-400">CAR DIAGNOSIS • AI PROMPT • DEV BUILD</p>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  تشخيص السيارات. بشكل أدق.
                </h1>
                <p className="max-w-3xl text-slate-300">
                  صفحة تعريف للمطورين وتجربة دخول سريعة للنظام. الواجهة هنا هدفها تقديم المشروع بشكل مرتب
                  وواضح—بنفس روح الصفحات الاحترافية.
                </p>

                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  {onStart ? (
                    <button
                      type="button"
                      onClick={onStart}
                      className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 hover:bg-orange-400"
                    >
                      ابدأ التشخيص الآن
                    </button>
                  ) : null}

                  <a
                    href="#team"
                    className="rounded-xl border border-slate-800 bg-slate-950/40 px-5 py-3 font-semibold text-slate-100 hover:bg-slate-900/40"
                  >
                    تعرف على الفريق
                  </a>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-sm font-bold">واجهة واضحة</div>
                    <div className="mt-1 text-sm text-slate-300">تقسيم بصري مرتب ومناسب للشاشات المختلفة.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-sm font-bold">تجربة دخول سريعة</div>
                    <div className="mt-1 text-sm text-slate-300">زر واحد للانتقال للنظام الحالي بدون تعقيد.</div>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="text-sm font-bold">فريق واضح</div>
                    <div className="mt-1 text-sm text-slate-300">كروت تعريف بسيطة بأسماء وأدوار المطورين.</div>
                  </div>
                </div>
              </div>
            </section>

            <section id="team" className="rounded-3xl border border-slate-800 bg-slate-950/50 p-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight">فريق التطوير</h2>
                  <p className="mt-1 text-sm text-slate-300">البيانات مستوحاة من الموقع المرجعي</p>
                </div>
                <div className="hidden text-sm text-slate-400 sm:block">{DEVELOPERS.length} أعضاء</div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {DEVELOPERS.map(dev => (
                  <article
                    key={dev.name}
                    className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60">
                        <span className="mono text-sm font-bold text-orange-400">{getInitials(dev.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="ltr truncate text-base font-bold">{dev.name}</div>
                        <div className="ltr mt-1 text-sm text-slate-300">{dev.role}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                      <div className="mono text-xs text-slate-300">{dev.highlights}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <footer className="pb-10 text-sm text-slate-400">
              <span className="ltr">© {new Date().getFullYear()} ElOsta Auto</span>
            </footer>
          </main>
        </div>
      </div>
    </div>
  );
}
