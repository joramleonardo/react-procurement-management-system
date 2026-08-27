import InputError from '@/components/input-error';
import { ActionBar } from '@/components/pms/action-bar';
import { PageHeader } from '@/components/pms/page-header';
import { SectionCard } from '@/components/pms/section-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
    KeyRound,
    ShieldCheck,
    UserPlus,
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

interface CreateUserProps {
    offices: Office[];
    roles: Role[];
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
    {
        title: 'Create User',
        href: '/admin/users/create',
    },
];

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

export default function CreateUser({
    offices,
    roles,
}: CreateUserProps) {
    const {
        data,
        setData,
        post,
        processing,
        errors,
    } = useForm({
        employee_id: '',
        username: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        email: '',
        office_id: '',
        position_title: '',
        role: '',
        status: 'active',
        password: '',
        password_confirmation: '',
        must_change_password:
            true as boolean,
    });

    const submit:
        FormEventHandler<HTMLFormElement> =
        (event) => {
            event.preventDefault();

            post('/admin/users', {
                preserveScroll:
                    true,
            });
        };

    return (
        <AppLayout
            breadcrumbs={
                breadcrumbs
            }
        >
            <Head title="Create User" />

            <form
                onSubmit={submit}
                className="pms-page"
            >
                {/* PAGE HEADER */}
                <PageHeader
                    eyebrow="Administration"
                    title="Create User"
                    description="Create a new employee account and assign access to the Procurement Management System."
                    icon={UserPlus}
                    actions={
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                        >
                            <Link href="/admin/users">
                                Back to Users
                            </Link>
                        </Button>
                    }
                />

                {/* FORM CONTEXT */}
                <section className="border-b border-border bg-secondary/30 px-5 py-3 md:px-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Record Type
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                PMS User Account
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Default Status
                            </div>

                            <div className="mt-1 text-sm font-semibold capitalize">
                                {data.status}
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Password Policy
                            </div>

                            <div className="mt-1 text-sm font-semibold">
                                Temporary Password
                            </div>
                        </div>
                    </div>
                </section>

                {/* EMPLOYEE INFORMATION */}
                <SectionCard
                    title="Employee Information"
                    description="Enter the employee’s official identification, name, position, and organizational assignment."
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
                                placeholder="Example: 2026-001"
                                required
                            />

                            <p className="pms-help-text">
                                Enter the employee's
                                official agency or
                                personnel identifier.
                            </p>

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
                                placeholder="Example: Administrative Officer"
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
                                Determines the
                                employee's
                                organizational unit
                                within the
                                Procurement Management
                                System.
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
                    description="Configure the identifiers the employee will use to access the system."
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* USERNAME */}
                        <div className="pms-field">
                            <Label htmlFor="username">
                                Username
                            </Label>

                            <Input
                                id="username"
                                autoComplete="off"
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
                                placeholder="Example: jdelacruz"
                                required
                            />

                            <p className="pms-help-text">
                                The employee may use
                                this username when
                                signing in.
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
                                autoComplete="off"
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
                                placeholder="employee@example.gov.ph"
                                required
                            />

                            <p className="pms-help-text">
                                Use the employee's
                                official organizational
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
                    description="Assign the employee’s system role and initial account status."
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
                                Role permissions are
                                enforced by the
                                backend. Assign only
                                the access required for
                                the employee's duties.
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
                            </select>

                            <p className="pms-help-text">
                                Active accounts may
                                sign in. Pending and
                                inactive accounts
                                remain unavailable
                                until their status is
                                changed.
                            </p>

                            <InputError
                                message={
                                    errors.status
                                }
                            />
                        </div>
                    </div>

                    {/* ACCESS NOTICE */}
                    <div className="mt-5 border-l-2 border-primary bg-secondary/20 px-4 py-3">
                        <div className="text-xs font-semibold uppercase tracking-[0.08em] text-primary">
                            Access Control
                        </div>

                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Access to PPMP,
                            Purchase Request,
                            administration, and
                            approval functions will
                            depend on the selected
                            role and the permissions
                            assigned to that role.
                        </p>
                    </div>
                </SectionCard>

                {/* INITIAL PASSWORD */}
                <SectionCard
                    title="Initial Password"
                    description="Create a temporary password for first-time account access."
                    actions={
                        <KeyRound className="size-5 text-primary" />
                    }
                >
                    <div className="grid gap-5 md:grid-cols-2">
                        {/* PASSWORD */}
                        <div className="pms-field">
                            <Label htmlFor="password">
                                Temporary Password
                            </Label>

                            <Input
                                id="password"
                                type="password"
                                autoComplete="new-password"
                                value={
                                    data.password
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'password',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <p className="pms-help-text">
                                Use at least 12
                                characters with
                                uppercase, lowercase,
                                number, and symbol.
                            </p>

                            <InputError
                                message={
                                    errors.password
                                }
                            />
                        </div>

                        {/* CONFIRM PASSWORD */}
                        <div className="pms-field">
                            <Label htmlFor="password_confirmation">
                                Confirm Temporary
                                Password
                            </Label>

                            <Input
                                id="password_confirmation"
                                type="password"
                                autoComplete="new-password"
                                value={
                                    data.password_confirmation
                                }
                                onChange={(
                                    event,
                                ) =>
                                    setData(
                                        'password_confirmation',
                                        event.target
                                            .value,
                                    )
                                }
                                required
                            />

                            <p className="pms-help-text">
                                Re-enter the temporary
                                password exactly as
                                entered in the first
                                field.
                            </p>

                            <InputError
                                message={
                                    errors.password_confirmation
                                }
                            />
                        </div>
                    </div>

                    {/* MUST CHANGE PASSWORD */}
                    <div className="mt-5 border border-border bg-secondary/20">
                        <label
                            htmlFor="must_change_password"
                            className="flex cursor-pointer items-start gap-3 px-4 py-4"
                        >
                            <Checkbox
                                id="must_change_password"
                                checked={
                                    data.must_change_password
                                }
                                onCheckedChange={(
                                    checked,
                                ) =>
                                    setData(
                                        'must_change_password',
                                        checked ===
                                            true,
                                    )
                                }
                                className="mt-0.5"
                            />

                            <div>
                                <div className="text-sm font-semibold">
                                    Require password
                                    change on first
                                    login
                                </div>

                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                    Recommended for
                                    newly created
                                    accounts. The
                                    employee will be
                                    required to replace
                                    this temporary
                                    password after
                                    signing in.
                                </p>
                            </div>
                        </label>
                    </div>

                    <InputError
                        message={
                            errors.must_change_password
                        }
                    />
                </SectionCard>

                {/* ACTION BAR */}
                <ActionBar
                    left={
                        <div>
                            <div className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
                                New User Account
                            </div>

                            <div className="mt-1 text-sm text-foreground">
                                Complete all required
                                fields before creating
                                the account.
                            </div>
                        </div>
                    }
                >
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                    >
                        <Link href="/admin/users">
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
                            ? 'Creating User...'
                            : 'Create User'}
                    </Button>
                </ActionBar>
            </form>
        </AppLayout>
    );
}
