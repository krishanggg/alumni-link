<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreign('alumni_id')->references('id')->on('alumni')->onDelete('set null');
            $table->unique('alumni_id', 'users_alumni_id_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['alumni_id']);
            $table->dropUnique('users_alumni_id_unique');
        });
    }
};
