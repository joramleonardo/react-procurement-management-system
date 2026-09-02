<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'ppmp_series',
            function (Blueprint $table) {
                $table->id();

                /*
                 * Office that owns the overall PPMP series.
                 */
                $table->foreignId('office_id')
                    ->constrained('offices')
                    ->restrictOnDelete();

                /*
                 * Fiscal year shared by the PPMP versions
                 * belonging to this series.
                 */
                $table->unsignedSmallInteger(
                    'fiscal_year'
                )->index();

                /*
                 * Permanent original budget of the series.
                 *
                 * For Indicative No. 1, this may still
                 * follow the PPMP total while No. 1 is
                 * editable.
                 *
                 * Once Indicative No. 1 is approved,
                 * this becomes the permanent fixed amount.
                 *
                 * All succeeding Indicative versions must
                 * have exactly the same total.
                 */
                $table->decimal(
                    'original_budget',
                    15,
                    2
                )->default(0);

                /*
                 * Cached approved PR utilization across
                 * the whole PPMP series.
                 *
                 * The actual PR / PR item records remain
                 * the historical source of truth.
                 */
                $table->decimal(
                    'approved_pr_total',
                    15,
                    2
                )->default(0);

                $table->foreignId('created_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->foreignId('updated_by')
                    ->nullable()
                    ->constrained('users')
                    ->nullOnDelete();

                $table->timestamps();
                $table->softDeletes();

                $table->index([
                    'office_id',
                    'fiscal_year',
                ]);
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'ppmp_series'
        );
    }
};
