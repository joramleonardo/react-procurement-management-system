<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class PpmpItemDetail extends Model
{
    protected $fillable = [
        'ppmp_item_id',
        'lineage_uuid',
        'source_detail_id',
        'project_type',
        'quantity',
        'unit',
        'item_description',
        'size_specification',
        'sort_order',
        'estimated_amount',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:3',

            'estimated_amount' => 'decimal:2',

            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PpmpItemDetail $detail): void {
            if (blank($detail->lineage_uuid)) {
                $detail->lineage_uuid = (string) Str::uuid();
            }
        });
    }

    public function ppmpItem(): BelongsTo
    {
        return $this->belongsTo(PpmpItem::class);
    }

    public function sourceDetail(): BelongsTo
    {
        return $this->belongsTo(self::class, 'source_detail_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(self::class, 'source_detail_id');
    }
}
