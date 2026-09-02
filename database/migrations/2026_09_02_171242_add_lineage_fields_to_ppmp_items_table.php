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
        /*
         * Add lineage columns.
         */
        Schema::table(
            'ppmp_items',
            function (Blueprint $table) {
                /*
                 * Permanent identifier for the same
                 * logical procurement item across
                 * Indicative revisions.
                 */
                $table->uuid(
                    'lineage_uuid'
                )
                    ->nullable()
                    ->after('ppmp_id')
                    ->index();

                /*
                 * Immediate source item from the
                 * preceding Indicative revision.
                 */
                $table->foreignId(
                    'source_item_id'
                )
                    ->nullable()
                    ->after('lineage_uuid')
                    ->constrained('ppmp_items')
                    ->nullOnDelete();
            }
        );

        /*
         * Existing PPMP items are considered the
         * starting point of their own item lineage.
         */
        DB::table('ppmp_items')
            ->select('id')
            ->orderBy('id')
            ->get()
            ->each(
                function ($item): void {
                    DB::table('ppmp_items')
                        ->where(
                            'id',
                            $item->id
                        )
                        ->update([
                            'lineage_uuid' =>
                                (string)
                                Str::uuid(),
                        ]);
                }
            );
    }

    public function down(): void
    {
        Schema::table(
            'ppmp_items',
            function (Blueprint $table) {
                $table->dropForeign([
                    'source_item_id',
                ]);

                $table->dropIndex([
                    'lineage_uuid',
                ]);

                $table->dropColumn([
                    'source_item_id',
                    'lineage_uuid',
                ]);
            }
        );
    }
};
