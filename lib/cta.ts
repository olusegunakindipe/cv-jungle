/** Shared primary CTA styles — keep wizard actions consistent. */
export const primaryCtaClass =
  "cursor-pointer h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/15 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 text-lg font-black uppercase tracking-widest disabled:opacity-60 disabled:hover:scale-100 disabled:cursor-not-allowed";

export const secondaryCtaClass =
  "cursor-pointer h-16 px-6 rounded-2xl border border-border bg-background text-foreground hover:bg-muted/50 transition-all text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2";

export const backLinkClass =
  "cursor-pointer w-full sm:w-auto text-xs font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2 group";

export const ctaPrimaryClassName = primaryCtaClass;
export const ctaOutlineClassName = secondaryCtaClass;
