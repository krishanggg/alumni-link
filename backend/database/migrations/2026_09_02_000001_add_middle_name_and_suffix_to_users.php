<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registration now collects the applicant's middle name and suffix so the
     * alumni record created at approval time carries the full legal name
     * without an admin having to re-key it. Columns mirror the `alumni` table's
     * sizes (middle_name 100, suffix 20) and stay nullable — required-ness is a
     * registration-form concern, and admin-created users never use that form.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('middle_name', 100)->nullable()->after('first_name');
            $table->string('suffix', 20)->nullable()->after('last_name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['middle_name', 'suffix']);
        });
    }
};
