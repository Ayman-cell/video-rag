'use client';

export default function HeroSection() {
  return (
    <section className="relative z-10 px-4 md:px-8 py-12 md:py-16">
      <div className="max-w-6xl mx-auto">
        {/* Main Title */}
        <div className="mb-12 text-center">
          <div className="inline-block mb-4 px-4 py-2 border-2 border-green-500 bg-black">
            <p className="text-green-500 text-xs font-bold">⚠ SYSTEM INITIALIZATION ⚠</p>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-green-500 mb-6" style={{ fontFamily: 'Press Start 2P' }}>
            URC CHAMPIONSHIP
          </h2>
          <p className="text-green-400 text-sm md:text-base font-mono max-w-2xl mx-auto">
            &gt; Universal Robotics Competition - Bienvenue dans le protocole de compétition.
            <br />
            &gt; Sélectionnez votre mission pour continuer...
          </p>
        </div>

        {/* Logos Grid */}
        <div className="flex items-center justify-center gap-8 md:gap-12 mb-12 flex-wrap">
          <div className="border-2 border-green-500 p-4 bg-black flex items-center justify-center h-28 w-40 md:h-32 md:w-48">
            <img src="/logo-emines.png" alt="EMINES School of Industrial Management" className="h-32 md:h-40 w-auto object-contain" />
          </div>
          <div className="border-2 border-green-500 p-4 bg-black flex items-center justify-center h-28 w-40 md:h-32 md:w-48">
            <img src="/logo-urc.png" alt="URC - Universal Robotics Competition" className="h-32 md:h-40 w-auto object-contain" />
          </div>
          <div className="border-2 border-green-500 p-4 bg-black flex items-center justify-center h-28 w-40 md:h-32 md:w-48">
            <img src="/logo-sole.png" alt="UM6P SOLE - Student Organizations Leadership and Engagement" className="max-h-full max-w-full object-contain" />
          </div>
          <div className="border-2 border-green-500 p-4 bg-black flex items-center justify-center h-28 w-40 md:h-32 md:w-48">
            <img src="/logo-tech.png" alt="Tech Club" className="max-h-full max-w-full object-contain" />
          </div>
        </div>

        {/* Status Info */}
        <div className="border-2 border-green-700 p-6 bg-black text-center">
          <div className="text-green-500 text-xs font-bold mb-2">
            ▶ COMPETITION STATUS
          </div>
          <div className="text-green-400 text-sm font-mono">
            <p>Système prêt | Équipes : 4 | Phases : 3 | Mode : Sélection</p>
          </div>
        </div>
      </div>
    </section>
  );
}
