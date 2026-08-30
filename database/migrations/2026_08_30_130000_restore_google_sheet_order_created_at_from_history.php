<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Google Sheet imports used to overwrite orders.created_at with a sheet date
     * (often misparsed DD/MM as MM/DD). Restore the real app import timestamp
     * from the first "Order created" history row.
     */
    public function up(): void
    {
        // MySQL-specific UPDATE ... INNER JOIN syntax.
        if (DB::getDriverName() !== 'mysql') {
            return;
        }

        DB::statement("
            UPDATE orders
            INNER JOIN (
                SELECT oh.order_id, MIN(oh.created_at) AS imported_at
                FROM order_history oh
                WHERE oh.note = 'Order created'
                GROUP BY oh.order_id
            ) history ON history.order_id = orders.id
            SET orders.created_at = history.imported_at
            WHERE orders.source = 'google_sheet'
              AND orders.created_at <> history.imported_at
              AND (
                    TIME(orders.created_at) = '00:00:00'
                    OR orders.created_at > NOW()
                    OR DATE(orders.created_at) <> DATE(history.imported_at)
              )
        ");
    }

    public function down(): void
    {
        // Irreversible data correction.
    }
};
