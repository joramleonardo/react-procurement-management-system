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

export default function PpmpIndex({
    ppmps,
    filters,
    fiscalYears,
    can,
    flash,
}: IndexProps) {
    const [search, setSearch] = useState(
        filters.search ?? '',
    );

    const [fiscalYear, setFiscalYear] =
        useState(
            filters.fiscal_year ?? '',
        );

    const [status, setStatus] =
        useState(
            filters.status ?? '',
        );

    const [planType, setPlanType] =
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
                fiscal_year: fiscalYear,
                status,
                plan_type: planType,
            },
            {
                preserveState: true,
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
            breadcrumbs={breadcrumbs}
        >
            <Head title="PPMP" />

            <div className="flex flex-1 flex-col gap-5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Project Procurement
                            Management Plans
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Create and monitor PPMPs
                            for each implementing
                            division.
                        </p>
                    </div>

                    {can.create && (
                        <Link
                            href="/ppmps/create"
                            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                        >
                            + Create PPMP
                        </Link>
                    )}
                </div>

                {flash.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                        {flash.success}
                    </div>
                )}

                <form
                    onSubmit={submitFilters}
                    className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-2 xl:grid-cols-[1fr_170px_200px_160px_auto_auto]"
                >
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Search PPMP no., office, or coordinator"
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    />

                    <select
                        value={fiscalYear}
                        onChange={(event) =>
                            setFiscalYear(
                                event.target.value,
                            )
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm"
                    >
                        <option value="">
                            All fiscal years
                        </option>

                        {fiscalYears.map(
                            (year) => (
                                <option
                                    key={year}
                                    value={year}
                                >
                                    {year}
                                </option>
                            ),
                        )}
                    </select>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(
                                event.target.value,
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
                            Submitted for Review
                        </option>

                        <option value="returned_for_revision">
                            Returned for Revision
                        </option>

                        <option value="approved">
                            Approved
                        </option>
                    </select>

                    <select
                        value={planType}
                        onChange={(event) =>
                            setPlanType(
                                event.target.value,
                            )
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm"
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

                    <button
                        type="submit"
                        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
                    >
                        Apply
                    </button>

                    <button
                        type="button"
                        onClick={resetFilters}
                        className="h-10 rounded-md border px-4 text-sm font-medium hover:bg-muted"
                    >
                        Reset
                    </button>
                </form>

                <div className="overflow-hidden rounded-xl border bg-background">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1050px] text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left">
                                        PPMP No.
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Fiscal Year
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        End-User Unit
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Coordinator
                                    </th>

                                    <th className="px-4 py-3 text-center">
                                        Items
                                    </th>

                                    <th className="px-4 py-3 text-right">
                                        Total Budget
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left">
                                        Updated
                                    </th>

                                    <th className="px-4 py-3 text-right">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {ppmps.data.length ===
                                0 ? (
                                    <tr>
                                        <td
                                            colSpan={9}
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No PPMP records
                                            found.
                                        </td>
                                    </tr>
                                ) : (
                                    ppmps.data.map(
                                        (ppmp) => (
                                            <tr
                                                key={
                                                    ppmp.id
                                                }
                                                className="hover:bg-muted/30"
                                            >
                                                <td className="px-4 py-4 font-medium">
                                                    {
                                                        ppmp.ppmp_no
                                                    }

                                                    <div className="mt-1 text-xs capitalize text-muted-foreground">
                                                        {
                                                            ppmp.plan_type
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    {
                                                        ppmp.fiscal_year
                                                    }
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="font-medium">
                                                        {
                                                            ppmp
                                                                .office
                                                                .code
                                                        }
                                                    </div>

                                                    <div className="max-w-[250px] text-xs text-muted-foreground">
                                                        {
                                                            ppmp
                                                                .office
                                                                .name
                                                        }
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4">
                                                    {
                                                        ppmp
                                                            .coordinator
                                                            .name
                                                    }
                                                </td>

                                                <td className="px-4 py-4 text-center">
                                                    {
                                                        ppmp.items_count
                                                    }
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-right font-medium">
                                                    {formatCurrency(
                                                        ppmp.total_budget,
                                                    )}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                                                            ppmp.status,
                                                        )}`}
                                                    >
                                                        {formatStatus(
                                                            ppmp.status,
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-muted-foreground">
                                                    {ppmp.updated_at ??
                                                        '—'}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <Link
                                                            href={`/ppmps/${ppmp.id}`}
                                                            className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-muted"
                                                        >
                                                            View
                                                        </Link>

                                                        {[
                                                            'draft',
                                                            'returned_for_revision',
                                                        ].includes(ppmp.status) && (
                                                            <Link
                                                                href={`/ppmps/${ppmp.id}/edit`}
                                                                className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                                                            >
                                                                Edit
                                                            </Link>
                                                        )}
                                                    </div>
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
                            {ppmps.from ?? 0} to{' '}
                            {ppmps.to ?? 0} of{' '}
                            {ppmps.total} PPMPs
                        </p>

                        <div className="flex flex-wrap gap-1">
                            {ppmps.links.map(
                                (link, index) =>
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
