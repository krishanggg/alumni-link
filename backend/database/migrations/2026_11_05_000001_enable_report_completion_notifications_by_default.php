<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_preferences')) {
            // Existing rows inherited the old false default and therefore
            // never received report completion alerts by default.
            DB::table('notification_preferences')
                ->where('report_completion', false)
                ->update(['report_completion' => true]);
        }
    }

    public function down(): void
    {
        // Preserve preferences if this migration is rolled back.
    }
};
