import Link from "next/link";
import { signupAction } from "@/app/actions/auth";
import { AuthForm } from "@/components/AuthForm";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-wash px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
            LaunchPilot
          </Link>
          <h1 className="mt-2 text-page-title text-ink">Create your account</h1>
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
        <p className="mt-4 text-center text-sm text-slate">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand">
            Log in
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
