<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('seller_billings')) {
            Schema::create('seller_billings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('vendor_id')->constrained('vendors')->cascadeOnDelete();
                $table->date('period_start');
                $table->date('period_end');
                $table->string('billing_frequency')->default('weekly');
                $table->unsignedInteger('delivered_orders_count')->default(0);
                $table->decimal('gross_sales', 10, 2)->default(0);
                $table->decimal('commission_amount', 10, 2)->default(0);
                $table->decimal('net_amount', 10, 2)->default(0);
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(['vendor_id', 'period_start', 'period_end'], 'seller_billings_period_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('seller_billings');
    }
};
