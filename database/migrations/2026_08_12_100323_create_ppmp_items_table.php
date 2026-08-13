<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppmp_items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('ppmp_id')
                ->constrained('ppmps')
                ->cascadeOnDelete();

            /*
             * Column 1
             * General Description and Objective
             */
            $table->text('description_objective');

            /*
             * Column 2
             * Goods / Infrastructure /
             * Consulting Services / etc.
             */
            $table->string('project_type', 100);

            /*
             * Column 3
             *
             * Kept as text because this may contain values
             * such as:
             * "5 units"
             * "1 lot"
             * "10 pcs, 500GB each"
             */
            $table->text('quantity_size');

            /*
             * Column 4
             */
            $table->string(
                'recommended_mode_of_procurement',
                150
            );

            /*
             * Column 5
             */
            $table->boolean(
                'pre_procurement_conference'
            )->default(false);

            /*
             * Columns 6-8.
             *
             * Stored as YYYY-MM because the PPMP
             * form requires MM/YYYY, not a specific day.
             */
            $table->string(
                'procurement_start_month',
                7
            );

            $table->string(
                'procurement_end_month',
                7
            );

            $table->string(
                'expected_delivery_month',
                7
            );

            /*
             * Column 9
             */
            $table->string(
                'source_of_funds',
                150
            );

            /*
             * Column 10
             */
            $table->decimal(
                'estimated_budget',
                15,
                2
            );

            /*
             * Amount already consumed by approved PRs.
             *
             * We will use this in the PR module.
             */
            $table->decimal(
                'approved_pr_amount',
                15,
                2
            )->default(0);

            /*
             * Column 12
             */
            $table->text('remarks')->nullable();

            /*
             * Used to preserve the exact order of rows
             * shown in the PPMP.
             */
            $table->unsignedInteger(
                'sort_order'
            )->default(1);

            $table->timestamps();

            $table->index([
                'ppmp_id',
                'sort_order',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppmp_items');
    }
};
