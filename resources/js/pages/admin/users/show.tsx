import { PageHeader } from '@/components/pms/page-header';
import { SectionCard } from '@/components/pms/section-card';
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
    Activity,
    KeyRound,
    LockKeyhole,
    Pencil,
    ShieldCheck,
    UserCheck,
    UserRound,
    UserX,
} from 'lucide-react';

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

interface ShowUserProps {
    user: UserRecord;
    can: UserPermissions;
    flash: FlashMessages;
}

function formatRole(
    role: string,
): string {
    const labels: Record<
        string,
        string
    > = {
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

        auditor: 'Auditor',
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

function formatValue(
    value: string | null,
): string {
    return value || 'Not provided';
}

function formatAuthSource(
    value: string,
): string {
    const labels: Record<
        string,
        string
    > = {
        local: 'Local Account',
        hrmis: 'HRMIS',
    };

    return (
        labels[value] ??
        value
            .replace(/_/g, ' ')
            .replace(
                /\b\w/g,
                (letter) =>
                    letter.toUpperCase(),
            )
    );
}

export default function ShowUser({
    user,
    can,
    flash,
}: ShowUserProps) {
    const breadcrumbs:
        BreadcrumbItem[] = [
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

    const displayedStatus =
        user.is_locked
            ? 'locked'
            : user.status;

    const hasAccountControls =
        (can.reset_password &&
            !can.is_self) ||
        (can.activate &&
            !user.is_locked &&
            [
                'pending',
                'inactive',
            ].includes(
                user.status,
            )) ||
        (can.unlock &&
            user.is_locked) ||
        (can.deactivate &&
            !can.is_self &&
            user.status ===
                'active' &&
            !user.is_locked);

    function runAccountAction(
        url: string,
        confirmationMessage: string,
    ) {
        if (
            !window.confirm(
                confirmationMessage,
            )
        ) {
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
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head title={user.name} />

            <div className="pms-page">
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Administration"
                    title={user.name}
                    description={
                        user.position_title ??
                        'Procurement Management System user account'
                    }
                    icon={UserRound}
                    actions={
                        <>
                            <Button
                                variant="outline"
                                asChild
                            >
                                <Link href="/admin/users">
                                    Back to
                                    Users
                                </Link>
                            </Button>

                            {can.update && (
                                <Button
                                    asChild
                                >
                                    <Link
                                        href={`/admin/users/${user.id}/edit`}
                                    >
                                        <Pencil className="size-4" />

                                        Edit User
                                    </Link>
                                </Button>
                            )}
                        </>
                    }
                />

                {/* SUCCESS MESSAGE */}
                {flash.success && (
                    <div className="border-b border-green-200 bg-green-50 px-5 py-3 text-sm text-green-800 md:px-6 dark:border-green-900 dark:bg-green-950/40 dark:text-green-200">
                        {flash.success}
                    </div>
                )}

                {/* ERROR MESSAGE */}
                {flash.error && (
                    <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800 md:px-6 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                        {flash.error}
                    </div>
                )}

                {/* ACCOUNT SUMMARY */}
                <section className="border-b border-border bg-secondary/30">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-5">
                        {/* EMPLOYEE ID */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Employee ID
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {user.employee_id ??
                                    '—'}
                            </div>
                        </div>

                        {/* OFFICE */}
                        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Office
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {user.office
                                    ?.code ??
                                    'Not assigned'}
                            </div>
                        </div>

                        {/* ROLE */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                System Role
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {user.roles
                                    .length >
                                0
                                    ? user.roles
                                          .map(
                                              formatRole,
                                          )
                                          .join(
                                              ', ',
                                          )
                                    : 'No role assigned'}
                            </div>
                        </div>

                        {/* AUTH SOURCE */}
                        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Authentication
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {formatAuthSource(
                                    user.auth_source,
                                )}
                            </div>
                        </div>

                        {/* STATUS */}
                        <div className="px-5 py-4 md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Account
                                Status
                            </div>

                            <div className="mt-1">
                                <StatusBadge
                                    status={
                                        displayedStatus
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* LOCKED ACCOUNT NOTICE */}
                {user.is_locked && (
                    <section className="border-b border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
                        <div className="flex gap-3 px-5 py-4 md:px-6">
                            <LockKeyhole className="mt-0.5 size-5 shrink-0 text-red-600" />

                            <div>
                                <div className="text-xs font-bold uppercase tracking-[0.1em] text-red-800 dark:text-red-200">
                                    Account
                                    Locked
                                </div>

                                <p className="mt-1 text-sm leading-6 text-red-900 dark:text-red-200">
                                    This
                                    account is
                                    currently
                                    locked and
                                    cannot be
                                    used to
                                    access the
                                    system until
                                    it is
                                    unlocked by
                                    an
                                    authorized
                                    administrator.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {/* INACTIVE NOTICE */}
                {!user.is_locked &&
                    user.status ===
                        'inactive' && (
                        <section className="border-b border-border bg-secondary/40">
                            <div className="flex gap-3 px-5 py-4 md:px-6">
                                <UserX className="mt-0.5 size-5 shrink-0 text-muted-foreground" />

                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.1em]">
                                        Account
                                        Inactive
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                        This
                                        account
                                        has been
                                        deactivated
                                        and
                                        currently
                                        cannot
                                        access
                                        the
                                        system.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                {/* PENDING NOTICE */}
                {!user.is_locked &&
                    user.status ===
                        'pending' && (
                        <section className="border-b border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                            <div className="flex gap-3 px-5 py-4 md:px-6">
                                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-600" />

                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.1em] text-amber-800 dark:text-amber-200">
                                        Account
                                        Pending
                                    </div>

                                    <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-200">
                                        This
                                        account
                                        has not
                                        yet been
                                        activated
                                        for
                                        normal
                                        system
                                        access.
                                    </p>
                                </div>
                            </div>
                        </section>
                    )}

                {/* EMPLOYEE INFORMATION */}
                <SectionCard
                    title="Employee Information"
                    description="Official personnel and organizational information associated with this account."
                    contentClassName="p-0"
                >
                    <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
                        <div className="border-b border-border px-5 py-4 sm:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Employee ID
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.employee_id,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 lg:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Position
                                Title
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.position_title,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 sm:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                First Name
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.first_name,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 md:px-6">
                            <dt className="pms-readonly-label">
                                Middle Name
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.middle_name,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Last Name
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.last_name,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Suffix
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.suffix,
                                )}
                            </dd>
                        </div>

                        <div className="border-b border-border px-5 py-4 sm:border-r sm:col-span-2 lg:col-span-2 lg:border-b-0 lg:border-r-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Office or
                                Division
                            </dt>

                            <dd className="mt-1">
                                {user.office ? (
                                    <>
                                        <div className="font-semibold">
                                            {
                                                user
                                                    .office
                                                    .code
                                            }
                                        </div>

                                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {
                                                user
                                                    .office
                                                    .name
                                            }
                                        </div>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">
                                        Not
                                        assigned
                                    </span>
                                )}
                            </dd>
                        </div>
                    </dl>
                </SectionCard>

                {/* ACCOUNT INFORMATION */}
                <SectionCard
                    title="Account Information"
                    description="Authentication identifiers, assigned roles, and password information."
                    contentClassName="p-0"
                >
                    <dl className="grid sm:grid-cols-2 lg:grid-cols-3">
                        {/* USERNAME */}
                        <div className="border-b border-border px-5 py-4 sm:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Username
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.username,
                                )}
                            </dd>
                        </div>

                        {/* EMAIL */}
                        <div className="border-b border-border px-5 py-4 lg:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Official
                                Email
                            </dt>

                            <dd className="mt-1 break-all font-semibold">
                                {
                                    user.email
                                }
                            </dd>
                        </div>

                        {/* AUTH SOURCE */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-r-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Authentication
                                Source
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatAuthSource(
                                    user.auth_source,
                                )}
                            </dd>
                        </div>

                        {/* ROLES */}
                        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                System
                                Role /
                                Access
                            </dt>

                            <dd className="mt-2">
                                {user.roles
                                    .length >
                                0 ? (
                                    <div className="border-l-2 border-primary pl-3">
                                        {user.roles.map(
                                            (
                                                role,
                                            ) => (
                                                <div
                                                    key={
                                                        role
                                                    }
                                                    className="py-1 text-sm font-semibold first:pt-0 last:pb-0"
                                                >
                                                    {formatRole(
                                                        role,
                                                    )}
                                                </div>
                                            ),
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">
                                        No role
                                        assigned
                                    </span>
                                )}
                            </dd>
                        </div>

                        {/* PASSWORD STATUS */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Password
                                Status
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {user.must_change_password
                                    ? 'Temporary password'
                                    : 'Password changed'}
                            </dd>

                            {user.must_change_password && (
                                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                                    User must
                                    change the
                                    password
                                    after
                                    signing in.
                                </div>
                            )}
                        </div>

                        {/* PASSWORD CHANGED */}
                        <div className="px-5 py-4 md:px-6">
                            <dt className="pms-readonly-label">
                                Password
                                Last
                                Changed
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.password_changed_at,
                                )}
                            </dd>
                        </div>
                    </dl>
                </SectionCard>

                {/* ACCOUNT CONTROLS */}
                <section className="border-b border-border bg-card">
                    <div className="border-b border-border bg-secondary/30 px-5 py-3 md:px-6">
                        <div className="flex items-start gap-3">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />

                            <div>
                                <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">
                                    Account
                                    Controls
                                </h2>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Administrative
                                    actions for
                                    authentication
                                    and account
                                    availability.
                                </p>
                            </div>
                        </div>
                    </div>

                    {hasAccountControls ? (
                        <div className="divide-y divide-border">
                            {/* RESET PASSWORD */}
                            {can.reset_password &&
                                !can.is_self && (
                                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
                                        <div className="flex gap-3">
                                            <KeyRound className="mt-0.5 size-4 shrink-0 text-primary" />

                                            <div>
                                                <div className="text-sm font-semibold">
                                                    Reset
                                                    Password
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Create
                                                    a new
                                                    temporary
                                                    password
                                                    for
                                                    this
                                                    account.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            asChild
                                        >
                                            <Link
                                                href={`/admin/users/${user.id}/reset-password`}
                                            >
                                                Reset
                                                Password
                                            </Link>
                                        </Button>
                                    </div>
                                )}

                            {/* ACTIVATE */}
                            {can.activate &&
                                !user.is_locked &&
                                [
                                    'pending',
                                    'inactive',
                                ].includes(
                                    user.status,
                                ) && (
                                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
                                        <div className="flex gap-3">
                                            <UserCheck className="mt-0.5 size-4 shrink-0 text-green-600" />

                                            <div>
                                                <div className="text-sm font-semibold">
                                                    Activate
                                                    Account
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Allow
                                                    this
                                                    user to
                                                    access
                                                    the
                                                    system
                                                    again.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() =>
                                                runAccountAction(
                                                    `/admin/users/${user.id}/activate`,
                                                    `Activate ${user.name}'s account?`,
                                                )
                                            }
                                        >
                                            Activate
                                            Account
                                        </Button>
                                    </div>
                                )}

                            {/* UNLOCK */}
                            {can.unlock &&
                                user.is_locked && (
                                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
                                        <div className="flex gap-3">
                                            <LockKeyhole className="mt-0.5 size-4 shrink-0 text-primary" />

                                            <div>
                                                <div className="text-sm font-semibold">
                                                    Unlock
                                                    Account
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Remove
                                                    the
                                                    current
                                                    account
                                                    lock so
                                                    the user
                                                    can
                                                    attempt
                                                    to sign
                                                    in
                                                    again.
                                                </p>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            onClick={() =>
                                                runAccountAction(
                                                    `/admin/users/${user.id}/unlock`,
                                                    `Unlock ${user.name}'s account?`,
                                                )
                                            }
                                        >
                                            Unlock
                                            Account
                                        </Button>
                                    </div>
                                )}

                            {/* DEACTIVATE */}
                            {can.deactivate &&
                                !can.is_self &&
                                user.status ===
                                    'active' &&
                                !user.is_locked && (
                                    <div className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-6">
                                        <div className="flex gap-3">
                                            <UserX className="mt-0.5 size-4 shrink-0 text-red-600" />

                                            <div>
                                                <div className="text-sm font-semibold">
                                                    Deactivate
                                                    Account
                                                </div>

                                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                                    Prevent
                                                    this
                                                    account
                                                    from
                                                    accessing
                                                    the
                                                    Procurement
                                                    Management
                                                    System.
                                                </p>
                                            </div>
                                        </div>

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
                                            Deactivate
                                            Account
                                        </Button>
                                    </div>
                                )}
                        </div>
                    ) : (
                        <div className="px-5 py-5 text-sm text-muted-foreground md:px-6">
                            No administrative
                            account actions are
                            currently available.
                        </div>
                    )}

                    {/* SELF ACCOUNT NOTICE */}
                    {can.is_self && (
                        <div className="border-t border-border bg-secondary/20 px-5 py-3 text-xs leading-5 text-muted-foreground md:px-6">
                            You are viewing
                            your own account.
                            Administrative
                            password reset and
                            account
                            deactivation are
                            unavailable for
                            your own account
                            from this page.
                        </div>
                    )}
                </section>

                {/* ACTIVITY INFORMATION */}
                <SectionCard
                    title="Activity Information"
                    description="Authentication activity and account record timestamps."
                    actions={
                        <Activity className="size-5 text-primary" />
                    }
                    contentClassName="p-0"
                >
                    <dl className="grid sm:grid-cols-2 lg:grid-cols-4">
                        {/* LAST LOGIN */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Last Login
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.last_login_at,
                                )}
                            </dd>
                        </div>

                        {/* IP */}
                        <div className="border-b border-border px-5 py-4 lg:border-b-0 lg:border-r md:px-6">
                            <dt className="pms-readonly-label">
                                Last Login
                                IP
                            </dt>

                            <dd className="mt-1 font-mono text-sm font-semibold">
                                {formatValue(
                                    user.last_login_ip,
                                )}
                            </dd>
                        </div>

                        {/* CREATED */}
                        <div className="border-b border-border px-5 py-4 sm:border-r lg:border-b-0 md:px-6">
                            <dt className="pms-readonly-label">
                                Account
                                Created
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.created_at,
                                )}
                            </dd>
                        </div>

                        {/* UPDATED */}
                        <div className="px-5 py-4 md:px-6">
                            <dt className="pms-readonly-label">
                                Last Updated
                            </dt>

                            <dd className="mt-1 font-semibold">
                                {formatValue(
                                    user.updated_at,
                                )}
                            </dd>
                        </div>
                    </dl>
                </SectionCard>
            </div>
        </AppLayout>
    );
}
