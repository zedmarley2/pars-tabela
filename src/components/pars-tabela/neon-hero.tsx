'use client';

import { motion } from 'framer-motion';

interface HeroContent {
  title?: string;
  subtitle?: string;
  description?: string;
  ctaText?: string;
  ctaLink?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' as const } },
};

export function NeonHero({ content }: { content?: HeroContent | null }) {
  const title = content?.title || 'Profesyonel Tabela & Reklam';
  const highlight = 'Çözümleri';
  const subtitle = content?.subtitle || 'Işığınızla Fark Yaratın';
  const description = content?.description || '15 yılı aşkın deneyim ile markanızı en iyi şekilde yansıtan tabela çözümleri sunuyoruz';
  const ctaText = content?.ctaText || 'Hizmetlerimizi Keşfedin';
  const ctaLink = content?.ctaLink || '#hizmetlerimiz';

  return (
    <section
      id="hero"
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a365d] to-[#0f172a]"
    >
      {/* Subtle geometric dot pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Soft gradient orbs */}
      <div className="pointer-events-none absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-[#d4a843]/10 blur-3xl" />
      <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-[#1a365d]/30 blur-3xl" />

      <motion.div
        className="relative z-10 mx-auto max-w-4xl px-4 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="mb-6 text-5xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl"
          variants={itemVariants}
        >
          {title}{' '}
          <span className="text-[#d4a843]">{highlight}</span>
        </motion.h1>

        <motion.p
          className="mb-4 text-2xl font-semibold text-[#d4a843] sm:text-3xl"
          variants={itemVariants}
        >
          {subtitle}
        </motion.p>

        <motion.p
          className="mx-auto mb-10 max-w-2xl text-lg text-gray-300 sm:text-xl"
          variants={itemVariants}
        >
          {description}
        </motion.p>

        <motion.div variants={itemVariants}>
          <a
            href={ctaLink}
            onClick={(e) => {
              e.preventDefault();
              const target = ctaLink.startsWith('#') ? ctaLink : `#${ctaLink.split('#')[1] || 'hizmetlerimiz'}`;
              document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="inline-block rounded-full bg-[#d4a843] px-8 py-3.5 text-lg font-semibold text-[#1a365d] transition-all duration-300 hover:scale-105 hover:bg-[#e0b854] hover:shadow-lg"
          >
            {ctaText}
          </a>
        </motion.div>
      </motion.div>
    </section>
  );
}
