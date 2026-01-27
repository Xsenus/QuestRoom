export default function Hero() {
  return (
    <div className="text-center py-2 md:py-2 px-2">
      <div className="flex items-center justify-center gap-3 mb-2">
        <span className="h-px w-10 bg-white/60"></span>
        <h1 className="text-2xl md:text-5xl font-bold text-white mb-2 md:mb-2 font-display">
          Квесты в реальности в Красноярске
        </h1>
        <span className="h-px w-10 bg-white/60"></span>
      </div>
      <p className="text-sm md:text-lg text-white/85">Выбирайте квест и бронируйте онлайн.</p>
    </div>
  );
}
