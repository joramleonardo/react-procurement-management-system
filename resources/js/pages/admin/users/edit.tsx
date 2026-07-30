import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
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

function formatRole(role: string): string {
    return role
        .split('-')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1),
        )
        .join(' ');
}

export default function EditUser({
    user,
    offices,
    roles,
}: EditUserProps) {
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
        employee_id: user.employee_id ?? '',
        username: user.username ?? '',
        first_name: user.first_name ?? '',
        middle_name: user.middle_name ?? '',
        last_name: user.last_name ?? '',
        suffix: user.suffix ?? '',
        email: user.email,
        office_id: user.office_id
            ? String(user.office_id)
            : '',
        position_title: user.position_title ?? '',
        role: user.role,
        status: user.status,
    });

    const submit: FormEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();

        put(`/admin/users/${user.id}`, {
            preserveScroll: true,
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Edit User" />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold">
                            Edit User
                        </h1>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Update the employee’s account
                            information and system access.
                        </p>
                    </div>

                    <Button asChild variant="outline">
                        <Link
                            href={`/admin/users/${user.id}`}
                        >
                            Cancel
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
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="username">
                                    Username
                                </Label>

                                <Input
                                    id="username"
                                    value={data.username}
                                    onChange={(event) =>
                                        setData(
                                            'username',
                                            event.target.value,
                                        )
                                    }
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
                                    value={data.email}
                                    onChange={(event) =>
                                        setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
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

                                    <option value="locked">
                                        Locked
                                    </option>
                                </select>

                                <InputError
                                    message={errors.status}
                                />
                            </div>
                        </div>
                    </section>

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
                            disabled={processing}
                        >
                            {processing
                                ? 'Saving Changes...'
                                : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
