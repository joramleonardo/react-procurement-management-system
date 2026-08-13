<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\UpdateTemporaryPasswordRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use App\Services\AuditLogService;

class TemporaryPasswordController extends Controller
{
    /**
     * Display the required password-change page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render(
            'auth/change-temporary-password',
            [
                'userName' => $request->user()->name,
            ]
        );
    }

    /**
     * Replace the user's temporary password.
     */
    public function update(
        UpdateTemporaryPasswordRequest $request
    ): RedirectResponse {
        $validated = $request->validated();
        $user = $request->user();

        $user->forceFill([
            'password' => $validated['password'],
            'must_change_password' => false,
            'password_changed_at' => now(),
            'updated_by' => $user->id,
        ])->save();

        $auditLogService->record(
            module: 'authentication',
            action: 'password-changed',
            subject: $user,
            description:
                "{$user->name} replaced their temporary password.",
            newValues: [
                'must_change_password' => false,
                'password_changed_at' =>
                    $user->password_changed_at,
            ],
            request: $request,
            actor: $user
        );

        /*
         * Generate a new session identifier after the
         * security-sensitive password update.
         */
        $request->session()->regenerate();

        return redirect()
            ->route('dashboard')
            ->with(
                'success',
                'Your password was changed successfully.'
            );
    }
}
