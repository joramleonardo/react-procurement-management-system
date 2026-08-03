<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoginLog extends Model
{
    protected $fillable = [
        'user_id',
        'login_identifier',
        'event',
        'is_successful',
        'failure_reason',
        'ip_address',
        'user_agent',
        'session_id',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'is_successful' => 'boolean',
            'occurred_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
