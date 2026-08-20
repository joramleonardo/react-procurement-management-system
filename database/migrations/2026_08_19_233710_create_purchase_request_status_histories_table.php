<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_request_status_histories',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId(
                    'purchase_request_id'
                )
                    ->constrained(
                        'purchase_requests'
                    )
                    ->cascadeOnDelete();

                $table->string(
                    'from_status',
                    40
                )->nullable();

                $table->string(
                    'to_status',
                    40
                );

                $table->string(
                    'action',
                    50
                );

                $table->text(
                    'remarks'
                )->nullable();

                $table->foreignId(
                    'action_by'
                )
                    ->constrained(
                        'users'
                    )
                    ->restrictOnDelete();

                $table->timestamp(
                    'acted_at'
                )->useCurrent();

                $table->timestamps();

                $table->index(
                    [
                        'purchase_request_id',
                        'acted_at',
                    ],
                    'pr_status_history_pr_acted_idx'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_request_status_histories'
        );
    }
};
