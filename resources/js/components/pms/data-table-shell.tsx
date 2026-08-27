import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface DataTableShellProps {
    children: ReactNode;
    footer?: ReactNode;
    className?: string;
}

export function DataTableShell({
    children,
    footer,
    className,
}: DataTableShellProps) {
    return (
        <section
            className={cn(
                'relative border-y border-border bg-card',
                className,
            )}
        >
            {/* TABLE WORKSPACE */}
            <div className="relative">
                <div className="overflow-x-auto">
                    {children}
                </div>

                {/* SUBTLE LOWER EDGE */}
                {!footer && (
                    <div className="h-px bg-border" />
                )}
            </div>

            {/* TABLE FOOTER / PAGINATION */}
            {footer && (
                <footer className="border-t border-border bg-secondary/25 px-5 py-3 md:px-6">
                    <div className="flex min-h-8 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {footer}
                    </div>
                </footer>
            )}
        </section>
    );
}
