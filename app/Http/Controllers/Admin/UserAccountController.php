<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ResetUserPasswordRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class UserAccountController extends Controller
{
    /**
     * Display the administrative password-reset page.
     */
    public function editPassword(
        Request $request,
        User $user
    ): Response {
        abort_if(
            $request->user()->is($user),
            403,
            'Use your profile settings to change your own password.'
        );

        return Inertia::render(
            'admin/users/reset-password',
            [
                'user' => [
                    'id' => $user->id,
                    'employee_id' => $user->employee_id,
                    'username' => $user->username,
                    'name' => $user->name,
                    'email' => $user->email,
                    'status' => $user->status,
                ],
            ]
        );
    }

    /**
     * Assign a new temporary password.
     */
    public function updatePassword(
        ResetUserPasswordRequest $request,
        User $user
    ): RedirectResponse {
        if ($request->user()->is($user)) {
            return back()->withErrors([
                'password' =>
                    'Use your profile settings to change your own password.',
            ]);
        }

        $validated = $request->validated();

        DB::transaction(function () use (
            $request,
            $user,
            $validated
        ): void {
            $user->forceFill([
                'password' => $validated['password'],
                'must_change_password' => true,
                'password_changed_at' => null,
                'updated_by' => $request->user()->id,
            ])->save();

            $this->revokeDatabaseSessions($user);
        });

        return redirect()
            ->route('admin.users.show', $user)
            ->with(
                'success',
                'The password was reset. The user must change the temporary password during the next login.'
            );
    }

    /**
     * Activate a pending or inactive user account.
     */
    public function activate(
        Request $request,
        User $user
    ): RedirectResponse {
        $user->forceFill([
            'status' => 'active',
            'locked_until' => null,
            'updated_by' => $request->user()->id,
        ])->save();

        return back()->with(
            'success',
            'User account activated successfully.'
        );
    }

    /**
     * Deactivate a user account.
     */
    public function deactivate(
        Request $request,
        User $user
    ): RedirectResponse {
        if ($request->user()->is($user)) {
            return back()->withErrors([
                'account' =>
                    'You cannot deactivate your own account.',
            ]);
        }

        if (
            $user->hasRole('system-administrator')
            && ! $this->anotherActiveAdministratorExists($user)
        ) {
            return back()->withErrors([
                'account' =>
                    'The final active System Administrator cannot be deactivated.',
            ]);
        }

        DB::transaction(function () use (
            $request,
            $user
        ): void {
            $user->forceFill([
                'status' => 'inactive',
                'locked_until' => null,
                'updated_by' => $request->user()->id,
            ])->save();

            $this->revokeDatabaseSessions($user);
        });

        return back()->with(
            'success',
            'User account deactivated successfully.'
        );
    }

    /**
     * Unlock a locked account.
     */
    public function unlock(
        Request $request,
        User $user
    ): RedirectResponse {
        $user->forceFill([
            'status' => 'active',
            'locked_until' => null,
            'updated_by' => $request->user()->id,
        ])->save();

        return back()->with(
            'success',
            'User account unlocked successfully.'
        );
    }

    /**
     * Determine whether another accessible administrator exists.
     */
    private function anotherActiveAdministratorExists(
        User $excludedUser
    ): bool {
        return User::query()
            ->where(
                $excludedUser->getKeyName(),
                '!=',
                $excludedUser->getKey()
            )
            ->where('status', 'active')
            ->where(function (Builder $query): void {
                $query
                    ->whereNull('locked_until')
                    ->orWhere(
                        'locked_until',
                        '<=',
                        now()
                    );
            })
            ->whereHas(
                'roles',
                function (Builder $query): void {
                    $query
                        ->where(
                            'name',
                            'system-administrator'
                        )
                        ->where(
                            'guard_name',
                            'web'
                        );
                }
            )
            ->exists();
    }

    /**
     * Remove existing sessions when database sessions are used.
     */
    private function revokeDatabaseSessions(
        User $user
    ): void {
        if (config('session.driver') !== 'database') {
            return;
        }

        $table = (string) config(
            'session.table',
            'sessions'
        );

        DB::table($table)
            ->where('user_id', $user->getKey())
            ->delete();
    }
}
