import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface SectionCardProps {
    title?: string;
    description?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
}

export function SectionCard({
    title,
    description,
    icon: Icon,
    actions,
    children,
    className,
    contentClassName,
}: SectionCardProps) {
    const hasHeader =
        Boolean(title) ||
        Boolean(description) ||
        Boolean(actions);

    return (
        <section
            className={cn(
                'border-b border-border bg-card',
                className,
            )}
        >
            {hasHeader && (
                <div className="flex flex-col gap-3 border-b border-border bg-secondary/30 px-5 py-3.5 md:flex-row md:items-center md:justify-between md:px-6">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            {Icon && (
                                <Icon className="size-4 shrink-0 text-primary" />
                            )}

                            {title && (
                                <h2 className="text-sm font-semibold uppercase tracking-[0.04em] text-foreground">
                                    {title}
                                </h2>
                            )}
                        </div>

                        {description && (
                            <p className="mt-1 text-sm leading-5 text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>

                    {actions && (
                        <div className="flex shrink-0 flex-wrap gap-2">
                            {actions}
                        </div>
                    )}
                </div>
            )}

            <div
                className={cn(
                    'px-5 py-5 md:px-6',
                    contentClassName,
                )}
            >
                {children}
            </div>
        </section>
    );
}
