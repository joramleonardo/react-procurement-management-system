import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface ChangeTemporaryPasswordProps {
    userName: string;
}

export default function ChangeTemporaryPassword({
    userName,
}: ChangeTemporaryPasswordProps) {
    const {
        data,
        setData,
        put,
        processing,
        errors,
        reset,
    } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler<HTMLFormElement> = (
        event,
    ) => {
        event.preventDefault();

        put('/password/change-required', {
            preserveScroll: true,

            onFinish: () =>
                reset(
                    'current_password',
                    'password',
                    'password_confirmation',
                ),
        });
    };

    return (
        <AuthLayout
            title="Change your temporary password"
            description="You must create a new password before accessing the Procurement Management System."
        >
            <Head title="Change Temporary Password" />

            <form
                onSubmit={submit}
                className="flex flex-col gap-6"
            >
                <div className="rounded-lg border bg-muted/40 p-4">
                    <p className="text-sm font-medium">
                        Welcome, {userName}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Your account currently uses a temporary
                        password issued by the administrator.
                    </p>
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="current_password">
                        Temporary Password
                    </Label>

                    <Input
                        id="current_password"
                        type="password"
                        name="current_password"
                        autoComplete="current-password"
                        value={data.current_password}
                        onChange={(event) =>
                            setData(
                                'current_password',
                                event.target.value,
                            )
                        }
                        required
                        autoFocus
                    />

                    <InputError
                        message={errors.current_password}
                    />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password">
                        New Password
                    </Label>

                    <Input
                        id="password"
                        type="password"
                        name="password"
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
                        Use at least 12 characters with uppercase,
                        lowercase, number, and symbol.
                    </p>

                    <InputError message={errors.password} />
                </div>

                <div className="grid gap-2">
                    <Label htmlFor="password_confirmation">
                        Confirm New Password
                    </Label>

                    <Input
                        id="password_confirmation"
                        type="password"
                        name="password_confirmation"
                        autoComplete="new-password"
                        value={data.password_confirmation}
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

                <Button
                    type="submit"
                    className="w-full"
                    disabled={processing}
                >
                    {processing
                        ? 'Changing Password...'
                        : 'Change Password'}
                </Button>

                <div className="text-center">
                    <Link
                        href="/logout"
                        method="post"
                        as="button"
                        className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                    >
                        Sign out instead
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
