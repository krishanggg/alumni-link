<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('alumni', 'current_occupation')) {
            return;
        }

        Schema::table('alumni', function (Blueprint $table) {
            $table->dropColumn('current_occupation');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('alumni', 'current_occupation')) {
            return;
        }

        Schema::table('alumni', function (Blueprint $table) {
            $table->string('current_occupation', 255)->nullable()->after('address');
        });
    }
};
