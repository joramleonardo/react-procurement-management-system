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
        'ppmp_series_id',
        'indicative_no',
        'revised_from_ppmp_id',

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
            'indicative_no' => 'integer',
            'fiscal_year' => 'integer',

            'total_budget' => 'decimal:2',
            'approved_pr_total' => 'decimal:2',

            'submitted_at' => 'datetime',
            'returned_at' => 'datetime',
            'approved_at' => 'datetime',
        ];
    }

    /**
     * Overall PPMP series containing this
     * Indicative version.
     */
    public function series(): BelongsTo
    {
        return $this->belongsTo(
            PpmpSeries::class,
            'ppmp_series_id'
        );
    }

    public function office(): BelongsTo
    {
        return $this->belongsTo(
            Office::class
        );
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

    /**
     * Previous Indicative version from which
     * this PPMP was created.
     *
     * Example:
     *
     * Indicative No. 2
     * revised_from_ppmp_id → Indicative No. 1
     */
    public function revisedFrom(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'revised_from_ppmp_id'
        );
    }

    /**
     * Any direct revision that was created
     * from this PPMP version.
     *
     * Normally there should only be one next
     * Indicative revision.
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(
            self::class,
            'revised_from_ppmp_id'
        )
            ->orderBy(
                'indicative_no'
            );
    }

    public function items(): HasMany
    {
        return $this->hasMany(
            PpmpItem::class
        )
            ->orderBy(
                'sort_order'
            );
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
        )
            ->orderByDesc(
                'acted_at'
            );
    }

    /**
     * Remaining balance directly associated with
     * this specific PPMP version.
     *
     * Series-wide remaining balance should use:
     *
     * $ppmp->series->remaining_balance
     */
    public function getRemainingBalanceAttribute(): string
    {
        return bcsub(
            (string) $this->total_budget,
            (string) $this->approved_pr_total,
            2
        );
    }

    /**
     * Draft and returned PPMPs remain editable.
     *
     * Approved versions remain immutable.
     */
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

    public function isIndicative(): bool
    {
        return $this->plan_type
            === 'indicative';
    }

    public function isFinal(): bool
    {
        return $this->plan_type
            === 'final';
    }

    /**
     * True only for the first Indicative version
     * of a PPMP series.
     */
    public function isFirstIndicative(): bool
    {
        return $this->indicative_no === 1;
    }

    /**
     * Display label used by the UI.
     *
     * Examples:
     *
     * Indicative No. 1
     * Indicative No. 7
     * Final
     */
    public function getVersionLabelAttribute(): string
    {
        if ($this->isFinal()) {
            return 'Final';
        }

        return 'Indicative No. '
            .$this->indicative_no;
    }

    public function purchaseRequests(): HasMany
    {
        return $this->hasMany(
            PurchaseRequest::class
        );
    }
}
