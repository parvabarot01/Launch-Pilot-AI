import Link from "next/link";

const FEATURES = [
  {
    title: "Feature flags & gradual rollouts",
    description:
      "Create flags, target them to user segments, and roll out by percentage with a one-click kill switch when something goes wrong.",
  },
  {
    title: "Real experimentation",
    description:
      "Turn any flag into an A/B test with defined variants and a success metric — conversion, retention, or a revenue proxy.",
  },
  {
    title: "Statistically-grounded results",
    description:
      "Confidence intervals, p-values, and sample-size-adequacy checks computed for real, so you know when a result is signal instead of noise.",
  },
  {
    title: "AI decision assistant",
    description:
      "Ask which experiment to prioritize, why one failed, or whether a lift is meaningful — answered from your org's actual data, not a guess.",
  },
  {
    title: "Release governance",
    description:
      "Rollout increases past a risk threshold require sign-off. Every change is audited, and any flag state can be rolled back in one click.",
  },
  {
    title: "Executive rollup",
    description:
      "A risk-scored view of everything currently rolling out, for the people who need the summary, not the raw data.",
  },
];

const PERSONAS = [
  {
    role: "Product / Growth PM",
    need: "Wants to know which variant to ship — not raw p-values.",
  },
  {
    role: "Engineering Manager",
    need: "Wants safe, reversible flag control: kill switches, gradual rollout.",
  },
  {
    role: "Data Scientist / Analyst",
    need: "Wants statistical significance reporting they can actually trust.",
  },
  {
    role: "Executive",
    need: "Wants a risk-scored view of what's rolling out, and why.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              LP
            </div>
            <span className="text-lg font-semibold tracking-tight">LaunchPilot</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/how-it-works" className="text-sm text-slate-600 hover:text-slate-900">
              How it works
            </Link>
            <Link href="/login" className="btn-secondary">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary">
              Get started free
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <span className="badge bg-brand-50 text-brand-700">
            Flags · Experiments · Release governance — one platform
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Ship faster, with the safety net built in.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            LaunchPilot unifies feature flags, gradual rollouts, A/B testing, and
            statistically-grounded recommendations so your team doesn&apos;t have to
            stitch together a flag tool, an analytics tool, and a manual stats
            sanity-check just to ship one change safely.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create your free account
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              I already have an account
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            No credit card. Runs on your own free-tier infrastructure.
          </p>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              The problem with the usual setup
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Most teams run a feature-flag tool, a separate A/B testing product, and a
              spreadsheet or a Slack thread to decide whether a result is real. Each
              handoff between those tools is where risk and slowdowns creep in.
              LaunchPilot collapses that into one governed workflow.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card">
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-slate-900">Built for the whole team</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-600">
              Every role touching a release gets the view they actually need.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.map((p) => (
              <div key={p.role} className="rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900">{p.role}</h3>
                <p className="mt-2 text-sm text-slate-600">{p.need}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-100 bg-brand-950 py-16 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold">The full loop, end to end</h2>
          <p className="mx-auto mt-4 max-w-2xl text-brand-100">
            Flag or experiment → live data → an AI-grounded recommendation → a
            governed rollout decision → an executive rollup. All in one product,
            all auditable.
          </p>
          <Link href="/signup" className="btn-primary mt-8 inline-flex bg-white px-6 py-3 text-base text-brand-950 hover:bg-brand-50">
            Start shipping safely
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-slate-400">
          <span>© {new Date().getFullYear()} LaunchPilot</span>
          <span>Feature flags · Experiments · Release governance</span>
        </div>
      </footer>
    </div>
  );
}
