<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blacklist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('phone_number');
            $table->string('normalized_phone')->unique();
            $table->text('reason');
            $table->enum('cancellation_timing', ['before_confirmation', 'after_confirmation']);
            $table->timestamps();

            $table->index('phone_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blacklist_entries');
    }
};
