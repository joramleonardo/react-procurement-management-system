import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface UserRecord {
    id: number;
    employee_id: string | null;
    username: string | null;
    name: string;
    email: string;
    status: string;
}

interface ResetPasswordProps {
    user: UserRecord;
}

export default function ResetPassword({
    user,
}: ResetPasswordProps) {
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
        {
            title: 'Reset Password',
            href: `/admin/users/${user.id}/reset-password`,
        },
    ];

    const {
        data,
        setData,
        put,
        processing,
        errors,
        reset,
    } = useForm({
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();

        put(`/admin/users/${user.id}/reset-password`, {
            preserveScroll: true,

            onFinish: () =>
                reset(
                    'password',
                    'password_confirmation',
                ),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Reset Password - ${user.name}`} />

            <div className="flex h-full flex-1 flex-col gap-5 rounded-xl p-4">
                <div>
                    <h1 className="text-2xl font-semibold">
                        Reset User Password
                    </h1>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Assign a temporary password to this
                        account.
                    </p>
                </div>

                <div className="max-w-2xl">
                    <section className="mb-5 rounded-xl border bg-background p-5">
                        <h2 className="font-semibold">
                            {user.name}
                        </h2>

                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <p>
                                Employee ID:{' '}
                                {user.employee_id ??
                                    'Not provided'}
                            </p>

                            <p>
                                Username:{' '}
                                {user.username ??
                                    'Not provided'}
                            </p>

                            <p>Email: {user.email}</p>
                        </div>
                    </section>

                    <form
                        onSubmit={submit}
                        className="space-y-5 rounded-xl border bg-background p-5"
                    >
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                            The user will be signed out of existing
                            sessions and required to change this
                            temporary password during the next
                            login.
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="password">
                                New Temporary Password
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
                                autoFocus
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

                            <InputError
                                message={
                                    errors.password_confirmation
                                }
                            />
                        </div>

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
                                    ? 'Resetting Password...'
                                    : 'Reset Password'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
