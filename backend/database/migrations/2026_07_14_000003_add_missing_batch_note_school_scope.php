<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('batch_notes', 'school_id')) {
            return;
        }

        Schema::table('batch_notes', function (Blueprint $table): void {
            $table->unsignedBigInteger('school_id')->nullable()->after('graduation_year');
            $table->index('school_id', 'batch_notes_school_id_idx');
        });
    }

    public function down(): void
    {
        // Preserving scoped notes is safer than dropping the assignment on rollback.
    }
};
