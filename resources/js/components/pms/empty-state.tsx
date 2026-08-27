import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-start px-6 py-10">
            {Icon && (
                <Icon className="mb-3 size-5 text-primary" />
            )}

            <h3 className="text-sm font-semibold">
                {title}
            </h3>

            {description && (
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                    {description}
                </p>
            )}

            {action && (
                <div className="mt-4">
                    {action}
                </div>
            )}
        </div>
    );
}
