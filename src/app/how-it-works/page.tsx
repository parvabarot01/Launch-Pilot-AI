import Link from "next/link";
import { HowItWorksFlow } from "@/components/HowItWorksFlow";

export default function HowItWorksPage() {
  return (
    <div className="bg-surface">
      <header className="border-b border-rule">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-control bg-brand text-xs font-bold text-white">
              LP
            </div>
            <span className="font-semibold tracking-tight text-ink">LaunchPilot</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate hover:text-ink">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1180px] px-6 py-16">
        <div className="max-w-2xl">
          <p className="text-eyebrow uppercase text-mute">How it works</p>
          <h1 className="mt-2 text-page-title text-ink">
            Five steps from an idea to a proven, provable release.
          </h1>
          <p className="mt-3 text-sm text-slate">
            This is the same sequence you'll see the moment you create your first flag —
            governance isn't a settings tab bolted onto shipping, it's the shape of the whole
            product.
          </p>
        </div>

        <div className="mt-16">
          <HowItWorksFlow orientation="horizontal" />
        </div>
      </main>
    </div>
  );
}
