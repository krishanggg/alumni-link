<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->string('filename', 255);
            $table->string('file_path', 255);
            $table->unsignedBigInteger('file_size');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index('created_at', 'backups_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backups');
    }
};
