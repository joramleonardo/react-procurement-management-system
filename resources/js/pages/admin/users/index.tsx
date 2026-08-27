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
    Plus,
    Search,
    UsersRound,
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

interface UserRecord {
    id: number;
    employee_id: string | null;
    username: string | null;
    name: string;
    email: string;
    position_title: string | null;
    status: string;
    office: Office | null;
    roles: string[];
    last_login_at: string | null;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginatedUsers {
    data: UserRecord[];
    links: PaginationLink[];
    current_page: number;
    last_page: number;
    from: number | null;
    to: number | null;
    total: number;
}

interface UsersIndexProps {
    users: PaginatedUsers;

    filters: {
        search: string;
        status: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'User Management',
        href: '/admin/users',
    },
];

function formatRole(
    role: string,
): string {
    const labels:
        Record<string, string> = {
        'system-administrator':
            'System Administrator',

        'ppmp-coordinator':
            'PPMP Coordinator',

        'gsps-administrator':
            'GSPS Administrator',

        'requesting-personnel':
            'Requesting Personnel',

        'budget-officer':
            'Budget Officer',

        'approving-authority':
            'Approving Authority',

        'procurement-personnel-bac':
            'Procurement Personnel / BAC',

        'management-user':
            'Management User',

        auditor:
            'Auditor',
    };

    return (
        labels[role] ??
        role
            .split('-')
            .map(
                (word) =>
                    word
                        .charAt(0)
                        .toUpperCase() +
                    word.slice(1),
            )
            .join(' ')
    );
}

export default function UsersIndex({
    users,
    filters,
}: UsersIndexProps) {
    const [search, setSearch] =
        useState(
            filters.search ?? '',
        );

    const [status, setStatus] =
        useState(
            filters.status ?? '',
        );

    function submitFilters(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        router.get(
            '/admin/users',
            {
                search,
                status,
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

        router.get(
            '/admin/users',
            {},
            {
                preserveState: true,
                replace: true,
            },
        );
    }

    return (
        <AppLayout
            breadcrumbs={breadcrumbs}
        >
            <Head
                title="User Management"
            />

            <div className="pms-page">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Administration"
                    title="User Management"
                    description="Manage employee accounts, roles, office assignments, and access to the Procurement Management System."
                    icon={UsersRound}
                    actions={
                        <Button asChild>
                            <Link href="/admin/users/create">
                                <Plus className="size-4" />

                                Add User
                            </Link>
                        </Button>
                    }
                />

                {/* FILTER BAR */}
                <form
                    onSubmit={
                        submitFilters
                    }
                    className="pms-filter-bar grid gap-3 md:grid-cols-[minmax(300px,1fr)_220px_auto_auto]"
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
                                placeholder="Employee ID, name, username, or email"
                                className="h-10 w-full border border-input bg-background pl-9 pr-3 text-sm"
                            />
                        </div>
                    </div>

                    {/* STATUS */}
                    <div className="grid gap-1.5">
                        <label
                            htmlFor="status"
                            className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                            Account Status
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
                                All statuses
                            </option>

                            <option value="pending">
                                Pending
                            </option>

                            <option value="active">
                                Active
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>

                            <option value="locked">
                                Locked
                            </option>
                        </select>
                    </div>

                    {/* APPLY */}
                    <div className="flex items-end">
                        <Button
                            type="submit"
                            className="w-full md:w-auto"
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
                            className="w-full md:w-auto"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </form>

                {/* USER TABLE */}
                <DataTableShell
                    footer={
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing{' '}
                                <span className="font-medium text-foreground">
                                    {users.from ??
                                        0}
                                </span>{' '}
                                to{' '}
                                <span className="font-medium text-foreground">
                                    {users.to ??
                                        0}
                                </span>{' '}
                                of{' '}
                                <span className="font-medium text-foreground">
                                    {
                                        users.total
                                    }
                                </span>{' '}
                                users
                            </div>

                            {/* PAGINATION */}
                            <div className="flex flex-wrap gap-1">
                                {users.links.map(
                                    (
                                        link,
                                        index,
                                    ) =>
                                        link.url ? (
                                            <Link
                                                key={`${link.label}-${index}`}
                                                href={
                                                    link.url
                                                }
                                                preserveScroll
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
                                                key={`${link.label}-${index}`}
                                                className="inline-flex min-h-8 cursor-not-allowed items-center border border-border bg-secondary/30 px-3 text-xs text-muted-foreground opacity-50"
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
                    <table className="pms-table min-w-[1250px]">
                        <thead>
                            <tr>
                                <th className="w-[150px]">
                                    Employee ID
                                </th>

                                <th className="w-[280px]">
                                    Employee
                                </th>

                                <th className="w-[260px]">
                                    Office
                                </th>

                                <th className="w-[240px]">
                                    Role / Access
                                </th>

                                <th className="w-[140px]">
                                    Status
                                </th>

                                <th className="w-[190px]">
                                    Last Login
                                </th>

                                <th className="w-[150px] text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {users.data.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan={
                                            7
                                        }
                                        className="p-0!"
                                    >
                                        <EmptyState
                                            icon={
                                                UsersRound
                                            }
                                            title="No users found"
                                            description="No user accounts match the current search or status filter."
                                            action={
                                                <Button
                                                    asChild
                                                >
                                                    <Link href="/admin/users/create">
                                                        <Plus className="size-4" />

                                                        Add User
                                                    </Link>
                                                </Button>
                                            }
                                        />
                                    </td>
                                </tr>
                            ) : (
                                users.data.map(
                                    (
                                        user,
                                    ) => (
                                        <tr
                                            key={
                                                user.id
                                            }
                                        >
                                            {/* EMPLOYEE ID */}
                                            <td>
                                                {user.employee_id ? (
                                                    <span className="font-semibold tabular-nums">
                                                        {
                                                            user.employee_id
                                                        }
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            {/* EMPLOYEE */}
                                            <td>
                                                <Link
                                                    href={`/admin/users/${user.id}`}
                                                    className="font-semibold text-foreground hover:text-primary hover:underline"
                                                >
                                                    {
                                                        user.name
                                                    }
                                                </Link>

                                                {user.position_title && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {
                                                            user.position_title
                                                        }
                                                    </div>
                                                )}

                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {user.username
                                                        ? `@${user.username}`
                                                        : 'No username'}
                                                </div>

                                                <div className="mt-0.5 text-xs text-muted-foreground">
                                                    {
                                                        user.email
                                                    }
                                                </div>
                                            </td>

                                            {/* OFFICE */}
                                            <td>
                                                {user.office ? (
                                                    <>
                                                        <div className="font-semibold">
                                                            {
                                                                user
                                                                    .office
                                                                    .code
                                                            }
                                                        </div>

                                                        <div className="mt-1 max-w-[250px] text-xs leading-5 text-muted-foreground">
                                                            {
                                                                user
                                                                    .office
                                                                    .name
                                                            }
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        Not
                                                        assigned
                                                    </span>
                                                )}
                                            </td>

                                            {/* ROLES */}
                                            <td>
                                                {user.roles
                                                    .length >
                                                0 ? (
                                                    <div className="divide-y divide-border border-l-2 border-primary/30 pl-3">
                                                        {user.roles.map(
                                                            (
                                                                role,
                                                            ) => (
                                                                <div
                                                                    key={
                                                                        role
                                                                    }
                                                                    className="py-1.5 text-sm first:pt-0 last:pb-0"
                                                                >
                                                                    {formatRole(
                                                                        role,
                                                                    )}
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">
                                                        No role
                                                        assigned
                                                    </span>
                                                )}
                                            </td>

                                            {/* STATUS */}
                                            <td>
                                                <StatusBadge
                                                    status={
                                                        user.status
                                                    }
                                                />
                                            </td>

                                            {/* LAST LOGIN */}
                                            <td className="whitespace-nowrap text-xs text-muted-foreground">
                                                {user.last_login_at ??
                                                    'Never'}
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
                                                            href={`/admin/users/${user.id}`}
                                                        >
                                                            View
                                                        </Link>
                                                    </Button>

                                                    <Button
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={`/admin/users/${user.id}/edit`}
                                                        >
                                                            Edit
                                                        </Link>
                                                    </Button>
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
