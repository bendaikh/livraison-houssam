<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('confirmation_agent_id')->nullable()->after('delivery_agent_id')->constrained('users')->onDelete('set null');
            $table->string('whatsapp')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['confirmation_agent_id']);
            $table->dropColumn(['confirmation_agent_id', 'whatsapp']);
        });
    }
};
