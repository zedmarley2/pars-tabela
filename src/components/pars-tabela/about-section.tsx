'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface AboutContent {
  text1?: string;
  text2?: string;
  text3?: string;
  stats?: Stat[];
}

const STATS: Stat[] = [
  { value: 15, suffix: '+', label: 'Yıllık Deneyim' },
  { value: 3000, suffix: '+', label: 'Tamamlanan Proje' },
  { value: 500, suffix: '+', label: 'Mutlu Müşteri' },
];

function getCounterSizeClass(charCount: number): string {
  if (charCount <= 3) return 'text-4xl sm:text-5xl';
  if (charCount <= 5) return 'text-3xl sm:text-4xl';
  if (charCount <= 7) return 'text-2xl sm:text-3xl';
  return 'text-xl sm:text-2xl';
}

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 2000;
    const increment = value / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [isInView, value]);

  const formatted = count.toLocaleString('tr-TR') + suffix;
  const finalFormatted = value.toLocaleString('tr-TR') + suffix;
  const sizeClass = getCounterSizeClass(finalFormatted.length);

  return (
    <span
      ref={ref}
      className={`block whitespace-nowrap font-extrabold text-[#1a365d] dark:text-[#d4a843] ${sizeClass}`}
    >
      {formatted}
    </span>
  );
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export function AboutSection({ content }: { content?: AboutContent | null }) {
  const text1 = content?.text1 || 'Pars Tabela olarak 15 y\u0131l\u0131 a\u015fk\u0131n deneyimimizle T\u00fcrkiye\'nin \u00f6nde gelen tabela \u00fcreticilerinden biriyiz. Modern teknoloji ve geleneksel ustal\u0131\u011f\u0131 bir araya getirerek, markan\u0131z\u0131 en iyi \u015fekilde yans\u0131tan tabela \u00e7\u00f6z\u00fcmleri sunuyoruz.';
  const text2 = content?.text2 || 'Neon tabeladan LED ayd\u0131nlatmaya, kutu harften elektronik tabelalara kadar geni\u015f \u00fcr\u00fcn yelpazemizle her sekt\u00f6re \u00f6zel \u00e7\u00f6z\u00fcmler \u00fcretiyoruz.';
  const text3 = content?.text3 || 'M\u00fc\u015fteri memnuniyetini her zaman \u00f6n planda tutarak, kaliteli malzeme ve profesyonel i\u015f\u00e7ilik ile uzun \u00f6m\u00fcrl\u00fc \u00fcr\u00fcnler sunmay\u0131 hedefliyoruz.';
  const stats = content?.stats?.length ? content.stats : STATS;

  return (
    <section
      id="hakkimizda"
      className="bg-[#f8fafc] py-24 transition-colors duration-300 dark:bg-[#0f172a]"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          <motion.div className="mb-16 text-center" variants={itemVariants}>
            <h2 className="text-4xl font-bold text-[#1a365d] sm:text-5xl dark:text-white">
              Hakkımızda
            </h2>
          </motion.div>

          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left: text content */}
            <div className="space-y-6">
              <motion.p
                className="text-lg leading-relaxed text-gray-600 dark:text-gray-300"
                variants={itemVariants}
              >
                {text1}
              </motion.p>
              <motion.p
                className="text-lg leading-relaxed text-gray-600 dark:text-gray-300"
                variants={itemVariants}
              >
                {text2}
              </motion.p>
              <motion.p
                className="text-lg leading-relaxed text-gray-600 dark:text-gray-300"
                variants={itemVariants}
              >
                {text3}
              </motion.p>
            </div>

            {/* Right: stats grid */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
              {stats.map((stat) => (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  className="flex min-w-[120px] flex-1 flex-col items-center rounded-xl border border-[#e2e8f0] bg-white p-4 text-center shadow-sm sm:p-6 dark:border-[#334155] dark:bg-[#1e293b]"
                >
                  <div className="mb-2 h-1 w-8 rounded-full bg-[#d4a843]" />
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  <p className="mt-3 text-sm font-medium text-gray-500 sm:text-base dark:text-gray-400">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
