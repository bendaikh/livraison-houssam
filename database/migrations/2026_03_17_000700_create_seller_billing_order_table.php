<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('seller_billing_order')) {
            Schema::create('seller_billing_order', function (Blueprint $table) {
                $table->id();
                $table->foreignId('seller_billing_id')
                    ->constrained(
                        table: 'seller_billings',
                        indexName: 'sbo_billing_fk'
                    )
                    ->cascadeOnDelete();
                $table->foreignId('order_id')
                    ->constrained(
                        table: 'orders',
                        indexName: 'sbo_order_fk'
                    )
                    ->cascadeOnDelete();
                $table->timestamps();

                $table->unique(['seller_billing_id', 'order_id'], 'seller_billing_order_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_billing_order');
    }
};
