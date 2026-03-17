<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_status_note')) {
                $table->text('delivery_status_note')->nullable()->after('notes');
            }

            if (!Schema::hasColumn('orders', 'collected_amount')) {
                $table->decimal('collected_amount', 10, 2)->nullable()->after('total');
            }

            if (!Schema::hasColumn('orders', 'delivery_person_commission')) {
                $table->decimal('delivery_person_commission', 10, 2)->nullable()->after('collected_amount');
            }

            if (!Schema::hasColumn('orders', 'amount_due_to_admin')) {
                $table->decimal('amount_due_to_admin', 10, 2)->nullable()->after('delivery_person_commission');
            }

            if (!Schema::hasColumn('orders', 'no_response_at')) {
                $table->timestamp('no_response_at')->nullable()->after('returned_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = collect([
                'delivery_status_note',
                'collected_amount',
                'delivery_person_commission',
                'amount_due_to_admin',
                'no_response_at',
            ])->filter(fn ($column) => Schema::hasColumn('orders', $column))->all();

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
