<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestStatusHistory extends Model
{
    protected $fillable = [
        'purchase_request_id',
        'from_status',
        'to_status',
        'action',
        'remarks',
        'action_by',
        'acted_at',
    ];

    protected function casts(): array
    {
        return [
            'acted_at' =>
                'datetime',
        ];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(
            PurchaseRequest::class
        );
    }

    public function actionBy(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'action_by'
        );
    }
}
