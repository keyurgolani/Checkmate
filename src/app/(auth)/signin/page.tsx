"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoLink } from "@/components/ui/logo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

/**
 * Validates and sanitizes the returnTo URL to prevent open redirect attacks.
 * Only allows relative URLs starting with '/'.
 */
function getValidReturnUrl(returnTo: string | null): string {
  const defaultUrl = "/dashboard";
  
  if (!returnTo) return defaultUrl;
  
  // Only allow relative URLs starting with '/'
  // This prevents open redirect attacks to external sites
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  
  return defaultUrl;
}

/**
 * Loading skeleton for the sign in form
 */
function SignInFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

/**
 * Sign in form component that uses useSearchParams
 */
function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const validReturnUrl = getValidReturnUrl(returnTo);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        // Handle specific error codes
        if (data.error?.code === "AUTH_002") {
          setErrors({
            general: data.error.message || "Account temporarily locked. Please try again later.",
          });
        } else if (data.error?.code === "AUTH_001") {
          setErrors({
            general: "Invalid email or password. Please try again.",
          });
        } else {
          setErrors({
            general: data.error?.message || "Sign in failed. Please try again.",
          });
        }
        return;
      }

      // Redirect to the return URL or dashboard
      // Requirements: 2.2 - Account upgrade flow preserves intended destination
      router.push(validReturnUrl);
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    // OAuth implementation would redirect to provider
    // For now, show a message that OAuth is being set up
    setErrors({ general: `${provider} sign in is being configured.` });
    setIsLoading(false);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            disabled={isLoading}
            aria-describedby={errors.email ? "email-error" : undefined}
            aria-invalid={!!errors.email}
            className="rounded-xl h-11 border-muted-foreground/20 dark:border-input bg-background/50 focus:bg-background transition-colors"
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/reset-password"
              className="text-sm text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            disabled={isLoading}
            aria-describedby={errors.password ? "password-error" : undefined}
            aria-invalid={!!errors.password}
            className="rounded-xl h-11 border-muted-foreground/20 dark:border-input bg-background/50 focus:bg-background transition-colors"
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full rounded-xl h-11 text-base font-medium" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-3">
        <Button
          variant="outline"
          onClick={() => handleOAuthSignIn("google")}
          disabled={isLoading}
          className="rounded-xl h-11"
        >
          <Mail className="mr-2 h-4 w-4" />
          Google
        </Button>
        <Button
          variant="outline"
          onClick={() => handleOAuthSignIn("github")}
          disabled={isLoading}
          className="rounded-xl h-11"
        >
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </Button>
      </div>

      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link 
            href={returnTo ? `/signup?returnTo=${encodeURIComponent(returnTo)}` : "/signup"} 
            className="text-primary font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-6 flex justify-center">
            <LogoLink size={48} href="/" />
        </div>

        <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Suspense fallback={<SignInFormSkeleton />}>
              <SignInForm />
            </Suspense>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
