import type { ResourceLink } from "@/lib/pocketbase-types";

interface PrintableResourceListProps {
  resources: ResourceLink[];
}

export function PrintableResourceList({ resources }: PrintableResourceListProps) {
  if (resources.length === 0) return null;

  return (
    <div className="mt-1.5">
      <p className="text-xs font-medium text-gray-500 mb-1">Resources:</p>
      <ul className="space-y-0.5">
        {resources.map((resource, index) => (
          <li key={index} className="text-xs text-black">
            <span className="font-medium">{resource.title || resource.url}</span>
            {resource.title && (
              <span className="text-gray-500"> ({resource.url})</span>
            )}
            {resource.description && (
              <span className="text-gray-500 block ml-4">{resource.description}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
