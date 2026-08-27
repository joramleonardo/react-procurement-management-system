import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { PageHeader } from '@/components/pms/page-header';
import { SectionCard } from '@/components/pms/section-card';
import { StatusBadge } from '@/components/pms/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import {
    Head,
    Link,
    useForm,
} from '@inertiajs/react';
import {
    ShieldCheck,
    UserRoundCog,
} from 'lucide-react';
import { FormEventHandler } from 'react';

interface Office {
    id: number;
    code: string;
    name: string;
}

interface Role {
    id: number;
    name: string;
}

interface EditableUser {
    id: number;
    employee_id: string | null;
    username: string | null;
    first_name: string | null;
    middle_name: string | null;
    last_name: string | null;
    suffix: string | null;
    email: string;
    office_id: number | null;
    position_title: string | null;
    status: string;
    role: string;
}

interface EditUserProps {
    user: EditableUser;
    offices: Office[];
    roles: Role[];
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

function getDisplayName(
    user: EditableUser,
): string {
    const parts = [
        user.first_name,
        user.middle_name,
        user.last_name,
        user.suffix,
    ].filter(Boolean);

    return parts.length > 0
        ? parts.join(' ')
        : user.email;
}

export default function EditUser({
    user,
    offices,
    roles,
}: EditUserProps) {
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
            title: getDisplayName(
                user,
            ),
            href: `/admin/users/${user.id}`,
        },
        {
            title: 'Edit User',
            href: `/admin/users/${user.id}/edit`,
        },
    ];

    const {
        data,
        setData,
        put,
        processing,
        errors,
    } = useForm({
        employee_id:
            user.employee_id ?? '',

        username:
            user.username ?? '',

        first_name:
            user.first_name ?? '',

        middle_name:
            user.middle_name ?? '',

        last_name:
            user.last_name ?? '',

        suffix:
            user.suffix ?? '',

        email: user.email,

        office_id: user.office_id
            ? String(user.office_id)
            : '',

        position_title:
            user.position_title ??
            '',

        role: user.role,

        status: user.status,
    });

    const submit:
        FormEventHandler<HTMLFormElement> =
        (event) => {
            event.preventDefault();

            put(
                `/admin/users/${user.id}`,
                {
                    preserveScroll:
                        true,
                },
            );
        };

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head
                title={`Edit ${getDisplayName(
                    user,
                )}`}
            />

            <form
                onSubmit={submit}
                className="pms-page"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Administration"
                    title="Edit User"
                    description={`Update employee information, account identifiers, and access for ${getDisplayName(
                        user,
                    )}.`}
                    icon={UserRoundCog}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                        >
                            <Link
                                href={`/admin/users/${user.id}`}
                            >
                                Back to User
                            </Link>
                        </Button>
                    }
                />

                {/* USER SUMMARY */}
                <section className="border-b border-border bg-secondary/30 px-5 py-3 md:px-6">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Employee
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {getDisplayName(
                                    user,
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Employee ID
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {user.employee_id ??
                                    '—'}
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Current Role
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                {user.role
                                    ? formatRole(
                                          user.role,
                                      )
                                    : 'No role assigned'}
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Account Status
                            </div>

                            <div className="mt-1">
                                <StatusBadge
                                    status={
                                        user.status
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* EMPLOYEE INFORMATION */}
                <SectionCard
                    title="Employee Information"
                    description="Update the employee’s official identification, name, position, and organizational assignment."
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* EMPLOYEE ID */}
                        <div className="pms-field">
                            <Label htmlFor="employee_id">
                                Employee ID
                            </Label>

                            <Input
                                id="employee_id"
                                value={
                                    data.employee_id
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'employee_id',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <InputError
                                message={
                                    errors.employee_id
                                }
                            />
                        </div>

                        {/* POSITION */}
                        <div className="pms-field">
                            <Label htmlFor="position_title">
                                Position Title
                            </Label>

                            <Input
                                id="position_title"
                                value={
                                    data.position_title
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'position_title',
                                        event.target
                                            .value,
                                    )
                                }
                            />

                            <InputError
                                message={
                                    errors.position_title
                                }
                            />
                        </div>

                        {/* FIRST NAME */}
                        <div className="pms-field">
                            <Label htmlFor="first_name">
                                First Name
                            </Label>

                            <Input
                                id="first_name"
                                value={
                                    data.first_name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'first_name',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <InputError
                                message={
                                    errors.first_name
                                }
                            />
                        </div>

                        {/* MIDDLE NAME */}
                        <div className="pms-field">
                            <Label htmlFor="middle_name">
                                Middle Name
                            </Label>

                            <Input
                                id="middle_name"
                                value={
                                    data.middle_name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'middle_name',
                                        event.target
                                            .value,
                                    )
                                }
                            />

                            <InputError
                                message={
                                    errors.middle_name
                                }
                            />
                        </div>

                        {/* LAST NAME */}
                        <div className="pms-field">
                            <Label htmlFor="last_name">
                                Last Name
                            </Label>

                            <Input
                                id="last_name"
                                value={
                                    data.last_name
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'last_name',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <InputError
                                message={
                                    errors.last_name
                                }
                            />
                        </div>

                        {/* SUFFIX */}
                        <div className="pms-field">
                            <Label htmlFor="suffix">
                                Suffix
                            </Label>

                            <Input
                                id="suffix"
                                value={
                                    data.suffix
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'suffix',
                                        event.target
                                            .value,
                                    )
                                }
                                placeholder="Jr., Sr., III"
                            />

                            <InputError
                                message={
                                    errors.suffix
                                }
                            />
                        </div>

                        {/* OFFICE */}
                        <div className="pms-field md:col-span-2">
                            <Label htmlFor="office_id">
                                Office or Division
                            </Label>

                            <select
                                id="office_id"
                                value={
                                    data.office_id
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'office_id',
                                        event.target
                                            .value,
                                    )
                                }
                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                            >
                                <option value="">
                                    Not assigned
                                </option>

                                {offices.map(
                                    (
                                        office,
                                    ) => (
                                        <option
                                            key={
                                                office.id
                                            }
                                            value={String(
                                                office.id,
                                            )}
                                        >
                                            {
                                                office.code
                                            }{' '}
                                            —{' '}
                                            {
                                                office.name
                                            }
                                        </option>
                                    ),
                                )}
                            </select>

                            <p className="pms-help-text">
                                Office
                                assignment may
                                affect the records
                                and procurement
                                functions available
                                to the user.
                            </p>

                            <InputError
                                message={
                                    errors.office_id
                                }
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* ACCOUNT INFORMATION */}
                <SectionCard
                    title="Account Information"
                    description="Update the employee’s username and official email address."
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* USERNAME */}
                        <div className="pms-field">
                            <Label htmlFor="username">
                                Username
                            </Label>

                            <Input
                                id="username"
                                value={
                                    data.username
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'username',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <p className="pms-help-text">
                                The user may use
                                this username to
                                sign in to the
                                system.
                            </p>

                            <InputError
                                message={
                                    errors.username
                                }
                            />
                        </div>

                        {/* EMAIL */}
                        <div className="pms-field">
                            <Label htmlFor="email">
                                Official Email Address
                            </Label>

                            <Input
                                id="email"
                                type="email"
                                value={
                                    data.email
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'email',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <p className="pms-help-text">
                                Use the employee's
                                official
                                organizational
                                email address.
                            </p>

                            <InputError
                                message={
                                    errors.email
                                }
                            />
                        </div>
                    </div>
                </SectionCard>

                {/* ROLE AND ACCESS */}
                <SectionCard
                    title="Role and Access"
                    description="Manage the employee’s system role and current account availability."
                    actions={
                        <ShieldCheck className="size-5 text-primary" />
                    }
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* ROLE */}
                        <div className="pms-field">
                            <Label htmlFor="role">
                                System Role
                            </Label>

                            <select
                                id="role"
                                value={
                                    data.role
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'role',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                            >
                                <option value="">
                                    Select a role
                                </option>

                                {roles.map(
                                    (
                                        role,
                                    ) => (
                                        <option
                                            key={
                                                role.id
                                            }
                                            value={
                                                role.name
                                            }
                                        >
                                            {formatRole(
                                                role.name,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>

                            <p className="pms-help-text">
                                Changing the role
                                changes the user's
                                available system
                                permissions after
                                the update is saved.
                            </p>

                            <InputError
                                message={
                                    errors.role
                                }
                            />
                        </div>

                        {/* STATUS */}
                        <div className="pms-field">
                            <Label htmlFor="status">
                                Account Status
                            </Label>

                            <select
                                id="status"
                                value={
                                    data.status
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'status',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                                className="h-9 w-full border border-input bg-background px-3 text-sm"
                            >
                                <option value="active">
                                    Active
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="inactive">
                                    Inactive
                                </option>

                                <option value="locked">
                                    Locked
                                </option>
                            </select>

                            <p className="pms-help-text">
                                Inactive,
                                pending, or locked
                                accounts may be
                                prevented from
                                signing in,
                                depending on
                                backend account
                                rules.
                            </p>

                            <InputError
                                message={
                                    errors.status
                                }
                            />
                        </div>
                    </div>

                    {/* ACCESS CONTROL NOTICE */}
                    <div className="mt-5 border-l-2 border-primary bg-secondary/20 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                            Administrative Access
                        </div>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Role and account
                            status changes can
                            affect access to
                            PPMP, Purchase
                            Requests,
                            administration, and
                            workflow actions.
                            Backend permission
                            checks remain
                            authoritative.
                        </p>
                    </div>
                </SectionCard>

                {/* ACCOUNT STATUS SUMMARY */}
                <section className="border-b border-border bg-card">
                    <div className="border-b border-border bg-secondary/30 px-5 py-3 md:px-6">
                        <h2 className="text-sm font-semibold uppercase tracking-[0.06em]">
                            Pending Changes
                        </h2>

                        <p className="mt-1 text-xs text-muted-foreground">
                            Review the selected
                            role and account
                            status before saving.
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2">
                        <div className="border-b border-border px-5 py-4 sm:border-b-0 sm:border-r md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Selected Role
                            </div>

                            <div className="mt-2 text-sm font-semibold">
                                {data.role
                                    ? formatRole(
                                          data.role,
                                      )
                                    : 'No role selected'}
                            </div>
                        </div>

                        <div className="px-5 py-4 md:px-6">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Selected Status
                            </div>

                            <div className="mt-2">
                                <StatusBadge
                                    status={
                                        data.status
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div>
                            <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                Editing User Account
                            </div>

                            <div className="mt-1 text-sm text-foreground">
                                {getDisplayName(
                                    user,
                                )}
                            </div>
                        </div>
                    }
                >
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                    >
                        <Link
                            href={`/admin/users/${user.id}`}
                        >
                            Cancel
                        </Link>
                    </Button>

                    <Button
                        type="submit"
                        disabled={
                            processing
                        }
                    >
                        {processing
                            ? 'Saving Changes...'
                            : 'Save Changes'}
                    </Button>
                </ActionBar>
            </form>
        </AppLayout>
    );
}
