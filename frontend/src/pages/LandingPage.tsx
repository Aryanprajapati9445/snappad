import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  Brain, Link2, Image, FileText, Search, Tag, Zap, Shield,
  ArrowRight, Star, CheckCircle, Globe,
  ChevronDown, Sparkles, Database, ExternalLink, Mail
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';

// ─── Reusable animated section wrapper ───────────────────────────────────────
function FadeInSection({ children, delay = 0, className = '' }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const [ref, inView] = useInView({ threshold: 0.15, triggerOnce: true });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature card ────────────────────────────────────────────────────────────
const features = [
  { icon: Brain,     color: '#818cf8', bg: 'rgba(129,140,248,0.12)', title: 'Smart Capture',     desc: 'Instantly save notes, links, images, and files with intelligent type detection and auto-tagging.' },
  { icon: Link2,     color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  title: 'Link Intelligence', desc: 'Automatic metadata extraction — title, description, favicon, and preview image from any URL.' },
  { icon: Search,    color: '#34d399', bg: 'rgba(52,211,153,0.12)',  title: 'Full-text Search',  desc: 'Instantly search across everything in your vault. Find any piece of knowledge in milliseconds.' },
  { icon: Tag,       color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  title: 'Hashtag System',   desc: 'Organize with #hashtags inline. Filter your entire vault by any combination of tags.' },
  { icon: Shield,    color: '#f472b6', bg: 'rgba(244,114,182,0.12)', title: 'Private & Secure',  desc: 'Your vault, your data. JWT authentication with refresh tokens and encrypted storage.' },
  { icon: Zap,       color: '#facc15', bg: 'rgba(250,204,21,0.12)',  title: 'Browser Extension', desc: 'Save anything from any webpage with one click. Right-click context menu + quick-save popup.' },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const steps = [
  { n: '01', icon: Globe,    title: 'Capture Anything',  desc: 'Paste a URL, type a note, drop an image, or use the browser extension to save any page with one click.' },
  { n: '02', icon: Tag,      title: 'Auto-Organize',     desc: 'Content is automatically tagged, categorized, and enriched with metadata. Add your own #hashtags inline.' },
  { n: '03', icon: Search,   title: 'Find Instantly',    desc: 'Full-text search and tag filtering surface exactly what you need the moment you need it.' },
];

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
  { name: 'Aria Chen',   role: 'Product Designer',          avatar: 'AC', text: "This is the knowledge tool I've been looking for. The browser extension makes saving effortless." },
  { name: 'Kiran Shah', role: 'Software Engineer',          avatar: 'KS', text: "The link intelligence feature is incredible. It pulls titles, descriptions, everything automatically." },
  { name: 'Maya Ross',  role: 'Research Scientist',         avatar: 'MR', text: "Finally, a personal knowledge base that feels modern and fast. The search is instant and accurate." },
];

// ─── Animated gradient orb ───────────────────────────────────────────────────
function GlowOrb({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`absolute rounded-full blur-3xl pointer-events-none ${className}`}
      style={{ animation: 'pulse 8s ease-in-out infinite', ...style }}
    />
  );
}

// ─── Floating demo card ──────────────────────────────────────────────────────
function DemoCard({ delay, icon: Icon, type, title, meta, color }: {
  delay: number; icon: typeof Link2; type: string; title: string; meta: string; color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="glass-card p-3.5 flex items-start gap-3 cursor-default"
      style={{ minWidth: '260px' }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
            style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
            {type}
          </span>
        </div>
        <p className="text-sm font-medium text-slate-200 truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate mt-0.5">{meta}</p>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#080f1e' }}>

      {/* ── Navigation ─────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: 'rgba(8,15,30,0.7)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            <Brain size={16} color="white" />
          </div>
          <span className="font-bold text-sm text-gradient">Snappad</span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
          {['Features', 'How It Works', 'Extension'].map((item) => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`}
              className="hover:text-slate-100 transition-colors duration-200">
              {item}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login"
            className="text-sm text-slate-400 hover:text-slate-100 transition-colors px-3 py-1.5">
            Sign In
          </Link>
          <Link to="/register"
            className="btn-primary !py-1.5 !px-4 !text-sm">
            Get Started
            <ArrowRight size={14} />
          </Link>
        </div>
      </motion.nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center pt-16 overflow-hidden">
        {/* Background orbs */}
        <GlowOrb className="w-[600px] h-[600px] top-[-200px] left-[-200px]"
          style={{ background: 'radial-gradient(circle,rgba(99,102,241,0.18) 0%,transparent 70%)' } as React.CSSProperties} />
        <GlowOrb className="w-[500px] h-[500px] bottom-[-100px] right-[-150px]"
          style={{ background: 'radial-gradient(circle,rgba(59,130,246,0.15) 0%,transparent 70%)' } as React.CSSProperties} />

        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
            `,
            backgroundSize: '64px 64px',
          }} />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center px-6 max-w-5xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: 'rgba(99,102,241,0.12)',
              border: '1px solid rgba(99,102,241,0.3)',
              color: '#a5b4fc',
            }}
          >
            <Sparkles size={12} />
            Clip it. Don't lose it.
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none mb-6"
          >
            <span className="text-white">Save everything.</span>
            <br />
            <span className="text-gradient" style={{
              background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              Find it instantly.
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Save anything. Find it fast. Snappad captures links, notes,
            images and files — and makes everything searchable in milliseconds.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <Link to="/register"
              className="btn-primary !px-7 !py-3 !text-base"
              style={{ boxShadow: '0 0 40px rgba(99,102,241,0.4)' }}>
              Start for free
              <ArrowRight size={18} />
            </Link>
            <Link to="/login"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-lg text-base font-medium text-slate-300 hover:text-slate-100 transition-colors"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              Sign in
            </Link>
          </motion.div>

          {/* Social proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex items-center justify-center gap-6 mt-12 text-xs text-slate-500"
          >
            {[
              { icon: CheckCircle, text: 'No credit card required' },
              { icon: Shield,      text: 'Private & encrypted' },
              { icon: Zap,         text: 'Instant search' },
            ].map(({ icon: I, text }) => (
              <span key={text} className="flex items-center gap-1.5">
                <I size={13} className="text-indigo-400" />
                {text}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Floating demo cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 mt-16 flex flex-col items-center gap-3 px-6"
          style={{ maxWidth: '600px', width: '100%' }}
        >
          <DemoCard delay={1.0} icon={Link2}    type="Link"  color="#38bdf8" title="How to build a second brain at scale" meta="fortelabs.com · saved 2m ago" />
          <DemoCard delay={1.1} icon={FileText} type="Note"  color="#818cf8" title="Meeting notes: Product roadmap Q2 2025 #planning #product" meta="Note · Tagged: planning, product" />
          <DemoCard delay={1.2} icon={Image}    type="Image" color="#34d399" title="System architecture diagram.png" meta="1.4 MB · AWS S3 · saved today" />
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown size={20} className="text-slate-600" />
        </motion.div>
      </section>

      {/* ── Features ───────────────────────────────────────── */}
      <section id="features" className="py-32 px-6 max-w-7xl mx-auto">
        <FadeInSection className="text-center mb-20">
          <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4 block">Features</span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
            Everything your knowledge needs
          </h2>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Built for speed. Designed for clarity. No bloat, no friction.
          </p>
        </FadeInSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <FadeInSection key={f.title} delay={i * 0.08}>
              <motion.div
                whileHover={{ y: -6, scale: 1.015 }}
                transition={{ duration: 0.3 }}
                className="glass-card p-6 h-full group"
                style={{ border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110"
                  style={{ background: f.bg, border: `1px solid ${f.color}30` }}>
                  <f.icon size={20} style={{ color: f.color }} />
                </div>
                <h3 className="text-base font-semibold text-slate-100 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 relative overflow-hidden" style={{ background: 'rgba(15,23,42,0.5)' }}>
        <GlowOrb className="w-[600px] h-[400px] top-0 left-1/2 -translate-x-1/2"
          style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.1) 0%,transparent 70%)' } as React.CSSProperties} />

        <div className="max-w-5xl mx-auto relative z-10">
          <FadeInSection className="text-center mb-20">
            <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4 block">How It Works</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
              Three steps to a smarter vault
            </h2>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-8 left-[16.67%] right-[16.67%] h-px"
              style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.4),transparent)' }} />

            {steps.map((step, i) => (
              <FadeInSection key={step.n} delay={i * 0.15}>
                <motion.div whileHover={{ y: -4 }} className="flex flex-col items-center text-center p-6 relative">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 relative"
                    style={{
                      background: 'rgba(99,102,241,0.12)',
                      border: '1px solid rgba(99,102,241,0.25)',
                      boxShadow: '0 0 40px rgba(99,102,241,0.15)',
                    }}>
                    <step.icon size={24} className="text-indigo-400" />
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff' }}>
                      {i + 1}
                    </div>
                  </div>
                  <div className="text-xs font-bold tracking-widest text-indigo-500 mb-2">{step.n}</div>
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">{step.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Extension highlight ────────────────────────────── */}
      <section id="extension" className="py-32 px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <FadeInSection>
            <span className="text-xs font-semibold tracking-widest uppercase text-indigo-400 mb-4 block">Browser Extension</span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Save from anywhere,<br />
              <span className="text-gradient">without breaking flow</span>
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Install the Chrome extension and save any page, selection, or image directly to your vault
              with a single click — no tab switching required.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Quick-save popup pre-fills the current tab URL',
                'Right-click any page, text selection, or image',
                'In-page toast confirms every save instantly',
                'View your 8 most recent items from the popup',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle size={16} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </FadeInSection>

          {/* Extension mock */}
          <FadeInSection delay={0.2}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-6"
              style={{
                background: 'rgba(20,30,50,0.7)',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 0 60px rgba(99,102,241,0.12)',
              }}
            >
              {/* Mock extension header */}
              <div className="flex items-center justify-between mb-5 pb-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                    <Brain size={12} color="white" />
                  </div>
                  <span className="text-xs font-bold text-gradient">Snappad</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)', fontSize: '9px', color: '#fff', fontWeight: 700 }}>
                    A
                  </div>
                  <span className="text-slate-400 text-xs">Aryan</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex mb-4 rounded-md overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15,23,42,0.4)' }}>
                {['💾 Save', '🕐 Recent'].map((tab, i) => (
                  <button key={tab} onClick={() => setActiveTab(i)}
                    className="flex-1 py-2 text-xs font-semibold transition-all"
                    style={{
                      background: activeTab === i ? 'rgba(99,102,241,0.15)' : 'transparent',
                      color: activeTab === i ? '#a5b4fc' : '#64748b',
                      borderBottom: activeTab === i ? '2px solid #6366f1' : '2px solid transparent',
                    }}>
                    {tab}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 0 ? (
                  <motion.div key="save"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                    className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs text-slate-500 uppercase tracking-widest font-semibold">URL</label>
                        <button className="text-xs text-indigo-400 flex items-center gap-1 px-2 py-0.5 rounded"
                          style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
                          <Globe size={9} /> Import tab
                        </button>
                      </div>
                      <div className="rounded-md px-3 py-2 text-xs text-slate-300 truncate"
                        style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        https://github.com/trending
                      </div>
                    </div>
                    <div className="rounded-md px-3 py-2 text-xs text-slate-500"
                      style={{ background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      + add tag
                    </div>
                    <button className="w-full py-2 rounded-md text-xs font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 2px 12px rgba(99,102,241,0.4)' }}>
                      💾 Save to Vault
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="recent"
                    initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                    className="space-y-2">
                    {[
                      { icon: Link2, color: '#38bdf8', title: 'GitHub Trending', meta: '2m ago' },
                      { icon: FileText, color: '#818cf8', title: 'Meeting notes Q2', meta: '1h ago' },
                      { icon: Image, color: '#34d399', title: 'Architecture diagram', meta: '3h ago' },
                    ].map((item) => (
                      <div key={item.title} className="flex items-center gap-2.5 p-2.5 rounded-md cursor-pointer"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <item.icon size={13} style={{ color: item.color }} />
                        <span className="text-xs text-slate-300 flex-1 truncate">{item.title}</span>
                        <span className="text-xs text-slate-600">{item.meta}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </FadeInSection>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(10,18,35,0.6)' }}>
        <div className="max-w-5xl mx-auto">
          <FadeInSection className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Loved by knowledge builders</h2>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
              ))}
              <span className="text-slate-500 text-sm ml-2">from early users</span>
            </div>
          </FadeInSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <FadeInSection key={t.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -4 }} className="glass-card p-6 h-full flex flex-col gap-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} size={12} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#6366f1,#3b82f6)' }}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{t.name}</p>
                      <p className="text-xs text-slate-500">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ──────────────────────────────────────── */}
      <section className="py-14 px-6 border-y" style={{ borderColor: 'rgba(255,255,255,0.05)', background: 'rgba(15,23,42,0.3)' }}>
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '∞', label: 'Items to save',    color: '#818cf8' },
            { value: '< 1s', label: 'Search latency', color: '#38bdf8' },
            { value: '100%', label: 'Private',         color: '#34d399' },
            { value: 'Free', label: 'To get started',  color: '#fb923c' },
          ].map((stat, i) => (
            <FadeInSection key={stat.label} delay={i * 0.1}>
              <p className="text-3xl font-extrabold mb-1" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-sm text-slate-500">{stat.label}</p>
            </FadeInSection>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden text-center">
        <GlowOrb className="w-[800px] h-[400px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(ellipse,rgba(99,102,241,0.18) 0%,transparent 70%)' } as React.CSSProperties} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <FadeInSection>
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
              <Database size={12} />
              Start building your second brain
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
              Don't bookmark.
              <br />
              <span style={{
                background: 'linear-gradient(135deg,#60a5fa,#a78bfa,#f472b6)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                Own it.
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-10">
              Save anything. Find it fast. Sign up in seconds — no credit card, no bloat.
            </p>
            <Link to="/register"
              className="btn-primary !px-10 !py-4 !text-base inline-flex"
              style={{ boxShadow: '0 0 60px rgba(99,102,241,0.4)' }}>
              Create free account
              <ArrowRight size={18} />
            </Link>
          </FadeInSection>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="py-10 px-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
              <Brain size={13} color="white" />
            </div>
            <span className="font-bold text-sm text-gradient">Snappad</span>
          </div>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Snappad. Built with ❤️ using React, Vite &amp; MongoDB.
          </p>
          <div className="flex items-center gap-4 text-slate-600">
            <a href="#" className="hover:text-slate-300 transition-colors"><ExternalLink size={16} /></a>
            <a href="#" className="hover:text-slate-300 transition-colors"><Mail size={16} /></a>
            <Link to="/login" className="text-xs hover:text-slate-300 transition-colors">Sign In</Link>
            <Link to="/register" className="text-xs hover:text-slate-300 transition-colors">Register</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
