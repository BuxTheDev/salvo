export default function Placeholder({
  title,
  phase,
  blurb,
}: {
  title: string;
  phase: string;
  blurb: string;
}) {
  return (
    <div className="p-10 max-w-xl">
      <p className="text-xs font-bold uppercase tracking-widest text-[var(--gold)] mb-2">
        {phase}
      </p>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-[var(--ink-2)] mt-2 leading-relaxed">{blurb}</p>
    </div>
  );
}
