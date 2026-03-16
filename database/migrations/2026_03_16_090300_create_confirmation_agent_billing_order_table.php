<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('confirmation_agent_billing_order', function (Blueprint $table) {
            $table->id();
            $table->foreignId('confirmation_agent_billing_id')
                ->constrained(
                    table: 'confirmation_agent_billings',
                    indexName: 'cabo_billing_fk'
                )
                ->cascadeOnDelete();
            $table->foreignId('order_id')
                ->constrained(
                    table: 'orders',
                    indexName: 'cabo_order_fk'
                )
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['confirmation_agent_billing_id', 'order_id'],
                'confirmation_agent_billing_order_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmation_agent_billing_order');
    }
};
