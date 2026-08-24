<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Ppmp extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ppmp_no',
        'fiscal_year',
        'plan_type',
        'office_id',
        'coordinator_id',
        'prepared_by_name',
        'prepared_by_position',
        'submitted_by_name',
        'submitted_by_position',
        'status',
        'total_budget',
        'approved_pr_total',
        'submitted_at',
        'returned_at',
        'approved_at',
        'approved_by',
        'remarks',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'fiscal_year' => 'integer',
            'total_budget' => 'decimal:2',
            'approved_pr_total' => 'decimal:2',
            'submitted_at' => 'datetime',
            'returned_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(Office::class);
    }

    public function coordinator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'coordinator_id'
        );
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'approved_by'
        );
    }

    public function items(): HasMany
    {
        return $this->hasMany(PpmpItem::class)
            ->orderBy('sort_order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            PpmpAttachment::class
        );
    }

    public function statusHistories(): HasMany
    {
        return $this->hasMany(
            PpmpStatusHistory::class
        )->latest('acted_at');
    }

    public function getRemainingBalanceAttribute(): string
    {
        return bcsub(
            (string) $this->total_budget,
            (string) $this->approved_pr_total,
            2
        );
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
        return $this->status === 'approved';
    }

    public function purchaseRequests()
    {
        return $this->hasMany(
            PurchaseRequest::class
        );
    }
}
