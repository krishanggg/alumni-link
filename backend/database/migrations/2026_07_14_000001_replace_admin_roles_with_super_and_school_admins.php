<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'super_admin', 'school_admin', 'alumni') NOT NULL DEFAULT 'alumni'");
        }

        DB::table('users')->where('role', 'admin')->update(['role' => 'super_admin']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('super_admin', 'school_admin', 'alumni') NOT NULL DEFAULT 'alumni'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'super_admin', 'school_admin', 'alumni') NOT NULL DEFAULT 'alumni'");
        }

        DB::table('users')->where('role', 'super_admin')->update(['role' => 'admin']);
        DB::table('users')->where('role', 'school_admin')->update(['role' => 'alumni']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('admin', 'alumni') NOT NULL DEFAULT 'alumni'");
        }
    }
};
