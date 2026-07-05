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
    <div className="mb-6 animate-fade-up">
      {eyebrow && (
        <span className="mb-2 inline-block rounded-full bg-brand-light px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-brand-dark ring-1 ring-brand/20">
          {eyebrow}
        </span>
      )}
      <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1.5 max-w-2xl text-sm text-ink-muted sm:text-[15px]">
          {subtitle}
        </p>
      )}
    </div>
  );
}
