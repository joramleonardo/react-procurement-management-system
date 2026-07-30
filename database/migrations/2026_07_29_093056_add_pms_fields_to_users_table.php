<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('employee_id', 50)
                ->nullable()
                ->unique();

            $table->string('username', 100)
                ->nullable()
                ->unique();

            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('last_name')->nullable();
            $table->string('suffix', 20)->nullable();

            $table->foreignId('office_id')
                ->nullable()
                ->constrained('offices')
                ->nullOnDelete();

            $table->string('position_title', 150)->nullable();

            $table->string('status', 20)
                ->default('active')
                ->index();

            $table->string('auth_source', 20)
                ->default('local')
                ->index();

            $table->boolean('must_change_password')
                ->default(false);

            $table->timestamp('password_changed_at')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->string('last_login_ip', 45)->nullable();
            $table->timestamp('locked_until')->nullable();

            $table->foreignId('created_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();

            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('office_id');
            $table->dropConstrainedForeignId('created_by');
            $table->dropConstrainedForeignId('updated_by');

            $table->dropUnique(['employee_id']);
            $table->dropUnique(['username']);

            $table->dropColumn([
                'employee_id',
                'username',
                'first_name',
                'middle_name',
                'last_name',
                'suffix',
                'position_title',
                'status',
                'auth_source',
                'must_change_password',
                'password_changed_at',
                'last_login_at',
                'last_login_ip',
                'locked_until',
            ]);

            $table->dropSoftDeletes();
        });
    }
};
