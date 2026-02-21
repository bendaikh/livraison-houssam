<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Make product_id nullable to support Shopify orders with unknown products
            $table->foreignId('product_id')->nullable()->change();
            
            // Add fields to store product information from Shopify
            $table->string('product_name')->nullable()->after('product_id');
            $table->string('sku')->nullable()->after('product_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            // Remove the added columns
            $table->dropColumn(['product_name', 'sku']);
            
            // Make product_id required again
            $table->foreignId('product_id')->nullable(false)->change();
        });
    }
};
