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
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('super_admin', 'school_admin', 'alumni') NULL DEFAULT NULL");
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('role', ['super_admin', 'school_admin', 'alumni'])->nullable()->default(null)->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('users')->whereNull('role')->update(['role' => 'alumni']);

        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE users MODIFY role ENUM('super_admin', 'school_admin', 'alumni') NOT NULL DEFAULT 'alumni'");
        } else {
            Schema::table('users', function (Blueprint $table) {
                $table->enum('role', ['super_admin', 'school_admin', 'alumni'])->default('alumni')->nullable(false)->change();
            });
        }
    }
};
