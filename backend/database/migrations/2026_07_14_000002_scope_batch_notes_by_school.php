<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('batch_notes', 'school_id')) {
            return;
        }

        if (DB::getDriverName() === 'mysql') {
            DB::statement('ALTER TABLE batch_notes DROP INDEX batch_notes_graduation_year_unique');
            DB::statement('ALTER TABLE batch_notes ADD school_id BIGINT UNSIGNED NULL AFTER graduation_year');
            DB::statement('ALTER TABLE batch_notes ADD CONSTRAINT batch_notes_school_id_foreign FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE SET NULL');
            DB::statement('ALTER TABLE batch_notes ADD UNIQUE batch_notes_school_year_unique (graduation_year, school_id)');
        }
    }

    public function down(): void
    {
        // Existing installations retain the scoped notes during rollback to avoid data loss.
    }
};
