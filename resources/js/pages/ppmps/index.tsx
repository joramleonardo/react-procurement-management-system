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
    ClipboardList,
    Plus,
    Search,
} from 'lucide-react';
import {
    FormEvent,
    useState,
} from 'react';

interface Office {
    id: number;
    code: string;
    name: string;
}

interface Coordinator {
    id: number;
    name: string;
}

interface PpmpRecord {
    id: number;
    ppmp_no: string;
    fiscal_year: number;
    plan_type: string;
    status: string;
    total_budget: string;
    items_count: number;
    office: Office;
    coordinator: Coordinator;
    updated_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedPpmps {
    data: PpmpRecord[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
}

interface Filters {
    search: string;
    fiscal_year: string;
    status: string;
    plan_type: string;
}

interface IndexProps {
    ppmps: PaginatedPpmps;
    filters: Filters;
    fiscalYears: number[];

    can: {
        create: boolean;
    };

    flash: {
        success: string | null;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'PPMP',
        href: '/ppmps',
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

export default function PpmpIndex({
    ppmps,
    filters,
    fiscalYears,
    can,
    flash,
}: IndexProps) {
    const [search, setSearch] =
        useState(
            filters.search ?? '',
        );

    const [
        fiscalYear,
        setFiscalYear,
    ] =
        useState(
            filters.fiscal_year ??
                '',
        );

    const [status, setStatus] =
        useState(
            filters.status ?? '',
        );

    const [
        planType,
        setPlanType,
    ] =
        useState(
            filters.plan_type ?? '',
        );

    function submitFilters(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        router.get(
            '/ppmps',
            {
                search,
                fiscal_year:
                    fiscalYear,
                status,
                plan_type:
                    planType,
            },
            {
                preserveState:
                    true,
                replace: true,
            },
        );
    }

    function resetFilters() {
        setSearch('');
        setFiscalYear('');
        setStatus('');
        setPlanType('');

        router.get(
            '/ppmps',
            {},
            {
                replace: true,
            },
        );
    }

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head title="PPMP" />

            <div className="pms-page">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Procurement Planning"
                    title="Project Procurement Management Plans"
                    description="Create, review, and monitor procurement plans for your division."
                    icon={
                        ClipboardList
                    }
                    actions={
                        can.create ? (
                            <Button
                                asChild
                            >
                                <Link href="/ppmps/create">
                                    <Plus className="size-4" />

                                    Create PPMP
                                </Link>
                            </Button>
                        ) : null
                    }
                />

                {/* SUCCESS MESSAGE */}
                {flash.success && (
                    <div className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800 md:px-6 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                        {
                            flash.success
                        }
                    </div>
                )}

                {/* FILTER BAR */}
                <form
                    onSubmit={
                        submitFilters
                    }
                    className="pms-filter-bar grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_170px_210px_160px_auto_auto]"
                >
                    {/* SEARCH */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="search"
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                            Search
                        </label>

                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                            <input
                                id="search"
                                type="search"
                                value={
                                    search
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value,
                                    )
                                }
                                placeholder="PPMP no., office, or coordinator"
                                className="h-10 w-full border border-input bg-background pl-9 pr-3 text-sm"
                            />
                        </div>
                    </div>

                    {/* FISCAL YEAR */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="fiscal_year"
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                            Fiscal Year
                        </label>

                        <select
                            id="fiscal_year"
                            value={
                                fiscalYear
                            }
                            onChange={(
                                event,
                            ) =>
                                setFiscalYear(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 w-full border border-input bg-background px-3 text-sm"
                        >
                            <option value="">
                                All fiscal
                                years
                            </option>

                            {fiscalYears.map(
                                (
                                    year,
                                ) => (
                                    <option
                                        key={
                                            year
                                        }
                                        value={
                                            year
                                        }
                                    >
                                        {
                                            year
                                        }
                                    </option>
                                ),
                            )}
                        </select>
                    </div>

                    {/* STATUS */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="status"
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                            Status
                        </label>

                        <select
                            id="status"
                            value={
                                status
                            }
                            onChange={(
                                event,
                            ) =>
                                setStatus(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 w-full border border-input bg-background px-3 text-sm"
                        >
                            <option value="">
                                All
                                statuses
                            </option>

                            <option value="draft">
                                Draft
                            </option>

                            <option value="submitted">
                                Submitted
                                for Review
                            </option>

                            <option value="returned_for_revision">
                                Returned
                                for
                                Revision
                            </option>

                            <option value="approved">
                                Approved
                            </option>
                        </select>
                    </div>

                    {/* TYPE */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="plan_type"
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                            PPMP Type
                        </label>

                        <select
                            id="plan_type"
                            value={
                                planType
                            }
                            onChange={(
                                event,
                            ) =>
                                setPlanType(
                                    event
                                        .target
                                        .value,
                                )
                            }
                            className="h-10 w-full border border-input bg-background px-3 text-sm"
                        >
                            <option value="">
                                All types
                            </option>

                            <option value="indicative">
                                Indicative
                            </option>

                            <option value="final">
                                Final
                            </option>
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

                    {/* RESET */}
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

                {/* TABLE */}
                <DataTableShell
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing{' '}
                                <span className="font-medium text-foreground">
                                    {ppmps.from ??
                                        0}
                                </span>{' '}
                                to{' '}
                                <span className="font-medium text-foreground">
                                    {ppmps.to ??
                                        0}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-foreground">
                                    {
                                        ppmps.total
                                    }
                                </span>{' '}
                                PPMP records
                            </div>

                            <div className="flex flex-wrap gap-1">
                                {ppmps.links.map(
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
                                                className={`inline-flex min-h-8 items-center border px-3 text-xs font-medium transition-colors ${
                                                    link.active
                                                        ? 'border-primary bg-primary text-primary-foreground'
                                                        : 'border-border bg-background hover:bg-secondary'
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
                                                className="inline-flex min-h-8 items-center border border-border bg-secondary/30 px-3 text-xs text-muted-foreground opacity-50"
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
                                <th className="w-[200px]">
                                    PPMP No.
                                </th>

                                <th className="w-[110px]">
                                    Fiscal Year
                                </th>

                                <th className="w-[280px]">
                                    End-User Unit
                                </th>

                                <th className="w-[220px]">
                                    Coordinator
                                </th>

                                <th className="w-[80px] text-center">
                                    Items
                                </th>

                                <th className="w-[180px] text-right">
                                    Total Budget
                                </th>

                                <th className="w-[190px]">
                                    Status
                                </th>

                                <th className="w-[170px]">
                                    Updated
                                </th>

                                <th className="w-[150px] text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {ppmps.data.length ===
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
                                                ClipboardList
                                            }
                                            title="No PPMP records found"
                                            description="Try changing your filters or create a new PPMP for your division."
                                            action={
                                                can.create ? (
                                                    <Button
                                                        asChild
                                                    >
                                                        <Link href="/ppmps/create">
                                                            <Plus className="size-4" />

                                                            Create
                                                            PPMP
                                                        </Link>
                                                    </Button>
                                                ) : undefined
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                ppmps.data.map(
                                    (
                                        ppmp,
                                    ) => (
                                        <tr
                                            key={
                                                ppmp.id
                                            }
                                        >
                                            {/* PPMP NUMBER */}
                                            <td>
                                                <Link
                                                    href={`/ppmps/${ppmp.id}`}
                                                    className="font-semibold text-foreground hover:text-primary hover:underline"
                                                >
                                                    {
                                                        ppmp.ppmp_no
                                                    }
                                                </Link>

                                                <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    {
                                                        ppmp.plan_type
                                                    }
                                                </div>
                                            </td>

                                            {/* FISCAL YEAR */}
                                            <td className="tabular-nums">
                                                {
                                                    ppmp.fiscal_year
                                                }
                                            </td>

                                            {/* OFFICE */}
                                            <td>
                                                <div className="font-semibold">
                                                    {
                                                        ppmp
                                                            .office
                                                            .code
                                                    }
                                                </div>

                                                <div className="mt-1 max-w-[260px] text-xs leading-5 text-muted-foreground">
                                                    {
                                                        ppmp
                                                            .office
                                                            .name
                                                    }
                                                </div>
                                            </td>

                                            {/* COORDINATOR */}
                                            <td>
                                                <div className="font-medium">
                                                    {
                                                        ppmp
                                                            .coordinator
                                                            .name
                                                    }
                                                </div>
                                            </td>

                                            {/* ITEMS */}
                                            <td className="text-center">
                                                <span className="font-semibold tabular-nums">
                                                    {
                                                        ppmp.items_count
                                                    }
                                                </span>
                                            </td>

                                            {/* TOTAL */}
                                            <td className="whitespace-nowrap text-right">
                                                <span className="font-semibold tabular-nums">
                                                    {formatCurrency(
                                                        ppmp.total_budget,
                                                    )}
                                                </span>
                                            </td>

                                            {/* STATUS */}
                                            <td>
                                                <StatusBadge
                                                    status={
                                                        ppmp.status
                                                    }
                                                />
                                            </td>

                                            {/* UPDATED */}
                                            <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                {ppmp.updated_at ??
                                                    '—'}
                                            </td>

                                            {/* ACTIONS */}
                                            <td>
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/ppmps/${ppmp.id}`}
                                                        >
                                                            View
                                                        </Link>
                                                    </Button>

                                                    {[
                                                        'draft',
                                                        'returned_for_revision',
                                                    ].includes(
                                                        ppmp.status,
                                                    ) && (
                                                        <Button
                                                            size="sm"
                                                            asChild
                                                        >
                                                            <Link
                                                                href={`/ppmps/${ppmp.id}/edit`}
                                                            >
                                                                Edit
                                                            </Link>
                                                        </Button>
                                                    )}
                                                </div>
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
