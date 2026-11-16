
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const LOGO_URL =
  "https://vhjphwsbneabpsoxyxti.supabase.co/storage/v1/object/public/logos/ll.png";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-grid" />

      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Image
              src={LOGO_URL}
              alt="NX Sports Logo"
              width={54}
              height={54}
              priority
              unoptimized
            />
          </div>

          <div>
            <div className="login-title">NX SPORTS</div>
            <div className="login-subtitle">
              ADMINISTRATION PORTAL
            </div>
          </div>
        </div>

        <div className="eyebrow mb-2">WELCOME BACK</div>

        <h1 className="login-heading">Admin Login</h1>

        <p className="login-description">
          Sign in to access your NX Sports control center.
        </p>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Email Address
            </label>

            <div className="relative">
              <Mail
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
              />

              <input
                id="email"
                type="email"
                className="form-input pl-10"
                placeholder="Enter your admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>

            <div className="relative">
              <LockKeyhole
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
              />

              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input pl-10 pr-11"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text2)] hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={17} />
                ) : (
                  <Eye size={17} />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error mb-4">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner" />
                AUTHENTICATING...
              </>
            ) : (
              <>
                SIGN IN TO DASHBOARD
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <LockKeyhole size={12} className="inline mr-2" />
          SECURE ADMIN ACCESS | NX SPORTS
        </div>
      </div>
    </main>
  );
}
