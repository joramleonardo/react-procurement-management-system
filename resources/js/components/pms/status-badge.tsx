import { cn } from '@/lib/utils';

type StatusBadgeProps = {
    status: string;
    className?: string;
};

function statusLabel(
    status: string,
): string {
    switch (status) {
        case 'draft':
            return 'Draft';

        case 'submitted':
            return 'Submitted for Review';

        case 'returned_for_revision':
            return 'Returned for Revision';

        case 'approved':
            return 'Approved';

        case 'active':
            return 'Active';

        case 'inactive':
            return 'Inactive';

        case 'locked':
            return 'Locked';

        case 'pending':
            return 'Pending';

        default:
            return status
                .replace(/_/g, ' ')
                .replace(
                    /\b\w/g,
                    (letter) =>
                        letter.toUpperCase(),
                );
    }
}

function statusStyles(
    status: string,
): string {
    switch (status) {
        /*
         * Positive / completed
         */
        case 'approved':
        case 'active':
            return [
                'border-emerald-300',
                'bg-emerald-50',
                'text-emerald-800',
                'dark:border-emerald-800',
                'dark:bg-emerald-950/45',
                'dark:text-emerald-300',
            ].join(' ');

        /*
         * In workflow / review
         */
        case 'submitted':
            return [
                'border-blue-300',
                'bg-blue-50',
                'text-blue-800',
                'dark:border-blue-800',
                'dark:bg-blue-950/45',
                'dark:text-blue-300',
            ].join(' ');

        /*
         * Requires attention
         */
        case 'returned_for_revision':
        case 'pending':
            return [
                'border-amber-300',
                'bg-amber-50',
                'text-amber-800',
                'dark:border-amber-800',
                'dark:bg-amber-950/45',
                'dark:text-amber-300',
            ].join(' ');

        /*
         * Restricted / unavailable
         */
        case 'inactive':
        case 'locked':
            return [
                'border-red-300',
                'bg-red-50',
                'text-red-800',
                'dark:border-red-800',
                'dark:bg-red-950/45',
                'dark:text-red-300',
            ].join(' ');

        /*
         * Neutral / not yet submitted
         */
        case 'draft':
        default:
            return [
                'border-slate-300',
                'bg-slate-50',
                'text-slate-700',
                'dark:border-slate-700',
                'dark:bg-slate-900/70',
                'dark:text-slate-300',
            ].join(' ');
    }
}

function dotStyles(
    status: string,
): string {
    switch (status) {
        case 'approved':
        case 'active':
            return 'bg-emerald-500';

        case 'submitted':
            return 'bg-blue-500';

        case 'returned_for_revision':
        case 'pending':
            return 'bg-amber-500';

        case 'inactive':
        case 'locked':
            return 'bg-red-500';

        case 'draft':
        default:
            return 'bg-slate-400';
    }
}

export function StatusBadge({
    status,
    className,
}: StatusBadgeProps) {
    return (
        <span
            className={cn(
                `
                    inline-flex
                    w-fit
                    max-w-full
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    leading-none
                    tracking-[0.02em]
                    whitespace-nowrap
                `,
                statusStyles(status),
                className,
            )}
        >
            <span
                className={cn(
                    `
                        size-1.5
                        shrink-0
                        rounded-full
                        ring-2
                        ring-current/10
                    `,
                    dotStyles(status),
                )}
            />

            <span className="truncate">
                {statusLabel(status)}
            </span>
        </span>
    );
}
