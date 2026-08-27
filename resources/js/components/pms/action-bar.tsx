import { cn } from '@/lib/utils';
import { type ReactNode } from 'react';

interface ActionBarProps {
    left?: ReactNode;
    children: ReactNode;
    sticky?: boolean;
    className?: string;
}

export function ActionBar({
    left,
    children,
    sticky = true,
    className,
}: ActionBarProps) {
    return (
        <div
            className={cn(
                'flex flex-col-reverse gap-3 border-t border-border bg-card px-5 py-3 md:flex-row md:items-center md:justify-between md:px-6',
                sticky &&
                    'sticky bottom-0 z-20',
                className,
            )}
        >
            <div>
                {left}
            </div>

            <div className="flex flex-wrap justify-end gap-2">
                {children}
            </div>
        </div>
    );
}
