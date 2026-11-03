<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `users` becomes login/access-only. Every personal/identity field now
     * lives exclusively on `alumni` (linked via `users.alumni_id`, present
     * from registration onward as a provisional row). There is no production
     * data to preserve — a fresh deploy resets any in-flight
     * pending/rejected registrations, which is an accepted tradeoff for this
     * change (see architectural plan).
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'first_name', 'middle_name', 'last_name', 'suffix',
                'gender', 'birthdate', 'graduation_year', 'section_strand',
                'address', 'student_id', 'contact_number',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 255)->nullable()->after('id');
            $table->string('middle_name', 100)->nullable()->after('first_name');
            $table->string('last_name', 255)->nullable()->after('middle_name');
            $table->string('suffix', 20)->nullable()->after('last_name');
            $table->string('section_strand', 100)->nullable();
            $table->string('student_id', 50)->nullable()->after('section_strand');
            $table->string('contact_number', 20)->nullable()->after('student_id');
            $table->enum('gender', ['male', 'female'])->nullable()->after('section_strand');
            $table->date('birthdate')->nullable()->after('gender');
            $table->text('address')->nullable()->after('birthdate');
            $table->year('graduation_year')->nullable();
        });
    }
};
