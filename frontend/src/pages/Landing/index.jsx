import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Shield, Globe, Brain, BarChart3,
  CreditCard, TrendingUp, Wallet, Lock, Zap,
  Users, Clock, CheckCircle2, Landmark, Bot,
  Smartphone, ChevronRight, Star,
} from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import FadeInView from '@/components/animations/FadeInView';
import AnimatedCounter from '@/components/animations/AnimatedCounter';
import { FlickeringGrid } from '@/components/animations/FlickeringGrid';
import { FloatingCard, GlowingOrb } from '@/components/animations/FloatingElements';
import { useTheme } from '@/context/ThemeContext';
import useAuthStore from '@/stores/authStore';
import { SpiralAnimation } from '@/components/ui/SpiralAnimation';
import BlurText from '@/components/ui/BlurText';

// ======================== HERO SECTION ========================
function HeroSection() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuthStore();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 200]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden pt-16 bg-background">
      {/* Spiral Animation Background */}
      {theme === 'dark' && (
        <div className="absolute inset-0 z-0 opacity-40">
          <SpiralAnimation />
        </div>
      )}

      {/* Flickering Grid Background */}
      <div className="absolute inset-0 z-0 opacity-30 dark:opacity-100">
        <FlickeringGrid
          color={theme === 'dark' ? 'rgb(28, 156, 240)' : 'rgb(30, 157, 241)'}
          maxOpacity={theme === 'dark' ? 0.12 : 0.08}
          flickerChance={0.1}
          squareSize={4}
          gridGap={6}
          className="[mask-image:radial-gradient(800px_circle_at_center,white,transparent)]"
        />
      </div>

      {/* Glowing Orbs */}
      <GlowingOrb color="#1c9cf0" size={500} className="top-20 -left-40" />
      <GlowingOrb color="#00b87a" size={400} className="bottom-20 -right-40" />
      <GlowingOrb color="#1c9cf0" size={300} className="top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

      <motion.div style={{ y, opacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-6"
            >
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Now with AI-Powered Insights</span>
            </motion.div>

            <BlurText
              text="Banking Reimagined for the Digital Age"
              delay={150}
              animateBy="words"
              direction="top"
              className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight tracking-tight text-foreground dark:text-white"
            />

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0"
            >
              Experience next-gen digital banking with multi-currency accounts, AI chatbot,
              real-time analytics, fraud detection, and smart budget tracking — all in one platform.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5 }}
              className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="glow" size="xl" className="w-full sm:w-auto group">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="glow" size="xl" className="w-full sm:w-auto group">
                      Open Free Account
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="xl" className="w-full sm:w-auto">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>

            {/* Trust indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="mt-8 flex items-center gap-6 justify-center lg:justify-start text-sm text-muted-foreground"
            >
              {[
                { icon: Shield, text: 'Bank-grade Security' },
                { icon: Clock, text: '24/7 Support' },
                { icon: Globe, text: 'Multi-Currency' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                  <span>{text}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — Dashboard Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50, rotateY: 10 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.9, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <FloatingCard className="relative" delay={0}>
              {/* Main Dashboard Card */}
              <div className="relative rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/5">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Balance</p>
                    <p className="text-2xl font-bold text-foreground">$47,250.00</p>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                </div>

                {/* Mini Chart */}
                <div className="h-24 mb-4 flex items-end gap-1">
                  {[40, 60, 45, 70, 55, 80, 65, 90, 75, 95, 85, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      className="flex-1 rounded-t-sm bg-primary/20"
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      transition={{ duration: 0.5, delay: 0.6 + i * 0.05 }}
                    >
                      <div
                        className="w-full rounded-t-sm bg-primary"
                        style={{ height: '60%' }}
                      />
                    </motion.div>
                  ))}
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Income', value: '+$12,400', color: 'text-success' },
                    { label: 'Spending', value: '-$8,200', color: 'text-destructive' },
                    { label: 'Savings', value: '$4,200', color: 'text-primary' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`text-sm font-semibold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FloatingCard>

            {/* Floating Mini Cards */}
            <FloatingCard delay={1} className="absolute -top-4 -right-4">
              <div className="rounded-xl border border-border bg-card p-3 shadow-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs font-medium">Transfer Complete</p>
                  <p className="text-xs text-muted-foreground">$2,500 sent</p>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard delay={2} className="absolute -bottom-4 -left-4">
              <div className="rounded-xl border border-border bg-card p-3 shadow-lg flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium">AI Insight</p>
                  <p className="text-xs text-muted-foreground">Spending ↓ 12%</p>
                </div>
              </div>
            </FloatingCard>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// ======================== FEATURES SECTION ========================
const features = [
  {
    icon: Globe,
    title: 'Multi-Currency Accounts',
    desc: 'Hold and manage USD, EUR, GBP, INR, PKR with real-time conversion rates.',
    color: '#1c9cf0',
  },
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    desc: 'Smart chatbot and spending analysis powered by advanced AI models.',
    color: '#00b87a',
  },
  {
    icon: Shield,
    title: 'Fraud Detection',
    desc: 'Real-time fraud monitoring with velocity checks and suspicious pattern alerts.',
    color: '#f4212e',
  },
  {
    icon: BarChart3,
    title: 'Budget Tracking',
    desc: 'Set category budgets, track spending, and get alerts before overspending.',
    color: '#f7b928',
  },
  {
    icon: TrendingUp,
    title: 'Investment Portfolio',
    desc: 'Track stocks, bonds, crypto, and mutual funds with risk analysis.',
    color: '#17bf63',
  },
  {
    icon: Lock,
    title: 'Bank-Grade Security',
    desc: 'OTP verification, 2FA, JWT tokens, and encrypted transactions.',
    color: '#e0245e',
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInView>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">Features</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-3">
              Everything You Need in{' '}
              <span className="text-gradient">One Platform</span>
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              From everyday banking to investment management — powered by AI and secured by design.
            </p>
          </div>
        </FadeInView>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <FadeInView key={feature.title} delay={i * 0.1}>
              <Card hover className="h-full group relative overflow-hidden">
                {/* Hover glow effect */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{
                    background: `radial-gradient(400px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), ${feature.color}10, transparent)`,
                  }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                  }}
                />
                <div className="relative z-10">
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300"
                    style={{ backgroundColor: `${feature.color}15` }}
                  >
                    <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              </Card>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================== HOW IT WORKS ========================
const steps = [
  {
    step: '01',
    icon: Smartphone,
    title: 'Create Account',
    desc: 'Sign up with email, Google, or GitHub. Complete KYC verification for full access.',
  },
  {
    step: '02',
    icon: Wallet,
    title: 'Fund & Manage',
    desc: 'Open multi-currency accounts, set budgets, and link your investment portfolio.',
  },
  {
    step: '03',
    icon: Zap,
    title: 'Bank Smarter',
    desc: 'Transfer money, track spending, get AI insights, and grow your wealth.',
  },
];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInView>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">How It Works</span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-3">
              Get Started in{' '}
              <span className="text-gradient">3 Simple Steps</span>
            </h2>
          </div>
        </FadeInView>

        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

          {steps.map((step, i) => (
            <FadeInView key={step.step} delay={i * 0.2}>
              <div className="text-center relative">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-6 relative z-10"
                >
                  <step.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {step.step}
                  </span>
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                  {step.desc}
                </p>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================== STATS SECTION ========================
const stats = [
  { value: 50000, suffix: '+', label: 'Active Users', icon: Users },
  { value: 100, prefix: '$', suffix: 'M+', label: 'Processed', icon: CreditCard },
  { value: 99, suffix: '.9%', label: 'Uptime', icon: Zap },
  { value: 8, suffix: '+', label: 'Currencies', icon: Globe },
];

function StatsSection() {
  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <FadeInView key={stat.label} delay={i * 0.1}>
              <div className="text-center p-6 rounded-2xl bg-card border border-border hover:border-primary/20 transition-colors">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-foreground">
                  <AnimatedCounter
                    value={stat.value}
                    prefix={stat.prefix || ''}
                    suffix={stat.suffix || ''}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================== TESTIMONIALS ========================
const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Freelance Designer',
    avatar: 'SJ',
    content:
      'FinSync completely changed how I manage my multi-currency income. The AI insights help me save 30% more each month!',
    rating: 5,
  },
  {
    name: 'Ahmed Khan',
    role: 'Software Engineer',
    avatar: 'AK',
    content:
      'The fraud detection caught a suspicious transaction within seconds. I feel incredibly safe banking with FinSync.',
    rating: 5,
  },
  {
    name: 'Maria Garcia',
    role: 'Small Business Owner',
    avatar: 'MG',
    content:
      'Budget tracking and investment portfolio in one app — exactly what I needed. The AI chatbot is surprisingly helpful!',
    rating: 5,
  },
];

function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-24 bg-card/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeInView>
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-primary text-sm font-semibold uppercase tracking-widest">
              Testimonials
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mt-3">
              Loved by{' '}
              <span className="text-gradient">Thousands</span>
            </h2>
          </div>
        </FadeInView>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <FadeInView key={t.name} delay={i * 0.15}>
              <Card hover className="h-full flex flex-col">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3 mt-6 pt-4 border-t border-border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </Card>
            </FadeInView>
          ))}
        </div>
      </div>
    </section>
  );
}

// ======================== CTA SECTION ========================
function CTASection() {
  const { theme } = useTheme();
  const { isAuthenticated } = useAuthStore();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background effect */}
      <div className="absolute inset-0 z-0">
        <FlickeringGrid
          color={theme === 'dark' ? 'rgb(28, 156, 240)' : 'rgb(30, 157, 241)'}
          maxOpacity={0.08}
          flickerChance={0.08}
          squareSize={3}
          gridGap={8}
          className="[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]"
        />
      </div>

      <GlowingOrb color="#1c9cf0" size={400} className="top-0 left-1/2 -translate-x-1/2" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeInView>
          <div className="bg-card/80 backdrop-blur-xl border border-border rounded-3xl p-8 sm:p-12 lg:p-16">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 overflow-hidden"
            >
              <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain" />
            </motion.div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Ready to{' '}
              <span className="text-gradient">Take Control?</span>
            </h2>

            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of users who trust FinSync for smarter banking.
              Open your free account in under 2 minutes.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="glow" size="xl" className="w-full sm:w-auto group">
                    Return to Dashboard
                    <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="glow" size="xl" className="w-full sm:w-auto group">
                      Get Started Free
                      <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button variant="outline" size="xl" className="w-full sm:w-auto">
                      I Already Have an Account
                    </Button>
                  </Link>
                </>
              )}
            </div>

            <p className="mt-6 text-xs text-muted-foreground">
              No credit card required • Free forever plan • Cancel anytime
            </p>
          </div>
        </FadeInView>
      </div>
    </section>
  );
}

// ======================== MAIN LANDING PAGE ========================
export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <StatsSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}