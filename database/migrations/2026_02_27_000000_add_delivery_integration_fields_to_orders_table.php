<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_integration_id')->nullable()->after('delivery_agent_id')->constrained('api_integrations')->onDelete('set null');
            $table->string('delivery_tracking_code')->nullable()->after('external_order_id');
            $table->string('delivery_status')->nullable()->after('delivery_tracking_code');
            $table->timestamp('sent_to_delivery_at')->nullable()->after('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['delivery_integration_id']);
            $table->dropColumn(['delivery_integration_id', 'delivery_tracking_code', 'delivery_status', 'sent_to_delivery_at']);
        });
    }
};
