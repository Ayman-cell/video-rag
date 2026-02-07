'use client';

export default function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-green-800 bg-black/80">
      <div className="flex items-center gap-4">
        <img src="/logo-urc.png" alt="URC" className="h-24 w-auto object-contain" />
        <span className="text-green-500 font-bold text-sm hidden md:block" style={{ fontFamily: 'Press Start 2P' }}>
          URC 2026
        </span>
      </div>
      <div className="flex items-center gap-6">
        <img src="/logo-emines.png" alt="EMINES" className="h-20 w-auto object-contain" />
        <img src="/logo-sole.png" alt="SOLE" className="h-8 w-auto object-contain" />
        <img src="/logo-tech.png" alt="Tech Club" className="h-8 w-auto object-contain" />
      </div>
    </header>
  );
}
