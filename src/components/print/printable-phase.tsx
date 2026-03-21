interface PrintablePhaseProps {
  title: string;
  progress?: { completed: number; total: number };
}

export function PrintablePhase({ title, progress }: PrintablePhaseProps) {
  return (
    <div className="flex items-center gap-3 py-2 px-3 border-l-4 border-gray-800 bg-gray-100 font-semibold text-sm text-black" style={{ breakAfter: "avoid" }}>
      <span className="flex-1">{title}</span>
      {progress && (
        <span className="text-xs font-normal text-gray-600">
          {progress.completed}/{progress.total}
        </span>
      )}
    </div>
  );
}
