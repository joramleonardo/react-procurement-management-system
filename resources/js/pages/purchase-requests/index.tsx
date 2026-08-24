import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    FormEvent,
    useState,
} from 'react';

type Office = {
    id: number;
    code: string;
    name: string;
};

type Ppmp = {
    id: number;
    ppmp_no: string;
};

type Requester = {
    id: number;
    name: string;
};

type PurchaseRequestRecord = {
    id: number;
    pr_no: string;
    pr_date: string | null;
    status: string;
    total_amount: string;
    purpose: string | null;
    items_count: number;

    ppmp: Ppmp;
    office: Office;
    requester: Requester;

    updated_at: string | null;
};

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type PaginatedPurchaseRequests = {
    data: PurchaseRequestRecord[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

type Filters = {
    search: string;
    status: string;
    year: string;
};

type IndexProps = {
    purchaseRequests:
        PaginatedPurchaseRequests;

    filters: Filters;

    years: number[];

    can: {
        create: boolean;
    };

    flash: {
        success: string | null;
    };
};

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Purchase Requests',
        href: '/purchase-requests',
    },
];

function formatCurrency(
    value: string | number,
): string {
    return new Intl.NumberFormat(
        'en-PH',
        {
            style: 'currency',
            currency: 'PHP',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        },
    ).format(Number(value));
}

function formatStatus(
    status: string,
): string {
    switch (status) {
        case 'submitted':
            return 'Submitted for Review';

        case 'returned_for_revision':
            return 'Returned for Revision';

        case 'approved':
            return 'Approved';

        default:
            return 'Draft';
    }
}

function statusClasses(
    status: string,
): string {
    switch (status) {
        case 'approved':
            return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';

        case 'submitted':
            return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';

        case 'returned_for_revision':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';

        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
}

export default function PurchaseRequestIndex({
    purchaseRequests,
    filters,
    years,
    can,
    flash,
}: IndexProps) {
    const [search, setSearch] =
        useState(
            filters.search ?? '',
        );

    const [status, setStatus] =
        useState(
            filters.status ?? '',
        );

    const [year, setYear] =
        useState(
            filters.year ?? '',
        );

    function submitFilters(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        router.get(
            '/purchase-requests',
            {
                search,
                status,
                year,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    }

    function resetFilters() {
        setSearch('');
        setStatus('');
        setYear('');

        router.get(
            '/purchase-requests',
            {},
            {
                replace: true,
            },
        );
    }

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head
                title="Purchase Requests"
            />

            <div className="flex flex-1 flex-col gap-5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Purchase Requests
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Create and monitor
                            Purchase Requests
                            originating from
                            approved PPMPs.
                        </p>
                    </div>

                    {can.create && (
                        <Button
                            variant="outline"
                            asChild
                        >
                            <Link href="/ppmps">
                                Select Approved
                                PPMP
                            </Link>
                        </Button>
                    )}
                </div>

                {flash.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                        {flash.success}
                    </div>
                )}

                <form
                    onSubmit={
                        submitFilters
                    }
                    className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-2 xl:grid-cols-[1fr_180px_180px_auto_auto]"
                >
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target
                                    .value,
                            )
                        }
                        placeholder="Search PR no., PPMP no., purpose, or office"
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    />

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target
                                    .value,
                            )
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                        <option value="">
                            All statuses
                        </option>

                        <option value="draft">
                            Draft
                        </option>

                        <option value="submitted">
                            Submitted for
                            Review
                        </option>

                        <option value="returned_for_revision">
                            Returned for
                            Revision
                        </option>

                        <option value="approved">
                            Approved
                        </option>
                    </select>

                    <select
                        value={year}
                        onChange={(event) =>
                            setYear(
                                event.target
                                    .value,
                            )
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                        <option value="">
                            All years
                        </option>

                        {years.map(
                            (value) => (
                                <option
                                    key={
                                        value
                                    }
                                    value={
                                        value
                                    }
                                >
                                    {
                                        value
                                    }
                                </option>
                            ),
                        )}
                    </select>

                    <Button type="submit">
                        Apply
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={
                            resetFilters
                        }
                    >
                        Reset
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1150px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        PR No.
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Date
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Source PPMP
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Office /
                                        Section
                                    </th>

                                    <th className="px-4 py-3 text-center">
                                        Items
                                    </th>

                                    <th className="px-4 py-3 text-right">
                                        Total Amount
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Created By
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Updated
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {purchaseRequests
                                    .data
                                    .length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan={
                                                9
                                            }
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No Purchase
                                            Requests
                                            found.
                                        </td>
                                    </tr>
                                ) : (
                                    purchaseRequests
                                        .data
                                        .map(
                                            (
                                                pr,
                                            ) => (
                                                <tr
                                                    key={
                                                        pr.id
                                                    }
                                                    className="hover:bg-muted/30"
                                                >
                                                    <td className="px-4 py-4 font-medium">
                                                        {
                                                            pr.pr_no
                                                        }
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4">
                                                        {pr.pr_date ??
                                                            '—'}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <Link
                                                            href={`/ppmps/${pr.ppmp.id}`}
                                                            className="font-medium hover:underline"
                                                        >
                                                            {
                                                                pr
                                                                    .ppmp
                                                                    .ppmp_no
                                                            }
                                                        </Link>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <div className="font-medium">
                                                            {
                                                                pr
                                                                    .office
                                                                    .code
                                                            }
                                                        </div>

                                                        <div className="max-w-[220px] text-xs text-muted-foreground">
                                                            {
                                                                pr
                                                                    .office
                                                                    .name
                                                            }
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 text-center">
                                                        {
                                                            pr.items_count
                                                        }
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-right font-medium">
                                                        {formatCurrency(
                                                            pr.total_amount,
                                                        )}
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        <span
                                                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                                                                pr.status,
                                                            )}`}
                                                        >
                                                            {formatStatus(
                                                                pr.status,
                                                            )}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-4">
                                                        {
                                                            pr
                                                                .requester
                                                                .name
                                                        }
                                                    </td>

                                                    <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                                                        {pr.updated_at ??
                                                            '—'}
                                                    </td>
                                                </tr>
                                            ),
                                        )
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing{' '}
                            {purchaseRequests.from ??
                                0}{' '}
                            to{' '}
                            {purchaseRequests.to ??
                                0}{' '}
                            of{' '}
                            {
                                purchaseRequests.total
                            }{' '}
                            Purchase Requests
                        </p>

                        <div className="flex flex-wrap gap-1">
                            {purchaseRequests
                                .links
                                .map(
                                    (
                                        link,
                                        index,
                                    ) =>
                                        link.url ? (
                                            <Link
                                                key={
                                                    index
                                                }
                                                href={
                                                    link.url
                                                }
                                                preserveState
                                                className={`rounded-md border px-3 py-1.5 text-sm ${
                                                    link.active
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'hover:bg-muted'
                                                }`}
                                                dangerouslySetInnerHTML={{
                                                    __html:
                                                        link.label,
                                                }}
                                            />
                                        ) : (
                                            <span
                                                key={
                                                    index
                                                }
                                                className="rounded-md border px-3 py-1.5 text-sm opacity-40"
                                                dangerouslySetInnerHTML={{
                                                    __html:
                                                        link.label,
                                                }}
                                            />
                                        ),
                                )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
