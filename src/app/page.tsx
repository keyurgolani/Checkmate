import Link from "next/link";
import { ListChecks, ArrowRight, CheckCircle2, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 md:px-8 lg:px-12">
          <Link href="/" className="flex items-center gap-2">
            <Logo variant="icon" size={40} />
            <span className="text-lg font-semibold">CheckMate</span>
          </Link>
{/* Desktop Nav */}
          <div className="hidden items-center gap-3 sm:flex">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="h-10 px-4 text-base">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Nav */}
          <div className="flex sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader className="text-left">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Theme</span>
                    <ThemeToggle />
                  </div>
                  <Button variant="ghost" asChild className="justify-start">
                    <Link href="/signin">Sign in</Link>
                  </Button>
                  <Button asChild className="justify-start">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto max-w-7xl flex flex-col items-center justify-center gap-6 px-4 md:px-8 lg:px-12 py-16 text-center md:py-20 lg:py-28">
          <div className="space-y-4 md:space-y-6">
            <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
              Create, Share, and Track
              <br />
              <span className="text-primary">Checklist Templates</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground md:text-xl lg:text-2xl">
              Build reusable checklists for any life event. Share with others or
              keep them private. Track your progress with ease.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" asChild className="h-12 px-8 text-base">
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 px-8 text-base border-primary/20 hover:bg-primary/5 hover:border-primary/50 transition-colors">
              <Link href="/discover">Browse Public Checklists</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto max-w-7xl px-4 md:px-8 lg:px-12 py-12 md:py-16 lg:py-24">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3 lg:gap-8">
            <div className="flex flex-col items-center gap-4 text-center p-6 rounded-[var(--radius)] hover:bg-muted/50 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-transparent hover:border-border/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-primary/10">
                <ListChecks className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Create Templates</h3>
              <p className="text-muted-foreground max-w-sm">
                Design reusable checklist templates with nested items and
                references to other checklists.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 text-center p-6 rounded-[var(--radius)] hover:bg-muted/50 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-transparent hover:border-border/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-primary/10">
                <CheckCircle2 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Track Progress</h3>
              <p className="text-muted-foreground max-w-sm">
                Create personal checklists and track your completion with visual
                progress indicators.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 text-center p-6 rounded-[var(--radius)] hover:bg-muted/50 transition-all duration-300 hover:scale-105 hover:shadow-lg border border-transparent hover:border-border/50">
              <div className="flex h-14 w-14 items-center justify-center rounded-[var(--radius)] bg-primary/10">
                <ArrowRight className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold">Share & Collaborate</h3>
              <p className="text-muted-foreground max-w-sm">
                Make checklists public or share with specific collaborators with
                granular permissions.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container mx-auto max-w-7xl flex flex-col items-center justify-between gap-4 px-4 md:px-8 lg:px-12 md:flex-row">
          <p className="text-sm text-muted-foreground">
            © 2026 CheckMate. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:underline"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:underline"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
