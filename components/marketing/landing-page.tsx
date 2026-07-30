import Link from "next/link";

const faqs = [
  {
    q: "How is CVJungle different from other CV optimizers?",
    a: "Most tools chase keywords and invent stacks. CVJungle aligns your real experience to a target role, seniority, and industry, then generates matching LinkedIn copy from the same improved CV.",
  },
  {
    q: "Can CVJungle optimize my LinkedIn profile?",
    a: "Yes. You get a headline, About section, skills, experience bullets, and a connection message that mirror your updated CV so recruiters see one consistent story.",
  },
  {
    q: "Does CVJungle invent skills for ATS?",
    a: "No. If Kubernetes, Salesforce, or any tool is not on your CV, it will not appear in rewrites or LinkedIn suggestions. Industry targeting reframes transferable value instead.",
  },
  {
    q: "How do I optimize a CV for ATS with CVJungle?",
    a: "Upload your resume, choose the role you want, review alignment, apply truthful rewrites, generate LinkedIn copy, and download a text-based PDF that ATS systems can parse.",
  },
  {
    q: "Which file formats are supported?",
    a: "PDF and DOCX. CVJungle extracts your content, structures it, then runs alignment, rewrites, LinkedIn generation, and export.",
  },
  {
    q: "Is CVJungle free?",
    a: "Yes during the MVP. You can upload a CV, align it to a role, improve wording, generate LinkedIn copy, and download an ATS-friendly PDF. Fair-use rate limits apply to keep the service available for everyone.",
  },
];

export function MarketingLanding() {
  return (
    <div className="site-atmosphere min-h-screen text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl tracking-tight text-foreground">
            CV<span className="text-primary">Jungle</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#difference" className="hover:text-foreground transition-colors">
              Difference
            </a>
            <a href="#linkedin" className="hover:text-foreground transition-colors">
              LinkedIn
            </a>
            <a href="#how" className="hover:text-foreground transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </a>
          </nav>
          <Link
            href="/optimize"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
          >
            Optimize my CV
          </Link>
        </div>
      </header>

      {/* Hero: brand first, one composition */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-y-0 right-0 w-full md:w-[55%] bg-[linear-gradient(120deg,transparent_0%,oklch(0.88_0.06_155/0.35)_40%,oklch(0.22_0.035_155/0.92)_100%)]" />
          <div className="absolute bottom-0 left-0 h-px w-full bg-border" />
        </div>

        <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-16 md:grid-cols-[1.15fr_0.85fr] md:items-end md:pb-28 md:pt-24">
          <div className="space-y-8">
            <p className="animate-rise font-display text-5xl tracking-tight text-foreground sm:text-6xl md:text-7xl">
              CV<span className="text-primary">Jungle</span>
            </p>
            <div className="h-1 w-24 origin-left scale-x-0 bg-primary animate-rule" />
            <h1 className="animate-rise-delay max-w-xl font-display text-3xl leading-tight tracking-tight text-foreground sm:text-4xl md:text-[2.75rem]">
              Cut through the job-search jungle — real skills, role fit, ATS-readable
              results.
            </h1>
            <p className="animate-rise-delay-2 max-w-lg text-lg leading-relaxed text-muted-foreground">
              Strengthen wording from experience you already have. Match role, seniority,
              and industry. Export a parser-friendly PDF and matching LinkedIn headline
              and About.
            </p>
            <div className="animate-rise-delay-2 flex flex-wrap items-center gap-4 pt-2">
              <Link
                href="/optimize"
                className="rounded-lg bg-foreground px-6 py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
              >
                Get started — free
              </Link>
              <a
                href="#linkedin"
                className="rounded-lg border border-border bg-card/60 px-6 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-card"
              >
                See LinkedIn output
              </a>
            </div>
          </div>

          <aside className="animate-rise-delay relative md:block">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm md:p-7">
              <p className="font-display text-2xl leading-snug text-foreground">
                Not another keyword stuffer.
              </p>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-foreground/85">
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Role · seniority · industry first
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  Rewrites stay inside your real experience
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  LinkedIn headline + About from the same CV
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  ATS-readable PDF export
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Difference */}
      <section id="difference" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Why CVJungle exists
          </p>
          <h2 className="font-display text-3xl tracking-tight text-foreground md:text-4xl">
            Generic optimizers invent a career. We align the one you already have.
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Paste-a-JD tools often push stacks you never touched. CVJungle starts from
            your CV, then reframes it for the role and industry you want, including
            LinkedIn discoverability, without manufacturing experience.
          </p>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <div className="space-y-3 border-t border-border pt-6">
            <h3 className="font-display text-xl text-muted-foreground">
              Typical ATS tools
            </h3>
            <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>Score theater with inflated keywords</li>
              <li>Add tools that were never on your CV</li>
              <li>Stop at a PDF, leave LinkedIn inconsistent</li>
              <li>Same generic dashboard look as every other AI app</li>
            </ul>
          </div>
          <div className="space-y-3 border-t border-primary pt-6">
            <h3 className="font-display text-xl text-foreground">CVJungle</h3>
            <ul className="space-y-2 text-sm leading-relaxed text-foreground/90">
              <li>Alignment to role, seniority, and industry</li>
              <li>Only skills and achievements already in your CV</li>
              <li>LinkedIn headline, About, skills, and outreach from that CV</li>
              <li>Text PDF built for parsers, not screenshot images</li>
            </ul>
          </div>
        </div>
      </section>

      {/* LinkedIn emphasis */}
      <section id="linkedin" className="surface-ink border-y border-border">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <p className="label-leaf text-xs font-semibold uppercase tracking-[0.2em]">
              LinkedIn optimization
            </p>
            <h2 className="font-display text-3xl tracking-tight text-white md:text-4xl">
              Recruiter search finds LinkedIn first. Your CV and profile should tell the
              same story.
            </h2>
            <p className="leading-relaxed text-white/80">
              After your CV is aligned, CVJungle generates LinkedIn-ready copy: headline,
              About, skills, experience bullets, and a connection message grounded in your
              improved resume, not a fantasy persona.
            </p>
            <Link
              href="/optimize"
              className="inline-flex rounded-lg bg-leaf px-5 py-3 text-sm font-semibold text-ink hover:opacity-90"
            >
              Generate LinkedIn + CV
            </Link>
          </div>
          <div className="space-y-4 font-mono text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 p-5">
              <p className="label-leaf mb-2 text-[11px] font-semibold uppercase tracking-widest">
                Headline example
              </p>
              <p className="leading-relaxed text-white">
                Frontend Developer | React · TypeScript · Next.js | Insurance
              </p>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-5">
              <p className="label-leaf mb-2 text-[11px] font-semibold uppercase tracking-widest">
                About opens in first person
              </p>
              <p className="leading-relaxed text-white/90">
                I am a frontend developer with 6+ years building accessible web products.
                I bring the same measurable delivery into insurance digital experiences...
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            How it works
          </p>
          <h2 className="font-display text-3xl tracking-tight md:text-4xl">
            Five steps from upload to an aligned CV and LinkedIn profile
          </h2>
        </div>
        <ol className="mt-12 space-y-0">
          {[
            {
              n: "01",
              t: "Upload your CV",
              d: "PDF or DOCX. We extract structure without inventing employers or dates.",
            },
            {
              n: "02",
              t: "Choose role, seniority, industry",
              d: "Tell us what you are targeting so phrasing and LinkedIn copy stay on-brief.",
            },
            {
              n: "03",
              t: "Review ATS alignment",
              d: "See a match score and phrasing opportunities drawn from your experience.",
            },
            {
              n: "04",
              t: "Apply truthful rewrites",
              d: "Strengthen weak bullets. No new stacks. No fake metrics.",
            },
            {
              n: "05",
              t: "LinkedIn + updated CV",
              d: "Copy LinkedIn headline and About, then download an ATS-friendly PDF.",
            },
          ].map((step) => (
            <li
              key={step.n}
              className="grid gap-4 border-t border-border py-8 md:grid-cols-[5rem_1fr_1.4fr] md:items-baseline"
            >
              <span className="font-display text-2xl text-primary">{step.n}</span>
              <h3 className="text-lg font-semibold text-foreground">{step.t}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10">
          <Link
            href="/optimize"
            className="rounded-lg bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Open the optimizer
          </Link>
        </div>
      </section>

      {/* SEO content */}
      <section className="border-t border-border bg-muted/40 py-24">
        <div className="mx-auto max-w-3xl space-y-6 px-6">
          <h2 className="font-display text-3xl tracking-tight text-foreground">
            Optimize your CV for ATS and LinkedIn without rewriting your career
          </h2>
          <p className="leading-relaxed text-muted-foreground">
            Applicant tracking systems rank resumes before recruiters open them. LinkedIn
            search does the same for your profile. CVJungle is a CV optimizer and LinkedIn
            optimization tool built for truthful alignment: role-based rewrites, keyword
            phrasing from real experience, and an ATS-readable PDF export.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Use it to optimize a resume for a senior role, pivot into a new industry like
            healthcare or insurance, or refresh LinkedIn headline and About copy so both
            channels match. Search terms people use — CV optimization, ATS resume checker,
            LinkedIn headline generator — describe features; the product promise is
            integrity.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section
        id="faq"
        className="mx-auto max-w-3xl px-6 py-24"
        aria-labelledby="faq-heading"
      >
        <h2
          id="faq-heading"
          className="font-display text-3xl tracking-tight text-foreground"
        >
          FAQ: CV optimization, ATS, and LinkedIn
        </h2>
        <div className="mt-10 space-y-8">
          {faqs.map((item) => (
            <article key={item.q} className="space-y-2 border-t border-border pt-6">
              <h3 className="text-lg font-semibold text-foreground">{item.q}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl">
              CV<span className="text-primary">Jungle</span>
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Cut through the job-search jungle with truthful CV and LinkedIn
              optimization.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CVJungle. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
