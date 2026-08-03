<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class AuditLogService
{
    private const SENSITIVE_KEYS = [
        'password',
        'password_confirmation',
        'current_password',
        'remember_token',
    ];

    public function record(
        string $module,
        string $action,
        ?Model $subject = null,
        ?string $description = null,
        ?array $oldValues = null,
        ?array $newValues = null,
        ?Request $request = null,
        ?User $actor = null
    ): AuditLog {
        $httpRequest = $request ?? request();

        $resolvedActor = $actor;

        if (
            $resolvedActor === null
            && $httpRequest->user() instanceof User
        ) {
            $resolvedActor = $httpRequest->user();
        }

        return AuditLog::create([
            'actor_user_id' => $resolvedActor?->id,
            'module' => $module,
            'action' => $action,

            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),

            'description' => $description,

            'old_values' => $this->sanitize($oldValues),
            'new_values' => $this->sanitize($newValues),

            'ip_address' => $httpRequest->ip(),
            'user_agent' => $httpRequest->userAgent(),
            'created_at' => now(),
        ]);
    }

    private function sanitize(
        ?array $values
    ): ?array {
        if ($values === null) {
            return null;
        }

        return Arr::except(
            $values,
            self::SENSITIVE_KEYS
        );
    }
}
