<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_person_billing_order', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_person_billing_id')
                ->constrained(
                    table: 'delivery_person_billings',
                    indexName: 'dpbo_billing_fk'
                )
                ->cascadeOnDelete();
            $table->foreignId('order_id')
                ->constrained(
                    table: 'orders',
                    indexName: 'dpbo_order_fk'
                )
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['delivery_person_billing_id', 'order_id'],
                'delivery_person_billing_order_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_person_billing_order');
    }
};
