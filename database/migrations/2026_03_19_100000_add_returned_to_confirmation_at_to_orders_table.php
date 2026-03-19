<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'returned_to_confirmation_at')) {
                $table->timestamp('returned_to_confirmation_at')->nullable()->after('delivery_status_note');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'returned_to_confirmation_at')) {
                $table->dropColumn('returned_to_confirmation_at');
            }
        });
    }
};
