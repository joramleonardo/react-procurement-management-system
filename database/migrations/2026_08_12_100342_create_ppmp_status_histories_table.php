<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'ppmp_status_histories',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId('ppmp_id')
                    ->constrained('ppmps')
                    ->cascadeOnDelete();

                $table->string(
                    'from_status',
                    40
                )->nullable();

                $table->string(
                    'to_status',
                    40
                );

                /*
                 * create
                 * submit
                 * return_for_revision
                 * resubmit
                 * approve
                 */
                $table->string(
                    'action',
                    50
                );

                $table->text('remarks')->nullable();

                $table->foreignId('action_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamp(
                    'acted_at'
                )->useCurrent();

                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'ppmp_status_histories'
        );
    }
};
