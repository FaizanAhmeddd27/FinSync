import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Shield, TrendingUp, Wallet, PieChart, ChevronLeft, ChevronRight, Landmark } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const cardsData = [
  {
    id: 1,
    title: 'Checking Account',
    icon: Landmark,
    value: '$12,450',
    progress: 100,
    desc: 'Main account balance',
    color: 'var(--primary)',
  },
  {
    id: 2,
    title: 'Savings Goal',
    icon: Wallet,
    value: '85%',
    progress: 85,
    desc: 'Reach your goal',
    color: 'var(--success)',
  },
  {
    id: 3,
    title: 'Monthly Spending',
    icon: PieChart,
    value: '$2,800',
    progress: 62,
    desc: 'Monthly budget status',
    color: 'var(--warning)',
  },
  {
    id: 4,
    title: 'Security Score',
    icon: Shield,
    value: '98%',
    progress: 98,
    desc: 'Account is secure',
    color: 'var(--success)',
  },
];

export default function StackedFinanceCards() {
  const [index, setIndex] = useState(0);
  const { theme } = useTheme();

  const next = () => setIndex((prev) => (prev + 1) % cardsData.length);
  const prev = () => setIndex((prev) => (prev - 1 + cardsData.length) % cardsData.length);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-md mx-auto relative overflow-visible">
      <div className="relative w-full aspect-[4/3] sm:h-[320px] flex items-center justify-center">
        <AnimatePresence mode="popLayout">
          {cardsData.map((card, i) => {
            const isFront = i === index;
            const isSecond = i === (index + 1) % cardsData.length;
            const isThird = i === (index + 2) % cardsData.length;

            if (!isFront && !isSecond && !isThird) return null;

            let zIndex = 0;
            let scale = 1;
            let yOffset = 0;
            let opacity = 1;

            if (isFront) {
              zIndex = 30;
              scale = 1;
              yOffset = 0;
              opacity = 1;
            } else if (isSecond) {
              zIndex = 20;
              scale = 0.95;
              yOffset = 20;
              opacity = 0.6;
            } else if (isThird) {
              zIndex = 10;
              scale = 0.9;
              yOffset = 40;
              opacity = 0.3;
            }

            return (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{
                  opacity,
                  scale,
                  y: yOffset,
                  zIndex,
                }}
                exit={{ opacity: 0, x: -150, transition: { duration: 0.6, ease: "easeInOut" } }}
                transition={{ type: 'spring', stiffness: 150, damping: 20 }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -50) next();
                  else if (info.offset.x > 50) prev();
                }}
                className={`absolute w-full h-full rounded-3xl border border-white/10 ${
                  theme === 'dark' ? 'bg-white/10 backdrop-blur-xl' : 'bg-black/5 backdrop-blur-xl'
                } p-6 sm:p-8 shadow-2xl flex flex-col justify-between cursor-grab active:cursor-grabbing overflow-hidden`}
              >
                {/* Only Show Content for Front Card to avoid clutter */}
                <div className={`flex flex-col h-full justify-between transition-opacity duration-300 ${isFront ? 'opacity-100' : 'opacity-0'}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                      <card.icon className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: card.color }} />
                    </div>
                    <h3 className="text-sm sm:text-lg font-medium text-foreground/90">{card.title}</h3>
                  </div>

                  <div>
                    <div className="text-4xl sm:text-6xl font-bold text-foreground mb-4">{card.value}</div>
                    <div className="w-full h-1.5 sm:h-2 bg-foreground/10 rounded-full overflow-hidden mb-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: isFront ? `${card.progress}%` : 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: card.color }}
                      />
                    </div>
                    {isFront && (
                      <p className="text-xs sm:text-sm text-foreground/60">{card.desc}</p>
                    )}
                  </div>

                  <div className="pt-4 border-t border-foreground/5 opacity-0">
                    {/* Placeholder to keep layout consistent */}
                    <div className="h-4" />
                  </div>
                </div>

                {/* Simplified view for background cards */}
                {!isFront && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <card.icon className="h-12 w-12 opacity-10" style={{ color: card.color }} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-6 mt-20 sm:mt-16">
        <button
          onClick={prev}
          className="p-2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        
        <div className="flex gap-2">
          {cardsData.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                i === index ? 'w-6 bg-primary' : 'w-2 bg-foreground/20'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="p-2 text-foreground/40 hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
