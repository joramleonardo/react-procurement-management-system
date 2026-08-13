<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'ppmp_attachments',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId('ppmp_id')
                    ->constrained('ppmps')
                    ->cascadeOnDelete();

                /*
                 * Nullable because some documents belong
                 * to the entire PPMP instead of one item.
                 */
                $table->foreignId('ppmp_item_id')
                    ->nullable()
                    ->constrained('ppmp_items')
                    ->cascadeOnDelete();

                /*
                 * supporting_document
                 * approved_ppmp
                 */
                $table->string(
                    'document_type',
                    50
                )->index();

                $table->string('original_name');

                $table->string('stored_name');

                $table->string('file_path');

                $table->string(
                    'mime_type',
                    100
                )->nullable();

                $table->unsignedBigInteger(
                    'file_size'
                )->nullable();

                $table->foreignId('uploaded_by')
                    ->constrained('users')
                    ->restrictOnDelete();

                $table->timestamps();
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'ppmp_attachments'
        );
    }
};
