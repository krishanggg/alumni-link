<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->boolean('administrative_notices')->default(true);
        });

        // This option is only relevant to administrators.
        DB::table('notification_preferences')
            ->join('users', 'users.id', '=', 'notification_preferences.user_id')
            ->where('users.role', 'alumni')
            ->update(['notification_preferences.administrative_notices' => false]);
    }

    public function down(): void
    {
        Schema::table('notification_preferences', function (Blueprint $table) {
            $table->dropColumn('administrative_notices');
        });
    }
};
