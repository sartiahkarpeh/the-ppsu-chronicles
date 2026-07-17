'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  X,
  ChevronDown,
  Feather,
  MapPin,
  Send,
} from 'lucide-react';

/* ----------------------------------------------------------------------------
 * Types & data
 * ------------------------------------------------------------------------- */

type Tribute = {
  id: string;
  name: string;
  country: string;
  message: string;
  createdAt: string;
};

type CuratedMessage = {
  from: string;
  role: string;
  paragraphs: string[];
  verse?: string;
};

const GALLERY = [
  { src: '/halala/pic1.jpeg', alt: 'Halala Khumalo' },
  { src: '/halala/pic2.jpeg', alt: 'Halala Khumalo' },
  { src: '/halala/pic3.jpeg', alt: 'Halala Khumalo' },
  { src: '/halala/pic4.jpeg', alt: 'Halala Khumalo' },
];

// Reproduced faithfully from the condolence messages shared by his community.
const MESSAGES: CuratedMessage[] = [
  {
    from: 'The Executive Leadership',
    role: 'African Students Association · P. P. Savani University',
    paragraphs: [
      'With deep sorrow and total submission to the will of God, the Leadership of the African Students Association, P.P. Savani University hereby informs the entire ASA family of the passing on to the glory of our beloved brother, Halala.',
      'We have received the confirmation that the Lord has called our brother Halala home to be with Him.',
      'Brother Halala was a valued member of our ASA family. We remember him for his kindness, fellowship, and love for God and for one another.',
      'We stand together with his family, friends, and all who are grieving during this difficult time. May the Lord comfort us all and grant us peace that surpasses all understanding.',
      'We kindly request the ASA family to keep his family in prayers and to uphold one another in love during this season of mourning.',
      'May his soul rest in perfect peace.',
    ],
    verse: '“Precious in the sight of the Lord is the death of his faithful servants.” — Psalm 116:15',
  },
  {
    from: 'Elmer Saye',
    role: 'In remembrance',
    paragraphs: [
      'Life is truly unpredictable; today our hearts are heavy as we mourn the loss of our dear brother. His passing has left the entire Eswatini community shocked and deeply saddened. As we move forward, let this remind us to be kinder, more loving, and more supportive of one another, for tomorrow is never promised.',
      'Please keep the Eswatini community and, most importantly, his family in your prayers during this painful time. May God grant them strength, comfort, and peace as they navigate this heartbreaking loss. One love — rest in peace, our dear brother. You will never be forgotten.',
    ],
  },
  {
    from: 'Stanley S. Garyeazohn',
    role: 'In remembrance',
    paragraphs: [
      'With heavy hearts, we extend our deepest condolences to the Eswatini community on the tragic loss of a young and promising individual whose dreams were cut short unexpectedly.',
      'During this difficult time, we also keep his parents, family, and loved ones in our thoughts and prayers. May they find strength, comfort, and peace as they mourn this heartbreaking loss.',
      'May his soul rest in perfect peace.',
    ],
  },
  {
    from: 'Pastor Musa James Bola',
    role: 'Hope of Glory International Fellowship',
    paragraphs: [
      'On behalf of Hope of Glory International Fellowship, we extend our sincere and heartfelt condolences to the entire African Students Association and to all who mourn the great loss of our brother and son in the fellowship, Brother Halala.',
      'We are deeply saddened by this news. Brother Halala was a blessing to us — a faithful son in the house of God, full of love for the Lord and for His people. His presence in our fellowship will be greatly missed.',
      'In this time of grief, we stand with you in prayer. May the God of all comfort strengthen the ASA family, his loved ones, and all of us who knew him.',
      'We pray that the Lord grants rest to his soul and peace to all who are hurting.',
    ],
    verse: '“Blessed are those who mourn, for they shall be comforted.” — Matthew 5:4',
  },
  {
    from: 'P. Joseph Bundoo-Don Joe',
    role: 'On behalf of the newly elected leaders',
    paragraphs: [
      'With profound sadness, we bid farewell to a cherished member of our African community. The news of his departure has brought immense grief and disbelief to all who knew and loved him. Moments like these remind us how fragile life can be and how important it is to cherish every opportunity we have to care for, uplift, and stand by one another.',
      'As we mourn this painful loss, we ask everyone to keep the Eswatini community close in your thoughts and prayers, especially his loved ones who are facing an unimaginable void. May God surround them with His unfailing love, give them courage for the days ahead, and bring healing to their broken hearts.',
      'Though he is no longer with us in person, the impact of his life, his presence, and the memories he created will remain with us forever. Sleep peacefully, dear brother. Your absence will be deeply felt, but your legacy will continue to shine in our hearts.',
      'On behalf of the newly elected leaders, we extend our deepest condolences to his family, friends, and the entire Eswatini community.',
    ],
  },
  {
    from: 'Kone Mory',
    role: 'A friend',
    paragraphs: [
      'It is with deep sadness that I learned of the passing of our dear brother and friend Halala.',
      'During this difficult time, I extend my heartfelt and sincere condolences to his family, his close friends, and to all the people of his country. No words can truly ease the pain of such a loss, but I pray that you may find comfort in the precious memories he leaves behind and in the love and support of everyone who knew him.',
      'His passing leaves a great void, but his kindness, humility, and the moments we shared with him will forever remain in our hearts. We will always remember him as a remarkable person whose life touched and inspired many.',
      'May God, in His infinite mercy, grant him eternal rest, give strength and comfort to his family, and support all those who mourn his passing.',
      'Rest in peace, dear brother Halala. You will never be forgotten.',
    ],
  },
  {
    from: 'The PPSU Chronicles',
    role: 'His teammates on the Innovation Team',
    paragraphs: [
      'Today, we mourn the loss of a remarkable friend, brother, and teammate, Halala Khumalo.',
      'Halala was an active and dedicated member of the Innovation Team under the African Students Leadership. His creativity, commitment, and willingness to serve played a vital role in the success of many events and initiatives. He never hesitated to step forward, support the team, and work behind the scenes to make every project a success.',
      'His sudden passing in a tragic bike accident has left a void that words cannot fill. While we grieve this heartbreaking loss, we also celebrate a life that inspired unity, excellence, and selfless service.',
      'Our thoughts and prayers are with his family, friends, and everyone mourning this loss.',
      'Rest in peace, Halala. Thank you for everything you gave to our community. Your legacy will continue to inspire us. Forever in our hearts.',
    ],
  },
];

/* ----------------------------------------------------------------------------
 * Small pieces
 * ------------------------------------------------------------------------- */

function Candle({ className = '' }: { className?: string }) {
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      <motion.div
        aria-hidden
        className="h-5 w-5 rounded-full bg-amber-300 blur-[6px]"
        style={{ boxShadow: '0 0 28px 10px rgba(232,195,126,0.55)' }}
        animate={{ opacity: [0.75, 1, 0.7, 0.95, 0.8], scaleY: [1, 1.12, 0.96, 1.08, 1] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <div className="mt-[-4px] h-10 w-2.5 rounded-b-sm rounded-t-full bg-gradient-to-b from-amber-100 via-amber-50 to-neutral-200" />
      <div className="h-1.5 w-6 rounded-full bg-neutral-700/70" />
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-12 flex flex-col items-center text-center">
      <span className="mb-4 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <h2 className="font-display text-3xl font-medium uppercase tracking-[0.18em] text-amber-100/90 md:text-4xl">
        {children}
      </h2>
      <span className="mt-4 h-px w-16 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0 },
};

/* ----------------------------------------------------------------------------
 * Main component
 * ------------------------------------------------------------------------- */

export default function HalalaMemorial({
  initialTributes,
}: {
  initialTributes: Tribute[];
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [tributes, setTributes] = useState<Tribute[]>(initialTributes);

  // Guestbook form state
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (trimmedName.length < 1) {
      setError('Please enter your name.');
      return;
    }
    if (trimmedMessage.length < 3) {
      setError('Please write a short message.');
      return;
    }
    if (trimmedMessage.length > 800) {
      setError('Please keep your message under 800 characters.');
      return;
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/halala/tributes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          country: country.trim(),
          message: trimmedMessage,
          website,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || 'Something went wrong. Please try again.');
      }

      if (data.tribute) {
        setTributes((prev) => [data.tribute as Tribute, ...prev]);
      }
      setStatus('success');
      setName('');
      setCountry('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  }

  return (
    <div className="relative min-h-screen bg-[#0a0a0f] font-sans text-neutral-200 antialiased">
      {/* Ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(1200px 600px at 50% -10%, rgba(232,195,126,0.10), transparent 60%), radial-gradient(900px 500px at 50% 110%, rgba(232,195,126,0.06), transparent 60%)',
        }}
      />

      {/* Back link */}
      <Link
        href="/"
        className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-widest text-neutral-300 backdrop-blur-md transition-colors hover:text-amber-100"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        The PPSU Chronicles
      </Link>

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <Image
          src="/halala/pic1.jpeg"
          alt="Halala Khumalo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/70 via-[#0a0a0f]/60 to-[#0a0a0f]" />
        <div className="absolute inset-0 bg-[#0a0a0f]/30" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="relative z-10 flex flex-col items-center px-6 text-center"
        >
          <Candle className="mb-8" />
          <p className="mb-5 text-xs uppercase tracking-[0.45em] text-amber-200/80">
            In Loving Memory
          </p>
          <h1 className="font-display text-5xl font-medium leading-tight tracking-wide text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)] sm:text-6xl md:text-7xl lg:text-8xl">
            Halala Khumalo
          </h1>
          <div className="mt-6 flex items-center gap-4 text-amber-100/80">
            <span className="h-px w-8 bg-amber-200/50" />
            <p className="font-display text-base tracking-[0.2em] sm:text-lg">
              8 November 2005 — 15 July 2026
            </p>
            <span className="h-px w-8 bg-amber-200/50" />
          </div>
          <p className="mt-5 flex items-center gap-2 text-sm text-neutral-300/90">
            <MapPin className="h-4 w-4 text-amber-200/70" />
            Kingdom of Eswatini · P. P. Savani University, India
          </p>
          <p className="mt-8 max-w-xl text-base italic leading-relaxed text-neutral-300/90">
            A beloved brother, friend, and teammate. Gone far too soon, but never forgotten.
          </p>
        </motion.div>

        <motion.div
          aria-hidden
          className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-amber-100/60"
          animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </section>

      {/* ------------------------------------------------------------ Tribute intro */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
        >
          <Feather className="mx-auto mb-6 h-7 w-7 text-amber-200/70" />
          <p className="text-lg leading-relaxed text-neutral-300 md:text-xl">
            Halala was known among us for his kindness, his humility, and his quiet, faithful
            service. As a devoted member of the African Students Association and the Innovation
            Team, he gave his time and heart to our community — always ready to step forward,
            to support, and to lift others up.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-neutral-300 md:text-xl">
            Far from home, he became family to those who knew him. His warmth reminded us how
            precious life is, and how much light one person can bring. Today we gather — students
            from across Africa and beyond — to honour his memory and to hold one another close.
          </p>
          <p className="mx-auto mt-10 max-w-2xl font-display text-lg italic leading-relaxed tracking-wide text-amber-100/90">
            “Precious in the sight of the Lord is the death of his faithful servants.”
            <span className="mt-2 block text-sm not-italic tracking-widest text-amber-200/60">
              PSALM 116:15
            </span>
          </p>
        </motion.div>
      </section>

      {/* ------------------------------------------------------------------ Gallery */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <SectionTitle>Moments Remembered</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-4">
          {GALLERY.map((photo, i) => (
            <motion.button
              key={photo.src}
              type="button"
              onClick={() => setLightbox(i)}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10 bg-white/5 focus:outline-none focus:ring-2 focus:ring-amber-300/60"
              aria-label={`View photo ${i + 1} of Halala`}
            >
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-70 transition-opacity group-hover:opacity-40" />
            </motion.button>
          ))}
        </div>
      </section>

      {/* -------------------------------------------------------------------- Video */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <SectionTitle>In His Memory</SectionTitle>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8 }}
          className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        >
          <video
            controls
            playsInline
            preload="metadata"
            poster="/halala/pic2.jpeg"
            className="h-auto w-full"
          >
            <source src="/halala/halala.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </motion.div>
      </section>

      {/* ------------------------------------------------------ Words of remembrance */}
      <section className="relative z-10 mx-auto max-w-4xl px-6 py-16">
        <SectionTitle>Words of Remembrance</SectionTitle>
        <div className="space-y-8">
          {MESSAGES.map((m, i) => (
            <motion.figure
              key={m.from + i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7 }}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 md:p-9"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute left-5 top-2 select-none font-display text-6xl leading-none text-amber-200/15"
              >
                &ldquo;
              </span>
              <blockquote className="relative space-y-4">
                {m.paragraphs.map((p, j) => (
                  <p key={j} className="text-[15px] leading-relaxed text-neutral-300 md:text-base">
                    {p}
                  </p>
                ))}
                {m.verse && (
                  <p className="border-l-2 border-amber-300/40 pl-4 font-display text-[15px] italic leading-relaxed text-amber-100/80">
                    {m.verse}
                  </p>
                )}
              </blockquote>
              <figcaption className="mt-6 flex flex-col border-t border-white/10 pt-4">
                <span className="font-display text-lg tracking-wide text-amber-100">
                  {m.from}
                </span>
                <span className="text-xs uppercase tracking-widest text-neutral-400">
                  {m.role}
                </span>
              </figcaption>
            </motion.figure>
          ))}

          {/* Visitor tributes — same style, shown beneath the curated messages */}
          <AnimatePresence initial={false}>
            {tributes.map((t) => (
              <motion.figure
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7 md:p-9"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute left-5 top-2 select-none font-display text-6xl leading-none text-amber-200/15"
                >
                  &ldquo;
                </span>
                <blockquote className="relative space-y-4">
                  {t.message.split(/\n{2,}/).map((p, j) => (
                    <p
                      key={j}
                      className="whitespace-pre-line text-[15px] leading-relaxed text-neutral-300 md:text-base"
                    >
                      {p}
                    </p>
                  ))}
                </blockquote>
                <figcaption className="mt-6 flex flex-col border-t border-white/10 pt-4">
                  <span className="font-display text-lg tracking-wide text-amber-100">
                    {t.name}
                  </span>
                  <span className="text-xs uppercase tracking-widest text-neutral-400">
                    {t.country || 'In remembrance'}
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* ---------------------------------------------------------------- Guestbook */}
      <section className="relative z-10 mx-auto max-w-3xl px-6 py-16">
        <SectionTitle>Leave a Tribute</SectionTitle>
        <p className="mx-auto mb-10 max-w-xl text-center text-neutral-400">
          Share a memory, a prayer, or a word of comfort for Halala&rsquo;s family and friends.
          Your message will join the words of remembrance above.
        </p>

        <motion.form
          onSubmit={handleSubmit}
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 md:p-8"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="tribute-name" className="mb-1.5 block text-xs uppercase tracking-widest text-neutral-400">
                Your name
              </label>
              <input
                id="tribute-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-neutral-100 placeholder-neutral-500 outline-none transition-colors focus:border-amber-300/50"
                placeholder="e.g. Thandiwe M."
              />
            </div>
            <div>
              <label htmlFor="tribute-country" className="mb-1.5 block text-xs uppercase tracking-widest text-neutral-400">
                Country <span className="text-neutral-600">(optional)</span>
              </label>
              <input
                id="tribute-country"
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={60}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-neutral-100 placeholder-neutral-500 outline-none transition-colors focus:border-amber-300/50"
                placeholder="e.g. Eswatini"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="tribute-message" className="mb-1.5 block text-xs uppercase tracking-widest text-neutral-400">
              Your message
            </label>
            <textarea
              id="tribute-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={800}
              rows={5}
              required
              className="w-full resize-y rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-neutral-100 placeholder-neutral-500 outline-none transition-colors focus:border-amber-300/50"
              placeholder="Share your memory or condolence…"
            />
            <div className="mt-1 text-right text-xs text-neutral-500">{message.length}/800</div>
          </div>

          {/* Honeypot — hidden from humans */}
          <div className="hidden" aria-hidden>
            <label htmlFor="website">Website</label>
            <input
              id="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          <AnimatePresence>
            {status === 'error' && error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
              >
                {error}
              </motion.p>
            )}
            {status === 'success' && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 rounded-lg border border-amber-300/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-100"
              >
                Thank you. Your tribute now appears among the words of remembrance above.
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={status === 'submitting'}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300 to-amber-200 px-6 py-3.5 font-semibold uppercase tracking-widest text-[#1a1408] transition-all hover:from-amber-200 hover:to-amber-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {status === 'submitting' ? (
              'Sending…'
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post Tribute
              </>
            )}
          </button>
        </motion.form>
      </section>

      {/* ---------------------------------------------------------------- Closing */}
      <section className="relative z-10 flex flex-col items-center px-6 py-24 text-center">
        <Candle className="mb-8" />
        <p className="font-display text-2xl tracking-wide text-amber-100/90 md:text-3xl">
          Rest in peace, Halala.
        </p>
        <p className="mt-3 text-neutral-400">Forever in our hearts. 🕊️</p>
        <p className="mt-10 max-w-md text-sm leading-relaxed text-neutral-500">
          Held in loving memory by the African Students Association and The PPSU Chronicles,
          P. P. Savani University.
        </p>
      </section>

      {/* --------------------------------------------------------------- Lightbox */}
      <AnimatePresence>
        {lightbox !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close"
              className="absolute right-5 top-5 rounded-full border border-white/20 p-2 text-white/80 transition-colors hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-[80vh] w-full max-w-4xl"
            >
              <Image
                src={GALLERY[lightbox].src}
                alt={GALLERY[lightbox].alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
