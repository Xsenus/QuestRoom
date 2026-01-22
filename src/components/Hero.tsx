export default function Hero() {
  return (
    <div className="text-center py-6 md:py-10 px-4">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="h-px w-10 bg-white/60"></span>
        <span className="text-white/90 text-xs uppercase tracking-[0.3em] font-display">
          Квест
        </span>
        <span className="h-px w-10 bg-white/60"></span>
      </div>
      <h1 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-3 font-display">
        Квест в реальности в Красноярске
      </h1>
      <p className="text-sm md:text-lg text-white/85">
        Новое развлечение для тебя и твоих друзей!
      </p>
    </div>
  );
}
