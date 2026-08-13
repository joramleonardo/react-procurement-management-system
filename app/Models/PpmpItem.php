<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PpmpItem extends Model
{
    protected $fillable = [
        'ppmp_id',
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

    public function ppmp(): BelongsTo
    {
        return $this->belongsTo(Ppmp::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(
            PpmpAttachment::class
        );
    }

    public function getRemainingBalanceAttribute(): string
    {
        return bcsub(
            (string) $this->estimated_budget,
            (string) $this->approved_pr_amount,
            2
        );
    }
}
