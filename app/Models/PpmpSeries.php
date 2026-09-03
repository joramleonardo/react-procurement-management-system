<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class PpmpSeries extends Model
{
    use SoftDeletes;

    /*
     * "series" is already singular/plural in English,
     * so explicitly define the table name.
     */
    protected $table = 'ppmp_series';

    protected $fillable = [
        'office_id',
        'fiscal_year',
        'original_budget',
        'approved_pr_total',
        'created_by',
        'updated_by',
    ];

    protected function casts(): array
    {
        return [
            'fiscal_year' => 'integer',
            'original_budget' => 'decimal:2',
            'approved_pr_total' => 'decimal:2',
        ];
    }

    /**
     * Office / division that owns this PPMP series.
     */
    public function office(): BelongsTo
    {
        return $this->belongsTo(
            Office::class
        );
    }

    /**
     * User who originally created the PPMP series.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'created_by'
        );
    }

    /**
     * Last user who updated the PPMP series.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'updated_by'
        );
    }

    /**
     * All PPMP versions belonging to this series.
     *
     * Example:
     *
     * Indicative No. 1
     * Indicative No. 2
     * Indicative No. 3
     */
    public function ppmps(): HasMany
    {
        return $this->hasMany(
            Ppmp::class,
            'ppmp_series_id'
        )
            ->orderBy(
                'indicative_no'
            );
    }

    /**
     * Remaining overall budget after approved PR
     * utilization across the PPMP series.
     */
    public function getRemainingBalanceAttribute(): string
    {
        return bcsub(
            (string) $this->original_budget,
            (string) $this->approved_pr_total,
            2
        );
    }

    /**
     * Whether the series already has a permanent
     * original budget.
     */
    public function hasOriginalBudget(): bool
    {
        return bccomp(
            (string) $this->original_budget,
            '0.00',
            2
        ) === 1;
    }
}
