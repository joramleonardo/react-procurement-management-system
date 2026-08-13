<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PpmpAttachment extends Model
{
    protected $fillable = [
        'ppmp_id',
        'ppmp_item_id',
        'document_type',
        'original_name',
        'stored_name',
        'file_path',
        'mime_type',
        'file_size',
        'uploaded_by',
    ];

    public function ppmp(): BelongsTo
    {
        return $this->belongsTo(Ppmp::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(
            PpmpItem::class,
            'ppmp_item_id'
        );
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'uploaded_by'
        );
    }
}
