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
            'pre_procurement_conference' => 'boolean',
            'estimated_budget' => 'decimal:2',
            'approved_pr_amount' => 'decimal:2',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PpmpItem $item): void {
            if (blank($item->lineage_uuid)) {
                $item->lineage_uuid = (string) Str::uuid();
            }
        });
    }

    public function ppmp(): BelongsTo
    {
        return $this->belongsTo(Ppmp::class);
    }

    public function sourceItem(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_item_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(self::class, 'source_item_id');
    }

    public function details(): HasMany
    {
        return $this->hasMany(PpmpItemDetail::class)
            ->orderBy('sort_order');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(PpmpAttachment::class);
    }

    public function purchaseRequestItems(): HasMany
    {
        return $this->hasMany(PurchaseRequestItem::class);
    }

    public function getRemainingBalanceAttribute(): string
    {
        $budgetCents = $this->moneyToCents(
            $this->estimated_budget
        );

        $approvedCents = $this->moneyToCents(
            $this->approved_pr_amount
        );

        return number_format(
            max(
                0,
                $budgetCents - $approvedCents
            ) / 100,
            2,
            '.',
            ''
        );
    }

    private function moneyToCents(mixed $value): int
    {
        $amount = trim(
            str_replace(
                ',',
                '',
                (string) ($value ?? '0')
            )
        );

        if ($amount === '') {
            return 0;
        }

        $parts = explode('.', $amount, 2);

        $whole = preg_replace(
            '/\D/',
            '',
            $parts[0] ?? '0'
        );

        $decimal = preg_replace(
            '/\D/',
            '',
            $parts[1] ?? ''
        );

        $decimal = str_pad(
            substr($decimal, 0, 2),
            2,
            '0'
        );

        return (
            ((int) ($whole !== '' ? $whole : '0')) * 100
        ) + (int) $decimal;
    }
}
