<?php

namespace App\Services;

use App\Models\LoginLog;
use App\Models\User;
use Illuminate\Http\Request;

class LoginLogService
{
    public function successful(
        User $user,
        Request $request,
        string $identifier
    ): LoginLog {
        return $this->record(
            user: $user,
            request: $request,
            identifier: $identifier,
            event: 'login_success',
            successful: true
        );
    }

    public function failed(
        ?User $user,
        Request $request,
        string $identifier
    ): LoginLog {
        return $this->record(
            user: $user,
            request: $request,
            identifier: $identifier,
            event: 'login_failed',
            successful: false,
            failureReason:
                'invalid_credentials_or_account_unavailable'
        );
    }

    public function rateLimited(
        Request $request,
        string $identifier
    ): LoginLog {
        return $this->record(
            user: null,
            request: $request,
            identifier: $identifier,
            event: 'login_rate_limited',
            successful: false,
            failureReason: 'too_many_attempts'
        );
    }

    public function loggedOut(
        User $user,
        Request $request
    ): LoginLog {
        return $this->record(
            user: $user,
            request: $request,
            identifier:
                $user->username
                ?? $user->employee_id
                ?? $user->email,
            event: 'logout',
            successful: true
        );
    }

    private function record(
        ?User $user,
        Request $request,
        ?string $identifier,
        string $event,
        bool $successful,
        ?string $failureReason = null
    ): LoginLog {
        return LoginLog::create([
            'user_id' => $user?->id,
            'login_identifier' => $identifier,
            'event' => $event,
            'is_successful' => $successful,
            'failure_reason' => $failureReason,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),

            'session_id' => $request->hasSession()
                ? $request->session()->getId()
                : null,

            'occurred_at' => now(),
        ]);
    }
}
