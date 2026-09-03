<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PpmpItem extends Model
{
    protected $fillable = [
        'ppmp_id',

        'lineage_uuid',
        'source_item_id',

        'description_objective',
        'project_type',
        'quantity_size',

        'recommended_mode_of_procurement',

        'pre_procurement_conference',

        'procurement_start_month',
        'procurement_end_month',
        'expected_delivery_month',

        'source_of_funds',

        'estimated_budget',
        'approved_pr_amount',

        'remarks',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'pre_procurement_conference' =>
                'boolean',

            'estimated_budget' =>
                'decimal:2',

            'approved_pr_amount' =>
                'decimal:2',

            'sort_order' =>
                'integer',
        ];
    }

    /**
     * Automatically assign a permanent lineage UUID
     * whenever a completely new PPMP item is created.
     *
     * When cloning an existing item into another
     * Indicative revision, the controller will supply
     * the existing lineage_uuid so it is preserved.
     */
    protected static function booted(): void
    {
        static::creating(
            function (PpmpItem $item): void {
                if (
                    blank(
                        $item->lineage_uuid
                    )
                ) {
                    $item->lineage_uuid =
                        (string) Str::uuid();
                }
            }
        );
    }

    public function ppmp(): BelongsTo
    {
        return $this->belongsTo(
            Ppmp::class
        );
    }

    /**
     * Immediate item from the previous Indicative
     * revision from which this item was cloned.
     */
    public function sourceItem(): BelongsTo
    {
        return $this->belongsTo(
            self::class,
            'source_item_id'
        );
    }

    /**
     * Later item revisions that originated directly
     * from this item.
     */
    public function revisions(): HasMany
    {
        return $this->hasMany(
            self::class,
            'source_item_id'
        );
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            PpmpAttachment::class
        );
    }

    /**
     * Remaining balance cached on this specific
     * PPMP item row.
     *
     * Later, when PR approval is implemented,
     * lineage-wide approved utilization will also
     * be validated from approved PR item records.
     */
    public function getRemainingBalanceAttribute(): string
    {
        return bcsub(
            (string) $this->estimated_budget,
            (string) $this->approved_pr_amount,
            2
        );
    }

    public function purchaseRequestItems(): HasMany
    {
        return $this->hasMany(
            PurchaseRequestItem::class
        );
    }
}
