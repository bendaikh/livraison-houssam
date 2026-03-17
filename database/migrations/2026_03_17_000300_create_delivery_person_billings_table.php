<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_person_billings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_person_id')->constrained('users')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedInteger('total_orders')->default(0);
            $table->decimal('total_collected', 10, 2)->default(0);
            $table->decimal('total_commission', 10, 2)->default(0);
            $table->decimal('total_due_to_admin', 10, 2)->default(0);
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->foreignId('paid_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(
                ['delivery_person_id', 'period_start', 'period_end'],
                'delivery_person_billings_period_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_person_billings');
    }
};
