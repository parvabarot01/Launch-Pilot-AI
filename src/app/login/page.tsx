import Link from "next/link";
import { loginAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            LaunchPilot
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Log in</h1>
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
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-brand-600">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
