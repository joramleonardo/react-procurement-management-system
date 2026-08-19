<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();

            /*
             * System-generated PR number.
             * Example: PR-2026-0001
             */
            $table->string('pr_no', 50)
                ->unique();

            /*
             * PR can only originate from an approved PPMP.
             */
            $table->foreignId('ppmp_id')
                ->constrained('ppmps')
                ->restrictOnDelete();

            /*
             * End-user / Office / Section.
             */
            $table->foreignId('office_id')
                ->constrained('offices')
                ->restrictOnDelete();

            /*
             * User who created the PR.
             */
            $table->foreignId('requester_id')
                ->constrained('users')
                ->restrictOnDelete();

            /*
             * GAM Appendix 60 header fields.
             */
            $table->string(
                'entity_name',
                255
            )->default('DOST-STII');

            $table->string(
                'fund_cluster',
                100
            )->nullable();

            $table->string(
                'responsibility_center_code',
                100
            )->nullable();

            $table->date(
                'pr_date'
            )->nullable();

            /*
             * Purpose section.
             */
            $table->text(
                'purpose'
            )->nullable();

            /*
             * Requested By
             *
             * This represents the person printed
             * on the actual PR document,
             * normally the Division Chief.
             */
            $table->string(
                'requested_by_name'
            )->nullable();

            $table->string(
                'requested_by_designation'
            )->nullable();

            /*
             * Approved By
             *
             * This represents the approving person
             * printed on the actual signed document,
             * normally the Director.
             */
            $table->string(
                'approved_by_name'
            )->nullable();

            $table->string(
                'approved_by_designation'
            )->nullable();

            /*
             * Workflow:
             *
             * draft
             * submitted
             * returned_for_revision
             * approved
             */
            $table->string(
                'status',
                40
            )
                ->default('draft')
                ->index();

            /*
             * Computed from PR items.
             */
            $table->decimal(
                'total_amount',
                15,
                2
            )->default(0);

            $table->timestamp(
                'submitted_at'
            )->nullable();

            $table->timestamp(
                'returned_at'
            )->nullable();

            $table->timestamp(
                'approved_at'
            )->nullable();

            /*
             * PMS user who recorded the approval
             * and uploaded the scanned approved PR.
             *
             * This is NOT necessarily the Director.
             */
            $table->foreignId(
                'approval_recorded_by'
            )
                ->nullable()
                ->constrained(
                    'users'
                )
                ->nullOnDelete();

            /*
             * Latest workflow remark.
             */
            $table->text(
                'remarks'
            )->nullable();

            $table->foreignId(
                'created_by'
            )
                ->constrained('users')
                ->restrictOnDelete();

            $table->foreignId(
                'updated_by'
            )
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();

            $table->index([
                'office_id',
                'status',
            ]);

            $table->index([
                'ppmp_id',
                'status',
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_requests'
        );
    }
};
