<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PurchaseRequest extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'pr_no',
        'ppmp_id',
        'office_id',
        'requester_id',

        'entity_name',
        'fund_cluster',
        'responsibility_center_code',
        'pr_date',

        'purpose',

        'requested_by_name',
        'requested_by_designation',

        'approved_by_name',
        'approved_by_designation',

        'status',
        'total_amount',

        'submitted_at',
        'returned_at',
        'approved_at',

        'approval_recorded_by',

        'remarks',

        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'pr_date' => 'date',

            'total_amount' =>
                'decimal:2',

            'submitted_at' =>
                'datetime',

            'returned_at' =>
                'datetime',

            'approved_at' =>
                'datetime',
        ];
    }

    public function ppmp(): BelongsTo
    {
        return $this->belongsTo(
            Ppmp::class
        );
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(
            Office::class
        );
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'requester_id'
        );
    }

    public function approvalRecorder(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'approval_recorded_by'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            PurchaseRequestItem::class
        )->orderBy('sort_order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            PurchaseRequestAttachment::class
        );
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(
            PurchaseRequestStatusHistory::class
        )->orderByDesc('acted_at');
    }

    public function isEditable(): bool
    {
        return in_array(
            $this->status,
            [
                'draft',
                'returned_for_revision',
            ],
            true
        );
    }

    public function isApproved(): bool
    {
        return $this->status ===
            'approved';
    }
}
