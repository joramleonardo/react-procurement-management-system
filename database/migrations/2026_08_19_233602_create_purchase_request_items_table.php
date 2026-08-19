<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create(
            'purchase_request_items',
            function (Blueprint $table) {
                $table->id();

                $table->foreignId(
                    'purchase_request_id'
                )
                    ->constrained(
                        'purchase_requests'
                    )
                    ->cascadeOnDelete();

                /*
                 * Connect every PR line to
                 * the approved PPMP item from
                 * which the budget originated.
                 */
                $table->foreignId(
                    'ppmp_item_id'
                )
                    ->constrained(
                        'ppmp_items'
                    )
                    ->restrictOnDelete();

                /*
                 * GAM Appendix 60 fields.
                 */
                $table->string(
                    'stock_property_no',
                    100
                )->nullable();

                $table->string(
                    'unit',
                    100
                )->nullable();

                $table->text(
                    'item_description'
                );

                /*
                 * Decimal allows quantities such
                 * as 1.5 lot / 2.5 kg if needed.
                 */
                $table->decimal(
                    'quantity',
                    15,
                    3
                )->default(1);

                $table->decimal(
                    'unit_cost',
                    15,
                    2
                )->default(0);

                /*
                 * quantity × unit_cost
                 *
                 * Computed by the backend.
                 */
                $table->decimal(
                    'total_cost',
                    15,
                    2
                )->default(0);

                $table->unsignedInteger(
                    'sort_order'
                )->default(1);

                $table->timestamps();

                $table->index([
                    'purchase_request_id',
                    'sort_order',
                ]);

                $table->index(
                    'ppmp_item_id'
                );
            }
        );
    }

    public function down(): void
    {
        Schema::dropIfExists(
            'purchase_request_items'
        );
    }
};
