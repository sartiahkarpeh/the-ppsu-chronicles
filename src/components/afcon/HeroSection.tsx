import Countdown from './Countdown';

export default function HeroSection() {
  return (
    <div className="relative h-[60vh] md:h-[80vh] w-full bg-black overflow-hidden">
      <img
        src="/afcon.jpeg"
        alt="AFCON Banner"
        className="w-full h-full object-cover md:object-fill object-center scale-105 animate-slow-zoom"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90"></div>

      {/* Content Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4">


        <Countdown />
      </div>
    </div>
  );
}
