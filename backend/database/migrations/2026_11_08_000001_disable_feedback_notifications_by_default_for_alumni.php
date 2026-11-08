<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('notification_preferences')) {
            // Alumni cannot access feedback threads, so this admin-only
            // preference should not be enabled on their existing records.
            DB::table('notification_preferences')
                ->join('users', 'users.id', '=', 'notification_preferences.user_id')
                ->where('users.role', 'alumni')
                ->update(['notification_preferences.feedback' => false]);
        }
    }

    public function down(): void
    {
        // Preserve preferences if this migration is rolled back.
    }
};
