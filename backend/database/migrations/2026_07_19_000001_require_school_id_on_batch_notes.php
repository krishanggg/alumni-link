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
        $unscopedNotes = DB::table('batch_notes')->whereNull('school_id')->get();
        $schoolIds = DB::table('schools')->pluck('id');

        if ($unscopedNotes->isNotEmpty() && $schoolIds->isEmpty()) {
            throw new RuntimeException('Cannot scope existing batch notes because no schools exist.');
        }

        foreach ($unscopedNotes as $unscopedNote) {
            foreach ($schoolIds as $schoolId) {
                $existingNote = DB::table('batch_notes')
                    ->where('graduation_year', $unscopedNote->graduation_year)
                    ->where('school_id', $schoolId)
                    ->first();

                if ($existingNote) {
                    $mergedNote = trim(implode("\n\n", array_filter([
                        $existingNote->note,
                        'Migrated all-schools note:',
                        $unscopedNote->note,
                    ], fn (?string $value): bool => filled($value))));

                    DB::table('batch_notes')->where('id', $existingNote->id)->update([
                        'note' => $mergedNote,
                        'updated_at' => now(),
                    ]);

                    continue;
                }

                DB::table('batch_notes')->insert([
                    'graduation_year' => $unscopedNote->graduation_year,
                    'school_id' => $schoolId,
                    'note' => $unscopedNote->note,
                    'created_by' => $unscopedNote->created_by,
                    'updated_by' => $unscopedNote->updated_by,
                    'created_at' => $unscopedNote->created_at,
                    'updated_at' => $unscopedNote->updated_at,
                ]);
            }

            DB::table('batch_notes')->where('id', $unscopedNote->id)->delete();
        }

        Schema::table('batch_notes', function (Blueprint $table): void {
            $table->dropForeign(['school_id']);
            $table->unsignedBigInteger('school_id')->nullable(false)->change();
            $table->foreign('school_id')->references('id')->on('schools')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('batch_notes', function (Blueprint $table): void {
            $table->dropForeign(['school_id']);
            $table->unsignedBigInteger('school_id')->nullable()->change();
            $table->foreign('school_id')->references('id')->on('schools')->nullOnDelete();
        });
    }
};
