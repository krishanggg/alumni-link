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
        Schema::create('alumni', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id')->nullable();
            $table->string('student_id', 50)->nullable()->unique();
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            $table->string('suffix', 20)->nullable();
            $table->enum('gender', ['male', 'female'])->nullable();
            $table->date('birthdate')->nullable();
            $table->year('graduation_year');
            $table->string('section_strand', 100)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->string('contact_email', 255)->nullable();
            $table->text('address')->nullable();
            $table->enum('privacy', ['public', 'private'])->default('public');
            $table->string('profile_photo', 255)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamp('deleted_at')->nullable();
            $table->timestamps();

            $table->index('graduation_year', 'alumni_graduation_year_idx');
            $table->index(['school_id', 'graduation_year'], 'alumni_school_year_idx');
            $table->index(['last_name', 'first_name'], 'alumni_name_idx');
            $table->index('privacy', 'alumni_privacy_idx');
            $table->index('deleted_at', 'alumni_deleted_at_idx');
            if (DB::getDriverName() === 'mysql') {
                $table->fullText(['first_name', 'middle_name', 'last_name'], 'alumni_name_fulltext');
            }

            $table->foreign('school_id')->references('id')->on('schools')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alumni');
    }
};
