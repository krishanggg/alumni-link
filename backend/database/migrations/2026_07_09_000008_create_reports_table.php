<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->string('report_type', 50);
            $table->string('title', 255);
            $table->json('filters')->nullable();
            $table->enum('format', ['pdf', 'xlsx', 'csv'])->default('pdf');
            $table->enum('visibility', ['admin_only', 'published'])->default('admin_only');
            $table->enum('lifecycle_status', ['active', 'archived'])->default('active');
            $table->unsignedBigInteger('school_id')->nullable();
            $table->string('file_path', 255)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->unsignedBigInteger('generated_by')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();

            $table->foreign('school_id')->references('id')->on('schools')->onDelete('set null');
            $table->foreign('generated_by')->references('id')->on('users')->onDelete('set null');
            $table->index('report_type', 'reports_type_idx');
            $table->index(['visibility', 'lifecycle_status'], 'reports_visibility_status_idx');
            $table->index('school_id', 'reports_school_idx');
            $table->index('created_at', 'reports_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
