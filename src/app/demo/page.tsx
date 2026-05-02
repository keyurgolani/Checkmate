"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { LogoLink } from "@/components/ui/logo";

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || "demo@checkmate.local";

export default function DemoPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: DEMO_EMAIL,
            password: "demo_checkmate_2026",
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          setError("Demo login failed. Please try again later.");
          return;
        }

        router.push("/dashboard");
      } catch {
        setError("An unexpected error occurred.");
      }
    })();
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center gap-6"
      >
        <LogoLink size={48} href="/" />
        {error ? (
          <p className="text-destructive text-sm">{error}</p>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Signing you into the demo...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
