"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ListChecks, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FormErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  general?: string;
}

function Logo() {
  return (
    <Link href="/" className="mb-8 flex items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg">
        <ListChecks className="h-7 w-7" />
      </div>
      <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        CheckMate
      </span>
    </Link>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState({
    password: "",
    passwordConfirm: "",
  });

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error?.message || "Failed to send reset email.",
        });
        return;
      }

      setSuccess(true);
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newErrors: FormErrors = {};

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = "Please confirm your password";
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: formData.password,
          passwordConfirm: formData.passwordConfirm,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error?.message || "Failed to reset password.",
        });
        return;
      }

      setSuccess(true);
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  // Success state for request reset
  if (success && !token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Logo />
          <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-green-500/10"
              >
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </motion.div>
              <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
              <CardDescription className="text-base">
                If an account with that email exists, we&apos;ve sent you a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" asChild className="rounded-xl">
                <Link href="/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Success state for confirm reset
  if (success && token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Logo />
          <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-green-500/10"
              >
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </motion.div>
              <CardTitle className="text-2xl font-bold">Password reset successful</CardTitle>
              <CardDescription className="text-base">
                Your password has been reset. You can now sign in with your new password.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild className="rounded-xl h-11">
                <Link href="/signin">Sign in</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Confirm reset form (with token)
  if (token) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <Logo />
          <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl font-bold">Set new password</CardTitle>
              <CardDescription className="text-base">
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleConfirmReset} className="space-y-4">
                {errors.general && (
                  <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                    {errors.general}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={isLoading}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    aria-invalid={!!errors.password}
                    className="rounded-xl h-11"
                  />
                  {errors.password && (
                    <p id="password-error" className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirm">Confirm New Password</Label>
                  <Input
                    id="passwordConfirm"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={formData.passwordConfirm}
                    onChange={(e) =>
                      setFormData({ ...formData, passwordConfirm: e.target.value })
                    }
                    disabled={isLoading}
                    aria-describedby={errors.passwordConfirm ? "passwordConfirm-error" : undefined}
                    aria-invalid={!!errors.passwordConfirm}
                    className="rounded-xl h-11"
                  />
                  {errors.passwordConfirm && (
                    <p id="passwordConfirm-error" className="text-sm text-destructive">
                      {errors.passwordConfirm}
                    </p>
                  )}
                </div>

                <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    "Reset password"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button variant="ghost" asChild className="rounded-xl">
                <Link href="/signin">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to sign in
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Request reset form (no token)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Logo />
        <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Reset your password</CardTitle>
            <CardDescription className="text-base">
              Enter your email address and we&apos;ll send you a link to reset your password
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleRequestReset} className="space-y-4">
              {errors.general && (
                <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {errors.general}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={!!errors.email}
                  className="rounded-xl h-11"
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending reset link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="ghost" asChild className="rounded-xl">
              <Link href="/signin">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <Logo />
      <Card className="w-full max-w-md rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
