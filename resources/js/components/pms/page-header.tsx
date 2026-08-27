import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface PageHeaderProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    actions?: ReactNode;
    eyebrow?: string;
}

export function PageHeader({
    title,
    description,
    icon: Icon,
    actions,
    eyebrow,
}: PageHeaderProps) {
    return (
        <header className="pms-page-header relative overflow-hidden">
            {/* INSTITUTIONAL ACCENT */}
            <div className="absolute inset-y-0 left-0 w-[3px] bg-primary" />

            <div className="flex flex-col gap-5 pl-1 lg:flex-row lg:items-center lg:justify-between">
                {/* TITLE AREA */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-4">
                        {Icon && (
                            <div className="hidden size-11 shrink-0 items-center justify-center border border-border bg-secondary/40 text-primary sm:flex">
                                <Icon
                                    className="size-5"
                                    strokeWidth={1.9}
                                />
                            </div>
                        )}

                        <div className="min-w-0">
                            {eyebrow && (
                                <div className="mb-1.5 flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                                        {eyebrow}
                                    </span>

                                    <span className="h-px w-8 bg-primary/35" />
                                </div>
                            )}

                            <div className="flex items-center gap-2">
                                {Icon && (
                                    <Icon
                                        className="size-5 shrink-0 text-primary sm:hidden"
                                        strokeWidth={1.9}
                                    />
                                )}

                                <h1 className="pms-page-title">
                                    {title}
                                </h1>
                            </div>

                            {description && (
                                <p className="pms-page-description">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* ACTION AREA */}
                {actions && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border pt-4 lg:border-t-0 lg:pt-0">
                        {actions}
                    </div>
                )}
            </div>
        </header>
    );
}
