<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('batch_notes', function (Blueprint $table) {
            $table->id();
            $table->year('graduation_year');
            $table->foreignId('school_id')->nullable()->constrained()->nullOnDelete();
            $table->text('note')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['graduation_year', 'school_id'], 'batch_notes_school_year_unique');
            $table->index('graduation_year', 'batch_notes_year_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batch_notes');
    }
};
