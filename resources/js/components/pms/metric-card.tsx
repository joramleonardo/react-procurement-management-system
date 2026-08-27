import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface MetricCardProps {
    title: string;
    value: ReactNode;
    description?: string;
    icon?: LucideIcon;
    className?: string;
}

export function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    className,
}: MetricCardProps) {
    return (
        <div
            className={cn(
                'border-r border-b border-border bg-card px-5 py-4',
                className,
            )}
        >
            <div className="flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {title}
                    </div>

                    <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
                        {value}
                    </div>

                    {description && (
                        <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {description}
                        </p>
                    )}
                </div>

                {Icon && (
                    <Icon className="size-5 shrink-0 text-primary" />
                )}
            </div>
        </div>
    );
}
