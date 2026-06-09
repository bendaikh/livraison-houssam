<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                if (!Schema::hasColumn('orders', 'seller_invoice_status')) {
                    $table->string('seller_invoice_status', 20)->default('not_invoiced')->after('delivered_at');
                }
                if (!Schema::hasColumn('orders', 'confirmation_invoice_status')) {
                    $table->string('confirmation_invoice_status', 20)->default('not_invoiced')->after('seller_invoice_status');
                }
                if (!Schema::hasColumn('orders', 'delivery_invoice_status')) {
                    $table->string('delivery_invoice_status', 20)->default('not_invoiced')->after('confirmation_invoice_status');
                }
            });
        }

        foreach (['seller_billings', 'confirmation_agent_billings', 'delivery_person_billings'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (!Schema::hasColumn($tableName, 'invoice_number')) {
                    $table->string('invoice_number', 50)->nullable()->unique()->after('id');
                }
                if (!Schema::hasColumn($tableName, 'pdf_path')) {
                    $table->string('pdf_path')->nullable()->after('generated_at');
                }
            });
        }

        $this->backfillInvoicedStatuses();
    }

    public function down(): void
    {
        if (Schema::hasTable('orders')) {
            Schema::table('orders', function (Blueprint $table) {
                $columns = ['seller_invoice_status', 'confirmation_invoice_status', 'delivery_invoice_status'];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('orders', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        foreach (['seller_billings', 'confirmation_agent_billings', 'delivery_person_billings'] as $tableName) {
            if (!Schema::hasTable($tableName)) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (Schema::hasColumn($tableName, 'pdf_path')) {
                    $table->dropColumn('pdf_path');
                }
                if (Schema::hasColumn($tableName, 'invoice_number')) {
                    $table->dropColumn('invoice_number');
                }
            });
        }
    }

    private function backfillInvoicedStatuses(): void
    {
        if (!Schema::hasTable('orders')) {
            return;
        }

        if (Schema::hasTable('seller_billing_order') && Schema::hasTable('seller_billings')) {
            $orderIds = DB::table('seller_billing_order')
                ->join('seller_billings', 'seller_billings.id', '=', 'seller_billing_order.seller_billing_id')
                ->whereNotNull('seller_billings.generated_at')
                ->pluck('seller_billing_order.order_id');

            if ($orderIds->isNotEmpty()) {
                DB::table('orders')
                    ->whereIn('id', $orderIds)
                    ->update(['seller_invoice_status' => 'invoiced']);
            }
        }

        if (Schema::hasTable('confirmation_agent_billing_order') && Schema::hasTable('confirmation_agent_billings')) {
            $orderIds = DB::table('confirmation_agent_billing_order')
                ->join('confirmation_agent_billings', 'confirmation_agent_billings.id', '=', 'confirmation_agent_billing_order.confirmation_agent_billing_id')
                ->whereNotNull('confirmation_agent_billings.generated_at')
                ->pluck('confirmation_agent_billing_order.order_id');

            if ($orderIds->isNotEmpty()) {
                DB::table('orders')
                    ->whereIn('id', $orderIds)
                    ->update(['confirmation_invoice_status' => 'invoiced']);
            }
        }

        if (Schema::hasTable('delivery_person_billing_order') && Schema::hasTable('delivery_person_billings')) {
            $orderIds = DB::table('delivery_person_billing_order')
                ->join('delivery_person_billings', 'delivery_person_billings.id', '=', 'delivery_person_billing_order.delivery_person_billing_id')
                ->whereNotNull('delivery_person_billings.generated_at')
                ->pluck('delivery_person_billing_order.order_id');

            if ($orderIds->isNotEmpty()) {
                DB::table('orders')
                    ->whereIn('id', $orderIds)
                    ->update(['delivery_invoice_status' => 'invoiced']);
            }
        }
    }
};
