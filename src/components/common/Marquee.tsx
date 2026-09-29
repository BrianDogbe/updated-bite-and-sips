const WORDS = ['FRESH FOOD', 'GREAT SIPS', 'FAST DELIVERY', 'EASY PICKUP', 'BITE & SIPS'];

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <span aria-hidden={hidden} className="flex shrink-0 items-center">
      {WORDS.map((w) => (
        <span key={w + String(hidden)} className="flex items-center">
          <span className="px-8 font-display text-sm font-bold tracking-[0.28em] md:px-12 md:text-base">
            {w}
          </span>
          <span aria-hidden="true" className="text-brand-400">•</span>
        </span>
      ))}
    </span>
  );
}

export default function Marquee() {
  return (
    <div
      aria-label="Bite and Sips highlights"
      className="overflow-hidden border-y border-brand-900/20 bg-coal py-4 text-cream"
    >
      <div className="flex w-max animate-marquee whitespace-nowrap">
        <Row />
        <Row hidden />
        <Row hidden />
      </div>
    </div>
  );
}
