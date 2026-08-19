<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_request_attachments',
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
                    'document_type',
                    50
                )->index();

                $table->string(
                    'original_name'
                );

                $table->string(
                    'stored_name'
                );

                $table->string(
                    'file_path'
                );

                $table->string(
                    'mime_type',
                    150
                )->nullable();

                $table->unsignedBigInteger(
                    'file_size'
                )->nullable();

                $table->foreignId(
                    'uploaded_by'
                )
                    ->constrained(
                        'users'
                    )
                    ->restrictOnDelete();

                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_request_attachments'
        );
    }
};
