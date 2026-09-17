<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table(
            'purchase_request_items',
            function (Blueprint $table): void {
                $table
                    ->foreignId('ppmp_item_detail_id')
                    ->nullable()
                    ->after('ppmp_item_id')
                    ->constrained('ppmp_item_details')
                    ->restrictOnDelete();
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'purchase_request_items',
            function (Blueprint $table): void {
                $table->dropConstrainedForeignId(
                    'ppmp_item_detail_id'
                );
            }
        );
    }
};
