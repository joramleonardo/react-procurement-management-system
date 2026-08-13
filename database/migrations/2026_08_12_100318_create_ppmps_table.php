<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ppmps', function (Blueprint $table) {
            $table->id();

            /*
             * Internal/system PPMP number.
             * Example: PPMP-2026-0001
             */
            $table->string('ppmp_no', 50)->unique();

            /*
             * Fiscal year of the procurement plan.
             */
            $table->unsignedSmallInteger('fiscal_year')->index();

            /*
             * indicative / final
             */
            $table->string('plan_type', 20)
                ->default('indicative')
                ->index();

            /*
             * End-user / implementing division.
             */
            $table->foreignId('office_id')
                ->constrained('offices')
                ->restrictOnDelete();

            /*
             * PPMP Coordinator who created the PPMP.
             */
            $table->foreignId('coordinator_id')
                ->constrained('users')
                ->restrictOnDelete();

            /*
             * Information appearing in the signature section.
             */
            $table->string('prepared_by_name')->nullable();
            $table->string('prepared_by_position')->nullable();

            $table->string('submitted_by_name')->nullable();
            $table->string('submitted_by_position')->nullable();

            /*
             * Workflow:
             *
             * draft
             * submitted
             * returned_for_revision
             * approved
             */
            $table->string('status', 40)
                ->default('draft')
                ->index();

            /*
             * Total approved/planned PPMP budget.
             * Updated whenever PPMP items change.
             */
            $table->decimal('total_budget', 15, 2)
                ->default(0);

            /*
             * This will be updated when the PR module
             * is implemented and PRs are approved.
             */
            $table->decimal('approved_pr_total', 15, 2)
                ->default(0);

            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('returned_at')->nullable();
            $table->timestamp('approved_at')->nullable();

            /*
             * GSPS Administrator who recorded the approval.
             */
            $table->foreignId('approved_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            /*
             * General GSPS remarks / return-for-revision reason.
             */
            $table->text('remarks')->nullable();

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
                'status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ppmps');
    }
};
