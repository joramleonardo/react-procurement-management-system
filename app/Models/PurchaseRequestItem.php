<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestItem extends Model
{
    protected $fillable = [
        'purchase_request_id',
        'ppmp_item_id',

        'stock_property_no',
        'unit',
        'item_description',

        'quantity',
        'unit_cost',
        'total_cost',

        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'quantity' =>
                'decimal:3',

            'unit_cost' =>
                'decimal:2',

            'total_cost' =>
                'decimal:2',

            'sort_order' =>
                'integer',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(
            PurchaseRequest::class
        );
    }

    public function ppmpItem(): BelongsTo
    {
        return $this->belongsTo(
            PpmpItem::class
        );
    }
}
