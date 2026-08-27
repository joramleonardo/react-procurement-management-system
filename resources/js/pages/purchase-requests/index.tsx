// resources/js/pages/purchase-requests/index.tsx

import { DataTableShell } from '@/components/pms/data-table-shell';
import { EmptyState } from '@/components/pms/empty-state';
import { PageHeader } from '@/components/pms/page-header';
import { StatusBadge } from '@/components/pms/status-badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    router,
} from '@inertiajs/react';
import {
    FileText,
    Search,
} from 'lucide-react';
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

            <div className="pms-page">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement"
                    title="Purchase Requests"
                    description="Create and monitor Purchase Requests originating from approved PPMPs."
                    icon={FileText}
                    actions={
                        can.create ? (
                            <Button
                                variant="outline"
                                asChild
                            >
                                <Link href="/ppmps">
                                    Find Approved
                                    PPMP
                                </Link>
                            </Button>
                        ) : null
                    }
                />

                {/* SUCCESS MESSAGE */}
                {flash.success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/50 dark:text-green-200">
                        {flash.success}
                    </div>
                )}

                {/* FILTER BAR */}
                <form
                    onSubmit={
                        submitFilters
                    }
                    className="pms-filter-bar grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(300px,1fr)_190px_160px_auto_auto]"
                >
                    {/* SEARCH */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="search"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Search
                        </label>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <input
                                id="search"
                                type="search"
                                value={search}
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="PR no., PPMP no., purpose, or office"
                                className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
                            />
                        </div>
                    </div>

                    {/* STATUS */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="status"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Status
                        </label>

                        <select
                            id="status"
                            value={status}
                            onChange={(
                                event,
                            ) =>
                                setStatus(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
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
                    </div>

                    {/* YEAR */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="year"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Year
                        </label>

                        <select
                            id="year"
                            value={year}
                            onChange={(
                                event,
                            ) =>
                                setYear(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                        >
                            <option value="">
                                All years
                            </option>

                            {years.map(
                                (
                                    value,
                                ) => (
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
                    </div>

                    {/* APPLY */}
                    <div className="flex items-end">
                        <Button
                            type="submit"
                            className="w-full xl:w-auto"
                        >
                            Apply Filters
                        </Button>
                    </div>

                    {/* CLEAR */}
                    <div className="flex items-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={
                                resetFilters
                            }
                            className="w-full xl:w-auto"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </form>

                {/* PURCHASE REQUEST TABLE */}
                <DataTableShell
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                                Purchase
                                Requests
                            </p>

                            {/* PAGINATION */}
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
                                                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                                        link.active
                                                            ? 'border-primary bg-primary text-primary-foreground'
                                                            : 'bg-background hover:bg-muted'
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
                                                    className="rounded-md border bg-background px-3 py-1.5 text-sm opacity-40"
                                                    dangerouslySetInnerHTML={{
                                                        __html:
                                                            link.label,
                                                    }}
                                                />
                                            ),
                                    )}
                            </div>
                        </div>
                    }
                >
                    <table className="pms-table min-w-[1180px]">
                        <thead>
                            <tr>
                                <th className="w-[190px]">
                                    PR No.
                                </th>

                                <th className="w-[130px]">
                                    Date
                                </th>

                                <th className="w-[180px]">
                                    Source PPMP
                                </th>

                                <th className="w-[260px]">
                                    Office /
                                    Section
                                </th>

                                <th className="w-[90px] text-center">
                                    Items
                                </th>

                                <th className="w-[180px] text-right">
                                    Total Amount
                                </th>

                                <th className="w-[190px]">
                                    Status
                                </th>

                                <th className="w-[190px]">
                                    Created By
                                </th>

                                <th className="w-[180px]">
                                    Updated
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {purchaseRequests
                                .data
                                .length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            9
                                        }
                                        className="p-0!"
                                    >
                                        <EmptyState
                                            icon={
                                                FileText
                                            }
                                            title="No Purchase Requests found"
                                            description="No Purchase Requests match your current filters. Try changing the filters or select an approved PPMP to create a new request."
                                            action={
                                                can.create ? (
                                                    <Button
                                                        variant="outline"
                                                        asChild
                                                    >
                                                        <Link href="/ppmps">
                                                            Find
                                                            Approved
                                                            PPMP
                                                        </Link>
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
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
                                            >
                                                {/* PR NUMBER */}
                                                <td>
                                                    <div className="font-semibold text-foreground">
                                                        {
                                                            pr.pr_no
                                                        }
                                                    </div>

                                                    {pr.purpose && (
                                                        <div
                                                            className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground"
                                                            title={
                                                                pr.purpose
                                                            }
                                                        >
                                                            {
                                                                pr.purpose
                                                            }
                                                        </div>
                                                    )}
                                                </td>

                                                {/* DATE */}
                                                <td className="whitespace-nowrap">
                                                    {pr.pr_date ??
                                                        '—'}
                                                </td>

                                                {/* SOURCE PPMP */}
                                                <td>
                                                    <Link
                                                        href={`/ppmps/${pr.ppmp.id}`}
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {
                                                            pr
                                                                .ppmp
                                                                .ppmp_no
                                                        }
                                                    </Link>
                                                </td>

                                                {/* OFFICE */}
                                                <td>
                                                    <div className="font-medium">
                                                        {
                                                            pr
                                                                .office
                                                                .code
                                                        }
                                                    </div>

                                                    <div className="mt-0.5 max-w-[240px] text-xs leading-5 text-muted-foreground">
                                                        {
                                                            pr
                                                                .office
                                                                .name
                                                        }
                                                    </div>
                                                </td>

                                                {/* ITEM COUNT */}
                                                <td className="text-center">
                                                    <span className="inline-flex min-w-8 justify-center rounded-md bg-muted px-2 py-1 text-xs font-semibold">
                                                        {
                                                            pr.items_count
                                                        }
                                                    </span>
                                                </td>

                                                {/* TOTAL AMOUNT */}
                                                <td className="whitespace-nowrap text-right">
                                                    <span className="font-semibold text-foreground">
                                                        {formatCurrency(
                                                            pr.total_amount,
                                                        )}
                                                    </span>
                                                </td>

                                                {/* STATUS */}
                                                <td>
                                                    <StatusBadge
                                                        status={
                                                            pr.status
                                                        }
                                                    />
                                                </td>

                                                {/* CREATED BY */}
                                                <td>
                                                    <div className="font-medium">
                                                        {
                                                            pr
                                                                .requester
                                                                .name
                                                        }
                                                    </div>
                                                </td>

                                                {/* UPDATED */}
                                                <td className="whitespace-nowrap text-muted-foreground">
                                                    {pr.updated_at ??
                                                        '—'}
                                                </td>
                                            </tr>
                                        ),
                                    )
                            )}
                        </tbody>
                    </table>
                </DataTableShell>
            </div>
        </AppLayout>
    );
}
