"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ListChecks, Loader2, Github, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
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
  passwordConfirm?: string;
  displayName?: string;
  general?: string;
}

/**
 * Validates and sanitizes the returnTo URL to prevent open redirect attacks.
 * Only allows relative URLs starting with '/'.
 */
function getValidReturnUrl(returnTo: string | null): string {
  const defaultUrl = "/dashboard";
  
  if (!returnTo) return defaultUrl;
  
  if (returnTo.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  
  return defaultUrl;
}

function SignUpFormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-12 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32 rounded-lg" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const validReturnUrl = getValidReturnUrl(returnTo);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    passwordConfirm: "",
    displayName: "",
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
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = "Please confirm your password";
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = "Passwords do not match";
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
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrors({
          general: data.error?.message || "Sign up failed. Please try again.",
        });
        return;
      }

      router.push(validReturnUrl);
    } catch {
      setErrors({ general: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setIsLoading(true);
    setErrors({ general: `${provider} sign in is being configured.` });
    setIsLoading(false);
  };

  // Clear general error when user starts typing
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData({ ...formData, [field]: value });
    // Clear general error when user modifies any field
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
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
          <Label htmlFor="displayName">Display Name (optional)</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="John Doe"
            autoComplete="name"
            value={formData.displayName}
            onChange={(e) => handleInputChange("displayName", e.target.value)}
            disabled={isLoading}
            aria-describedby={errors.displayName ? "displayName-error" : undefined}
            className="rounded-xl h-11 border-muted-foreground/20 dark:border-input bg-background/50 focus:bg-background transition-colors"
          />
          {errors.displayName && (
            <p id="displayName-error" className="text-sm text-destructive">
              {errors.displayName}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={formData.password}
            onChange={(e) => handleInputChange("password", e.target.value)}
            disabled={isLoading}
            showStrengthIndicator
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

        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Confirm Password</Label>
          <PasswordInput
            id="passwordConfirm"
            placeholder="••••••••"
            autoComplete="new-password"
            value={formData.passwordConfirm}
            onChange={(e) => handleInputChange("passwordConfirm", e.target.value)}
            disabled={isLoading}
            aria-describedby={errors.passwordConfirm ? "passwordConfirm-error" : undefined}
            aria-invalid={!!errors.passwordConfirm}
            className="rounded-xl h-11 border-muted-foreground/20 dark:border-input bg-background/50 focus:bg-background transition-colors"
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
              Creating account...
            </>
          ) : (
            "Create account"
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
          Already have an account?{" "}
          <Link 
            href={returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin"} 
            className="text-primary font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-lg">
            <ListChecks className="h-7 w-7" />
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            CheckMate
          </span>
        </Link>

        <Card className="rounded-3xl border bg-card/80 backdrop-blur-sm shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
            <CardDescription className="text-base">
              Get started with CheckMate to create and track your checklists
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Suspense fallback={<SignUpFormSkeleton />}>
              <SignUpForm />
            </Suspense>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
