import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-wash px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            LaunchPilot
          </Link>
          <h1 className="mt-2 text-page-title text-ink">Log in</h1>
        </div>
        <div className="card">
          <AuthForm
            action={loginAction}
            submitLabel="Log in"
            fields={[
              { name: "email", label: "Email", type: "email", placeholder: "you@company.com" },
              { name: "password", label: "Password", type: "password" },
            ]}
          />
        </div>
        <p className="mt-4 text-center text-sm text-slate">
          No account?{" "}
          <Link href="/signup" className="font-medium text-brand">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-center text-xs text-mute">
          <Link href="/how-it-works" className="hover:text-slate hover:underline">
            How it works
          </Link>
        </p>
      </div>
    </div>
  );
}
