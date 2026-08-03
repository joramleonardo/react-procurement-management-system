<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('login_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->string('login_identifier')->nullable();

            $table->string('event', 50)->index();

            $table->boolean('is_successful')
                ->default(false)
                ->index();

            $table->string('failure_reason', 100)->nullable();

            $table->ipAddress('ip_address')->nullable();

            $table->text('user_agent')->nullable();

            $table->string('session_id')
                ->nullable()
                ->index();

            $table->timestamp('occurred_at')
                ->useCurrent()
                ->index();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_logs');
    }
};
