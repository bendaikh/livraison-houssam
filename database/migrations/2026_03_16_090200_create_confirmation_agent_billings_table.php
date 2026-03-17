<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('confirmation_agent_billings')) {
            Schema::create('confirmation_agent_billings', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->date('period_start');
                $table->date('period_end');
                $table->unsignedInteger('delivered_orders_count')->default(0);
                $table->decimal('commission_per_order', 10, 2)->default(0);
                $table->decimal('total_amount', 10, 2)->default(0);
                $table->timestamp('generated_at')->nullable();
                $table->timestamp('paid_at')->nullable();
                $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->unique(['user_id', 'period_start', 'period_end'], 'confirmation_agent_billings_period_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('confirmation_agent_billings');
    }
};
