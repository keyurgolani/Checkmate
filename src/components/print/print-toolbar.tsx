"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface PrintToolbarProps {
  backHref: string;
  backLabel: string;
}

export function PrintToolbar({ backHref, backLabel }: PrintToolbarProps) {
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (hasPrinted.current) return;
    hasPrinted.current = true;
    // Wait for the page to fully paint before triggering print.
    // setTimeout ensures the browser has completed layout and paint
    // after React hydration — requestAnimationFrame alone fires too early.
    setTimeout(() => {
      window.print();
    }, 500);
  }, []);

  return (
    <div className="no-print flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
      <Link
        href={backHref}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        &larr; {backLabel}
      </Link>
      <button
        onClick={() => window.print()}
        className="px-4 py-1.5 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800"
      >
        Print
      </button>
    </div>
  );
}
