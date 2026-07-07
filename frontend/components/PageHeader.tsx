export default function PageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 animate-fade-up">
      {eyebrow && (
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-ink-muted leading-none">
          {eyebrow}
        </div>
      )}
      <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl font-heading">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-2.5 max-w-3xl text-xs leading-relaxed text-ink-muted">
          {subtitle}
        </p>
      )}
    </div>
  );
}
