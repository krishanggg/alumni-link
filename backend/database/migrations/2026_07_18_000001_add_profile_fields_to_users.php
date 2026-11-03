<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Registration collects gender/birthdate/address up front so the alumni
     * record created at approval time has them for the dashboard's gender
     * chart, which reads `alumni.gender`. Columns stay nullable here —
     * required-ness is a registration-form concern, and admin-created users
     * never go through that form.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('gender', ['male', 'female'])->nullable()->after('section_strand');
            $table->date('birthdate')->nullable()->after('gender');
            $table->text('address')->nullable()->after('birthdate');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['gender', 'birthdate', 'address']);
        });
    }
};
