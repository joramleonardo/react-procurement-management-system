<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppmp_item_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ppmp_item_id')->constrained('ppmp_items')->cascadeOnDelete();
            $table->uuid('lineage_uuid')->index();
            $table->foreignId('source_detail_id')->nullable()->constrained('ppmp_item_details')->nullOnDelete();
            $table->string('project_type', 100)->nullable();
            $table->decimal('quantity', 15, 3)->nullable();
            $table->string('unit', 100)->nullable();
            $table->text('item_description')->nullable();
            $table->text('size_specification')->nullable();
            $table->unsignedInteger('sort_order')->default(1);
            $table->timestamps();
            $table->index(['ppmp_item_id', 'sort_order']);
        });

        DB::table('ppmp_items')
            ->select(['id', 'project_type', 'quantity_size', 'description_objective'])
            ->orderBy('id')
            ->chunkById(500, function ($items): void {
                $now = now();
                $rows = [];

                foreach ($items as $item) {
                    $rows[] = [
                        'ppmp_item_id' => $item->id,
                        'lineage_uuid' => (string) Str::uuid(),
                        'source_detail_id' => null,
                        'project_type' => filled($item->project_type) ? $item->project_type : null,
                        'quantity' => null,
                        'unit' => null,
                        'item_description' => filled($item->description_objective) ? $item->description_objective : null,
                        'size_specification' => filled($item->quantity_size) ? $item->quantity_size : null,
                        'sort_order' => 1,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($rows !== []) {
                    DB::table('ppmp_item_details')->insert($rows);
                }
            }, 'id');
    }

    public function down(): void
    {
        Schema::dropIfExists('ppmp_item_details');
    }
};
