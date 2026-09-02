<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        /*
         * Add the versioning columns first as nullable
         * so existing PPMP records can be migrated safely.
         */
        Schema::table(
            'ppmps',
            function (Blueprint $table) {
                $table->foreignId(
                    'ppmp_series_id'
                )
                    ->nullable()
                    ->after('id')
                    ->constrained('ppmp_series')
                    ->restrictOnDelete();

                $table->unsignedInteger(
                    'indicative_no'
                )
                    ->nullable()
                    ->after('ppmp_series_id');

                /*
                 * Exact PPMP version from which this
                 * indicative revision was created.
                 *
                 * Example:
                 *
                 * Indicative 2 → revised_from = Indicative 1
                 * Indicative 3 → revised_from = Indicative 2
                 */
                $table->foreignId(
                    'revised_from_ppmp_id'
                )
                    ->nullable()
                    ->after('indicative_no')
                    ->constrained('ppmps')
                    ->nullOnDelete();

                $table->index(
                    'revised_from_ppmp_id'
                );
            }
        );

        /*
         * Backfill existing PPMP records.
         *
         * Each existing PPMP becomes the first
         * Indicative version of its own PPMP series.
         */
        DB::table('ppmps')
            ->orderBy('id')
            ->get()
            ->each(function ($ppmp): void {
                $seriesId = DB::table(
                    'ppmp_series'
                )->insertGetId([
                    'office_id' =>
                        $ppmp->office_id,

                    'fiscal_year' =>
                        $ppmp->fiscal_year,

                    'original_budget' =>
                        $ppmp->total_budget,

                    'approved_pr_total' =>
                        $ppmp->approved_pr_total
                            ?? 0,

                    'created_by' =>
                        $ppmp->created_by,

                    'updated_by' =>
                        $ppmp->updated_by,

                    'created_at' =>
                        $ppmp->created_at
                            ?? now(),

                    'updated_at' =>
                        $ppmp->updated_at
                            ?? now(),
                ]);

                DB::table('ppmps')
                    ->where(
                        'id',
                        $ppmp->id
                    )
                    ->update([
                        'ppmp_series_id' =>
                            $seriesId,

                        'indicative_no' =>
                            1,

                        'revised_from_ppmp_id' =>
                            null,
                    ]);
            });

        /*
         * Every PPMP series may only contain one
         * occurrence of a particular Indicative number.
         *
         * There is intentionally NO maximum value for
         * indicative_no.
         */
        Schema::table(
            'ppmps',
            function (Blueprint $table) {
                $table->unique(
                    [
                        'ppmp_series_id',
                        'indicative_no',
                    ],
                    'ppmps_series_indicative_unique'
                );

                $table->index(
                    [
                        'ppmp_series_id',
                        'status',
                    ],
                    'ppmps_series_status_index'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::table(
            'ppmps',
            function (Blueprint $table) {
                $table->dropUnique(
                    'ppmps_series_indicative_unique'
                );

                $table->dropIndex(
                    'ppmps_series_status_index'
                );

                $table->dropIndex([
                    'revised_from_ppmp_id',
                ]);

                $table->dropForeign([
                    'revised_from_ppmp_id',
                ]);

                $table->dropForeign([
                    'ppmp_series_id',
                ]);

                $table->dropColumn([
                    'revised_from_ppmp_id',
                    'indicative_no',
                    'ppmp_series_id',
                ]);
            }
        );
    }
};
