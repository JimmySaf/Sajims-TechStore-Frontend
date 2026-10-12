
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound, X } from "lucide-react";
import { authService } from "../services/auth";
import type { AuthUser } from "../types/store";

type AuthModalProps = {
  onClose: () => void;
  onAuthenticated: (user: AuthUser) => void;
};

export default function AuthModal({
  onClose,
  onAuthenticated,
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (mode === "register" && password !== passwordConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const user =
        mode === "login"
          ? await authService.login(email.trim(), password)
          : await authService.register(
              name.trim(),
              email.trim(),
              password,
              passwordConfirmation,
            );

      onAuthenticated(user);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Authentication failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#17251f]/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-heading"
        className="relative my-auto w-full max-w-md rounded-3xl border border-[#e7e5dd] bg-[#fffefa] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close authentication"
          className="absolute top-4 right-4 rounded-full p-2 text-[#6e776f] transition hover:bg-[#eeeee6]"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#086b59] text-lg font-bold text-white">
            S
          </span>
          <div>
            <p className="font-semibold text-[#202923]">Sajims TechStore</p>
            <p className="text-xs text-[#777e78]">
              Your technology shopping account
            </p>
          </div>
        </div>

        <div className="mb-6">
          <h2
            id="auth-heading"
            className="text-2xl font-semibold tracking-tight text-[#202923]"
          >
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-[#777e78]">
            {mode === "login"
              ? "Sign in to manage your cart and orders."
              : "Register to start shopping with Sajims."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-[#f0efe8] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "login"
                ? "bg-white text-[#086b59] shadow-sm"
                : "text-[#777e78] hover:text-[#202923]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`rounded-lg py-2.5 text-sm font-medium transition ${
              mode === "register"
                ? "bg-white text-[#086b59] shadow-sm"
                : "text-[#777e78] hover:text-[#202923]"
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#39423c]">
                Full name
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-[#e5e2d9] bg-white px-3.5 focus-within:border-[#086b59]">
                <UserRound size={18} className="text-[#899087]" />
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your full name"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#39423c]">
              Email address
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-[#e5e2d9] bg-white px-3.5 focus-within:border-[#086b59]">
              <Mail size={18} className="text-[#899087]" />
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#39423c]">
              Password
            </span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-[#e5e2d9] bg-white px-3.5 focus-within:border-[#086b59]">
              <LockKeyhole size={18} className="text-[#899087]" />
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="rounded p-1 text-[#777e78] hover:text-[#086b59]"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>

          {mode === "register" && (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#39423c]">
                Confirm password
              </span>
              <span className="flex h-12 items-center gap-3 rounded-xl border border-[#e5e2d9] bg-white px-3.5 focus-within:border-[#086b59]">
                <LockKeyhole size={18} className="text-[#899087]" />
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  value={passwordConfirmation}
                  onChange={(event) =>
                    setPasswordConfirmation(event.target.value)
                  }
                  placeholder="Enter your password again"
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
              </span>
            </label>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-700"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#086b59] px-4 text-sm font-semibold text-white transition hover:bg-[#075747] disabled:opacity-60"
          >
            {busy
              ? "Please wait..."
              : mode === "login"
                ? "Sign In"
                : "Create Account"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-[#858b83]">
          By continuing, you agree to use your account responsibly and keep
          your sign-in details secure.
        </p>
      </section>
    </div>
  );
}
