import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

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

function formatRole(role: string): string {
    return role
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function statusClasses(status: string): string {
    switch (status) {
        case 'active':
            return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';

        case 'inactive':
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';

        case 'locked':
            return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';

        case 'pending':
            return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';

        default:
            return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
}

export default function UsersIndex({
    users,
    filters,
}: UsersIndexProps) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [status, setStatus] = useState(filters.status ?? '');

    function submitFilters(event: FormEvent<HTMLFormElement>) {
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
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            User Management
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Manage PMS user accounts, roles, offices, and
                            account access.
                        </p>
                    </div>

                    <Link
                        href="/admin/users/create"
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Add User
                    </Link>
                </div>

                <form
                    onSubmit={submitFilters}
                    className="grid gap-3 rounded-xl border bg-background p-4 md:grid-cols-[1fr_220px_auto_auto]"
                >
                    <input
                        type="search"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search employee ID, name, username, or email"
                        className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value)
                        }
                        className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                        <option value="">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="locked">Locked</option>
                    </select>

                    <button
                        type="submit"
                        className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                        Search
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
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium">
                                        Employee
                                    </th>

                                    <th className="px-4 py-3 text-left font-medium">
                                        Office
                                    </th>

                                    <th className="px-4 py-3 text-left font-medium">
                                        Role
                                    </th>

                                    <th className="px-4 py-3 text-left font-medium">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left font-medium">
                                        Last Login
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-12 text-center text-muted-foreground"
                                        >
                                            No users found.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-muted/30"
                                        >
                                            <td className="px-4 py-4">
                                                <div className="font-medium">
                                                    {user.name}
                                                </div>

                                                <div className="text-xs text-muted-foreground">
                                                    {user.employee_id ??
                                                        'No employee ID'}
                                                    {' · '}
                                                    {user.username ??
                                                        'No username'}
                                                </div>

                                                <div className="text-xs text-muted-foreground">
                                                    {user.email}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                {user.office ? (
                                                    <>
                                                        <div className="font-medium">
                                                            {user.office.code}
                                                        </div>

                                                        <div className="text-xs text-muted-foreground">
                                                            {user.office.name}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span className="text-muted-foreground">
                                                        Not assigned
                                                    </span>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.length > 0 ? (
                                                        user.roles.map(
                                                            (role) => (
                                                                <span
                                                                    key={role}
                                                                    className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                                                >
                                                                    {formatRole(
                                                                        role,
                                                                    )}
                                                                </span>
                                                            ),
                                                        )
                                                    ) : (
                                                        <span className="text-muted-foreground">
                                                            No role
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium capitalize ${statusClasses(
                                                        user.status,
                                                    )}`}
                                                >
                                                    {user.status}
                                                </span>
                                            </td>

                                            <td className="px-4 py-4 text-muted-foreground">
                                                {user.last_login_at ??
                                                    'Never'}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/admin/users/${user.id}`}
                                                        className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
                                                    >
                                                        View
                                                    </Link>

                                                    <Link
                                                        href={`/admin/users/${user.id}/edit`}
                                                        className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                                                    >
                                                        Edit
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-sm text-muted-foreground">
                            Showing {users.from ?? 0} to {users.to ?? 0}{' '}
                            of {users.total} users
                        </p>

                        <div className="flex flex-wrap gap-1">
                            {users.links.map((link, index) =>
                                link.url ? (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url}
                                        preserveScroll
                                        preserveState
                                        className={`rounded-md border px-3 py-1.5 text-sm ${
                                            link.active
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                        }`}
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
                                        }}
                                    />
                                ) : (
                                    <span
                                        key={`${link.label}-${index}`}
                                        className="cursor-not-allowed rounded-md border px-3 py-1.5 text-sm opacity-50"
                                        dangerouslySetInnerHTML={{
                                            __html: link.label,
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
