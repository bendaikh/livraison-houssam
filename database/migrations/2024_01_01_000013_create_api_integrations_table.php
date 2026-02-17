<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('api_integrations', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Shopify, Tawsilex, BMDelivery, etc.
            $table->string('type'); // shopify, delivery
            $table->string('provider')->nullable(); // tawsilex, bmdelivery, shopify
            $table->boolean('is_active')->default(true);
            $table->json('credentials'); // API keys, secrets, etc.
            $table->json('settings')->nullable();
            $table->timestamp('last_sync_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('api_integrations');
    }
};
