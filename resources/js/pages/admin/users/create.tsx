import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
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

function formatRole(role: string): string {
    return role
        .split('-')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ');
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
        must_change_password: true as boolean,
    });

    const submit: FormEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();

        post('/admin/users', {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create User" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Create User
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Create a new Procurement Management
                            System account.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link href="/admin/users">
                            Back to Users
                        </Link>
                    </Button>
                </div>

                <form
                    onSubmit={submit}
                    className="space-y-6"
                >
                    <section className="rounded-xl border bg-background p-5">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">
                                Employee Information
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Enter the employee’s official
                                information.
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="employee_id">
                                    Employee ID
                                </Label>

                                <Input
                                    id="employee_id"
                                    value={data.employee_id}
                                    onChange={(event) =>
                                        setData(
                                            'employee_id',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: 2026-001"
                                    required
                                />

                                <InputError
                                    message={errors.employee_id}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="position_title">
                                    Position Title
                                </Label>

                                <Input
                                    id="position_title"
                                    value={data.position_title}
                                    onChange={(event) =>
                                        setData(
                                            'position_title',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: Administrative Officer"
                                />

                                <InputError
                                    message={errors.position_title}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="first_name">
                                    First Name
                                </Label>

                                <Input
                                    id="first_name"
                                    value={data.first_name}
                                    onChange={(event) =>
                                        setData(
                                            'first_name',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />

                                <InputError
                                    message={errors.first_name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="middle_name">
                                    Middle Name
                                </Label>

                                <Input
                                    id="middle_name"
                                    value={data.middle_name}
                                    onChange={(event) =>
                                        setData(
                                            'middle_name',
                                            event.target.value,
                                        )
                                    }
                                />

                                <InputError
                                    message={errors.middle_name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="last_name">
                                    Last Name
                                </Label>

                                <Input
                                    id="last_name"
                                    value={data.last_name}
                                    onChange={(event) =>
                                        setData(
                                            'last_name',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />

                                <InputError
                                    message={errors.last_name}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="suffix">
                                    Suffix
                                </Label>

                                <Input
                                    id="suffix"
                                    value={data.suffix}
                                    onChange={(event) =>
                                        setData(
                                            'suffix',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Jr., Sr., III"
                                />

                                <InputError
                                    message={errors.suffix}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="office_id">
                                    Office or Division
                                </Label>

                                <select
                                    id="office_id"
                                    value={data.office_id}
                                    onChange={(event) =>
                                        setData(
                                            'office_id',
                                            event.target.value,
                                        )
                                    }
                                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="">
                                        Not assigned
                                    </option>

                                    {offices.map((office) => (
                                        <option
                                            key={office.id}
                                            value={office.id}
                                        >
                                            {office.code} —{' '}
                                            {office.name}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    message={errors.office_id}
                                />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-xl border bg-background p-5">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">
                                Account Information
                            </h2>

                            <p className="text-sm text-muted-foreground">
                                Configure the user’s login
                                credentials and access.
                            </p>
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="username">
                                    Username
                                </Label>

                                <Input
                                    id="username"
                                    autoComplete="off"
                                    value={data.username}
                                    onChange={(event) =>
                                        setData(
                                            'username',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Example: jdelacruz"
                                    required
                                />

                                <InputError
                                    message={errors.username}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Official Email Address
                                </Label>

                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="off"
                                    value={data.email}
                                    onChange={(event) =>
                                        setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="employee@example.gov.ph"
                                    required
                                />

                                <InputError
                                    message={errors.email}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="role">
                                    Role
                                </Label>

                                <select
                                    id="role"
                                    value={data.role}
                                    onChange={(event) =>
                                        setData(
                                            'role',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    <option value="">
                                        Select a role
                                    </option>

                                    {roles.map((role) => (
                                        <option
                                            key={role.id}
                                            value={role.name}
                                        >
                                            {formatRole(
                                                role.name,
                                            )}
                                        </option>
                                    ))}
                                </select>

                                <InputError
                                    message={errors.role}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="status">
                                    Account Status
                                </Label>

                                <select
                                    id="status"
                                    value={data.status}
                                    onChange={(event) =>
                                        setData(
                                            'status',
                                            event.target.value,
                                        )
                                    }
                                    required
                                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

                                <InputError
                                    message={errors.status}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password">
                                    Temporary Password
                                </Label>

                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(event) =>
                                        setData(
                                            'password',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />

                                <p className="text-xs text-muted-foreground">
                                    Use at least 12 characters with
                                    uppercase, lowercase, number, and
                                    symbol.
                                </p>

                                <InputError
                                    message={errors.password}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="password_confirmation">
                                    Confirm Temporary Password
                                </Label>

                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    value={
                                        data.password_confirmation
                                    }
                                    onChange={(event) =>
                                        setData(
                                            'password_confirmation',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
                            <Checkbox
                                id="must_change_password"
                                checked={
                                    data.must_change_password
                                }
                                onCheckedChange={(checked) =>
                                    setData(
                                        'must_change_password',
                                        checked === true,
                                    )
                                }
                            />

                            <div className="grid gap-1">
                                <Label
                                    htmlFor="must_change_password"
                                    className="cursor-pointer"
                                >
                                    Require password change on
                                    first login
                                </Label>

                                <p className="text-xs text-muted-foreground">
                                    The user will be required to
                                    replace the temporary password
                                    after signing in.
                                </p>
                            </div>
                        </div>

                        <InputError
                            message={
                                errors.must_change_password
                            }
                        />
                    </section>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                            disabled={processing}
                        >
                            {processing
                                ? 'Creating User...'
                                : 'Create User'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
