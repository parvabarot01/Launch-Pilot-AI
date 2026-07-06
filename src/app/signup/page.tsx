import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
            LaunchPilot
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Create your account</h1>
        </div>
        <div className="card">
          <AuthForm
            action={signupAction}
            submitLabel="Create account"
            fields={[
              { name: "name", label: "Your name", type: "text" },
              { name: "orgName", label: "Organization name", type: "text", placeholder: "Acme Inc." },
              { name: "email", label: "Email", type: "email", placeholder: "you@company.com" },
              { name: "password", label: "Password", type: "password", placeholder: "At least 8 characters" },
            ]}
          />
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
