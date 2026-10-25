const inr = (paise) => `₹${(Number(paise || 0) / 100).toLocaleString('en-IN')}`;

export default function PlanPrice({ original, price, hasOffer }) {
  const savings = hasOffer ? original - price : 0;

  return (
    <div className="mt-6 rounded-2xl border border-brand/50 bg-charcoal/70 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">
        {hasOffer ? 'Your membership price' : 'Membership price'}
      </p>
      <p className="mt-1 whitespace-nowrap text-3xl font-black leading-tight text-brand sm:text-4xl">
        {inr(price)}
      </p>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {original > 0 && (
          <>
            <span className="text-white/60">Original</span>
            <span className={hasOffer ? 'text-white/60 line-through' : 'text-white/80'}>
              {inr(original)}
            </span>
          </>
        )}
        {hasOffer && (
          <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs font-bold text-brand">
            Save {inr(savings)}
          </span>
        )}
        {!original && <span className="text-white/60">Standard price</span>}
      </div>
    </div>
  );
}
