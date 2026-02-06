// src/app/valentines/layout.tsx
import type { Metadata } from 'next';
import './valentines.css';

export const metadata: Metadata = {
  title: 'Valentine\'s Gift Exchange | The PPSU Chronicles',
  description: 'Join the PPSU Valentine\'s Gift Exchange! Register, spin, and find out who you\'ll be gifting this Valentine\'s season.',
  openGraph: {
    title: 'Valentine\'s Gift Exchange | The PPSU Chronicles',
    description: 'Join the PPSU Valentine\'s Gift Exchange! Register, spin, and find out who you\'ll be gifting this Valentine\'s season.',
  },
};

export default function ValentinesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen romantic-bg">
      {/* Enhanced floating hearts background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Large decorative hearts */}
        <div className="absolute top-[5%] left-[5%] text-4xl float-slow opacity-30" style={{ animationDelay: '0s' }}>💖</div>
        <div className="absolute top-[12%] right-[8%] text-3xl float-slow opacity-25" style={{ animationDelay: '1.5s' }}>💕</div>
        <div className="absolute top-[25%] left-[15%] text-2xl valentine-float opacity-35" style={{ animationDelay: '0.8s' }}>❤️</div>
        <div className="absolute top-[8%] right-[25%] text-xl valentine-float opacity-30" style={{ animationDelay: '2.2s' }}>💗</div>
        <div className="absolute top-[35%] right-[5%] text-3xl float-slow opacity-20" style={{ animationDelay: '3s' }}>💝</div>

        {/* Medium hearts */}
        <div className="absolute top-[45%] left-[3%] text-2xl valentine-float opacity-25" style={{ animationDelay: '0.5s' }}>💓</div>
        <div className="absolute top-[55%] right-[12%] text-xl float-slow opacity-30" style={{ animationDelay: '1.8s' }}>❤️</div>
        <div className="absolute top-[40%] left-[40%] text-lg valentine-float opacity-20" style={{ animationDelay: '2.5s' }}>💕</div>
        <div className="absolute top-[20%] left-[60%] text-2xl float-slow opacity-25" style={{ animationDelay: '3.5s' }}>💖</div>

        {/* Small accent hearts */}
        <div className="absolute top-[65%] left-[20%] text-base valentine-float opacity-30" style={{ animationDelay: '1.2s' }}>💗</div>
        <div className="absolute top-[70%] right-[20%] text-lg float-slow opacity-25" style={{ animationDelay: '0.3s' }}>❤️</div>
        <div className="absolute top-[75%] left-[8%] text-xl valentine-float opacity-20" style={{ animationDelay: '2.8s' }}>💕</div>
        <div className="absolute top-[80%] right-[30%] text-base float-slow opacity-35" style={{ animationDelay: '1.5s' }}>💓</div>

        {/* Bottom decorative hearts */}
        <div className="absolute bottom-[15%] left-[35%] text-2xl valentine-float opacity-25" style={{ animationDelay: '2s' }}>💖</div>
        <div className="absolute bottom-[8%] right-[15%] text-3xl float-slow opacity-20" style={{ animationDelay: '0.7s' }}>💝</div>
        <div className="absolute bottom-[20%] left-[12%] text-xl float-slow opacity-30" style={{ animationDelay: '3.2s' }}>❤️</div>
        <div className="absolute bottom-[5%] left-[55%] text-lg valentine-float opacity-25" style={{ animationDelay: '1s' }}>💗</div>

        {/* Sparkle particles */}
        <div className="sparkle-particle top-[10%] left-[30%]" style={{ animationDelay: '0s' }}></div>
        <div className="sparkle-particle top-[30%] right-[15%]" style={{ animationDelay: '0.7s' }}></div>
        <div className="sparkle-particle top-[50%] left-[10%]" style={{ animationDelay: '1.4s' }}></div>
        <div className="sparkle-particle top-[70%] right-[25%]" style={{ animationDelay: '2.1s' }}></div>
        <div className="sparkle-particle bottom-[25%] left-[45%]" style={{ animationDelay: '0.3s' }}></div>
        <div className="sparkle-particle bottom-[10%] right-[40%]" style={{ animationDelay: '1.8s' }}></div>

        {/* Gradient orbs for depth */}
        <div className="absolute top-[20%] left-[20%] w-64 h-64 bg-pink-300/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] right-[10%] w-80 h-80 bg-rose-300/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[10%] left-[30%] w-72 h-72 bg-red-200/10 rounded-full blur-3xl"></div>
      </div>

      {/* Main content */}
      <main className="relative z-10">
        {children}
      </main>
    </div>
  );
}
