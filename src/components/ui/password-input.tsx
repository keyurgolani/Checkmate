"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Button } from "./button";

// ============================================================================
// Password Strength Calculation
// ============================================================================

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  color: string;
  feedback: string[];
}

export function calculatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { score: 0, label: "Very Weak", color: "bg-muted", feedback: [] };
  }

  // Length checks
  if (password.length >= 8) score++;
  else feedback.push("At least 8 characters");
  
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score += 0.5;
  else feedback.push("Add lowercase letters");
  
  if (/[A-Z]/.test(password)) score += 0.5;
  else feedback.push("Add uppercase letters");
  
  if (/[0-9]/.test(password)) score += 0.5;
  else feedback.push("Add numbers");
  
  if (/[^a-zA-Z0-9]/.test(password)) score += 0.5;
  else feedback.push("Add special characters");

  // Normalize score to 0-4
  const normalizedScore = Math.min(4, Math.floor(score)) as 0 | 1 | 2 | 3 | 4;

  const strengthMap: Record<0 | 1 | 2 | 3 | 4, { label: PasswordStrength["label"]; color: string }> = {
    0: { label: "Very Weak", color: "bg-red-500" },
    1: { label: "Weak", color: "bg-orange-500" },
    2: { label: "Fair", color: "bg-yellow-500" },
    3: { label: "Strong", color: "bg-green-500" },
    4: { label: "Very Strong", color: "bg-emerald-500" },
  };

  const strength = strengthMap[normalizedScore];

  return {
    score: normalizedScore,
    label: strength.label,
    color: strength.color,
    feedback,
  };
}

// ============================================================================
// Password Strength Indicator Component
// ============================================================================

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);

  if (!password) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Strength bars */}
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-all duration-300",
              index < strength.score ? strength.color : "bg-muted"
            )}
          />
        ))}
      </div>
      
      {/* Strength label and feedback */}
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          "font-medium",
          strength.score <= 1 && "text-red-500",
          strength.score === 2 && "text-yellow-500",
          strength.score >= 3 && "text-green-500"
        )}>
          {strength.label}
        </span>
        {strength.feedback.length > 0 && (
          <span className="text-muted-foreground">
            {strength.feedback[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Password Input Component
// ============================================================================

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  showStrengthIndicator?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showStrengthIndicator = false, value, onChange, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [internalValue, setInternalValue] = React.useState("");

    const currentValue = value !== undefined ? String(value) : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (value === undefined) {
        setInternalValue(e.target.value);
      }
      onChange?.(e);
    };

    return (
      <div className="space-y-2">
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            className={cn("pr-10", className)}
            ref={ref}
            value={value}
            onChange={handleChange}
            {...props}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            )}
          </Button>
        </div>
        {showStrengthIndicator && (
          <PasswordStrengthIndicator password={currentValue} />
        )}
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
