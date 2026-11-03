<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->string('employment_status', 30)->nullable()->after('address');
            $table->string('company_name')->nullable()->after('employment_status');
            $table->string('position_in_company')->nullable()->after('company_name');
        });
    }

    public function down(): void
    {
        Schema::table('alumni', function (Blueprint $table) {
            $table->dropColumn(['employment_status', 'company_name', 'position_in_company']);
        });
    }
};
