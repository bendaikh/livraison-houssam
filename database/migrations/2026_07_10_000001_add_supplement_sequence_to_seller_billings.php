<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('seller_billings')) {
            return;
        }

        Schema::table('seller_billings', function (Blueprint $table) {
            if (!Schema::hasColumn('seller_billings', 'supplement_sequence')) {
                $table->unsignedSmallInteger('supplement_sequence')->default(0)->after('period_end');
            }
        });

        Schema::table('seller_billings', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
        });

        Schema::table('seller_billings', function (Blueprint $table) {
            $table->dropUnique('seller_billings_period_unique');
            $table->unique(
                ['vendor_id', 'period_start', 'period_end', 'supplement_sequence'],
                'seller_billings_period_supplement_unique'
            );
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('seller_billings')) {
            return;
        }

        Schema::table('seller_billings', function (Blueprint $table) {
            $table->dropForeign(['vendor_id']);
        });

        Schema::table('seller_billings', function (Blueprint $table) {
            $table->dropUnique('seller_billings_period_supplement_unique');
            $table->unique(['vendor_id', 'period_start', 'period_end'], 'seller_billings_period_unique');
            $table->foreign('vendor_id')->references('id')->on('vendors')->cascadeOnDelete();
        });

        Schema::table('seller_billings', function (Blueprint $table) {
            if (Schema::hasColumn('seller_billings', 'supplement_sequence')) {
                $table->dropColumn('supplement_sequence');
            }
        });
    }
};
