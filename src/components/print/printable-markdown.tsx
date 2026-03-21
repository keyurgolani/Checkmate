import ReactMarkdown from "react-markdown";

interface PrintableMarkdownProps {
  content: string;
}

export function PrintableMarkdown({ content }: PrintableMarkdownProps) {
  return (
    <div
      className={[
        "text-black max-w-none text-sm",
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-1",
        "[&_ul]:my-1 [&_ul]:pl-5 [&_ul]:list-disc",
        "[&_ol]:my-1 [&_ol]:pl-5 [&_ol]:list-decimal",
        "[&_li]:my-0.5",
        "[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-gray-100 [&_code]:text-xs [&_code]:text-black",
        "[&_pre]:my-2 [&_pre]:p-2 [&_pre]:rounded [&_pre]:bg-gray-100",
        "[&_a]:text-black [&_a]:underline",
        "[&_strong]:font-semibold",
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-2 [&_h1]:mb-1",
        "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1",
        "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-1.5 [&_h3]:mb-0.5",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-gray-400 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600",
      ].join(" ")}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
