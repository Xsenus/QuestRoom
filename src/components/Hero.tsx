export default function Hero() {
  return (
    <div className="text-center py-8 md:py-16 px-4">
      <div className="flex items-center justify-center gap-3 mb-3">
        <span className="h-px w-10 bg-white/60"></span>
        <span className="text-white/90 text-xs uppercase tracking-[0.3em]">Квест</span>
        <span className="h-px w-10 bg-white/60"></span>
      </div>
      <h1 className="text-2xl md:text-5xl font-bold text-white mb-3 md:mb-4">
        Квест в реальности в Красноярске
      </h1>
      <p className="text-base md:text-xl text-white/90">
        Новое развлечение для тебя и твоих друзей!
      </p>
    </div>
  );
}
