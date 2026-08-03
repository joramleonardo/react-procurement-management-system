import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router} from '@inertiajs/react';

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
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    suffix: string | null;
    email: string;
    position_title: string | null;
    status: string;
    auth_source: string;
    must_change_password: boolean;
    office: Office | null;
    roles: string[];
    last_login_at: string | null;
    last_login_ip: string | null;
    password_changed_at: string | null;
    created_at: string | null;
    updated_at: string | null;
    is_locked: boolean;
}

interface ShowUserProps {
    user: UserRecord;
    can: UserPermissions;
    flash: FlashMessages;
}

interface UserPermissions {
    update: boolean;
    reset_password: boolean;
    activate: boolean;
    deactivate: boolean;
    unlock: boolean;
    is_self: boolean;
}

interface FlashMessages {
    success: string | null;
    error: string | null;
}

function formatRole(role: string): string {
    return role
        .split('-')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ');
}

function formatValue(value: string | null): string {
    return value || 'Not provided';
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

export default function ShowUser({
    user, can, flash,
}: ShowUserProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'User Management',
            href: '/admin/users',
        },
        {
            title: user.name,
            href: `/admin/users/${user.id}`,
        },
    ];

    const displayedStatus = user.is_locked
    ? 'locked'
    : user.status;

    function runAccountAction(
        url: string,
        confirmationMessage: string,
    ) {
        if (!window.confirm(confirmationMessage)) {
            return;
        }

        router.patch(
            url,
            {},
            {
                preserveScroll: true,
            },
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={user.name} />

                {flash.success && (
                    <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
                        {flash.success}
                    </div>
                )}

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-semibold">
                                {user.name}
                            </h1>

                            <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusClasses(
                                    displayedStatus,
                                )}`}
                            >
                                {displayedStatus}
                            </span>
                        </div>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {user.position_title ??
                                'No position title'}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href="/admin/users">
                                Back to Users
                            </Link>
                        </Button>

                        <Button asChild>
                            <Link
                                href={`/admin/users/${user.id}/edit`}
                            >
                                Edit User
                            </Link>
                        </Button>
                    </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                    <section className="rounded-xl border bg-background p-5">
                        <h2 className="mb-5 text-lg font-semibold">
                            Employee Information
                        </h2>

                        <dl className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Employee ID
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.employee_id,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Position Title
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.position_title,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    First Name
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.first_name,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Middle Name
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.middle_name,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Last Name
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.last_name,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Suffix
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(user.suffix)}
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-sm text-muted-foreground">
                                    Office or Division
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {user.office
                                        ? `${user.office.code} — ${user.office.name}`
                                        : 'Not assigned'}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-xl border bg-background p-5">
                        <h2 className="mb-5 text-lg font-semibold">
                            Account Information
                        </h2>

                        <dl className="grid gap-5 sm:grid-cols-2">
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Username
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(user.username)}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Email Address
                                </dt>

                                <dd className="mt-1 break-all font-medium">
                                    {user.email}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Role
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {user.roles.length > 0
                                        ? user.roles
                                              .map(formatRole)
                                              .join(', ')
                                        : 'No role assigned'}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Authentication Source
                                </dt>

                                <dd className="mt-1 font-medium capitalize">
                                    {user.auth_source}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Password Status
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {user.must_change_password
                                        ? 'Temporary password'
                                        : 'Password changed'}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Password Changed
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.password_changed_at,
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="rounded-xl border bg-background p-5 lg:col-span-2">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">
                                Account Controls
                            </h2>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Manage the user’s password and account access.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {can.reset_password && !can.is_self && (
                                <Button asChild variant="outline">
                                    <Link
                                        href={`/admin/users/${user.id}/reset-password`}
                                    >
                                        Reset Password
                                    </Link>
                                </Button>
                            )}

                            {can.activate &&
                                !user.is_locked &&
                                ['pending', 'inactive'].includes(
                                    user.status,
                                ) && (
                                    <Button
                                        type="button"
                                        onClick={() =>
                                            runAccountAction(
                                                `/admin/users/${user.id}/activate`,
                                                `Activate ${user.name}'s account?`,
                                            )
                                        }
                                    >
                                        Activate Account
                                    </Button>
                                )}

                            {can.unlock && user.is_locked && (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        runAccountAction(
                                            `/admin/users/${user.id}/unlock`,
                                            `Unlock ${user.name}'s account?`,
                                        )
                                    }
                                >
                                    Unlock Account
                                </Button>
                            )}

                            {can.deactivate &&
                                !can.is_self &&
                                user.status === 'active' &&
                                !user.is_locked && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        onClick={() =>
                                            runAccountAction(
                                                `/admin/users/${user.id}/deactivate`,
                                                `Deactivate ${user.name}'s account? The user will lose access to the system.`,
                                            )
                                        }
                                    >
                                        Deactivate Account
                                    </Button>
                                )}
                        </div>

                        {can.is_self && (
                            <p className="mt-4 text-sm text-muted-foreground">
                                You cannot deactivate or administratively reset
                                your own account from this page.
                            </p>
                        )}
                    </section>

                    <section className="rounded-xl border bg-background p-5 lg:col-span-2">
                        <h2 className="mb-5 text-lg font-semibold">
                            Activity Information
                        </h2>

                        <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Last Login
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.last_login_at,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Last Login IP
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.last_login_ip,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Account Created
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.created_at,
                                    )}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-sm text-muted-foreground">
                                    Last Updated
                                </dt>

                                <dd className="mt-1 font-medium">
                                    {formatValue(
                                        user.updated_at,
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </div>
            </div>
        </AppLayout>
    );
}
