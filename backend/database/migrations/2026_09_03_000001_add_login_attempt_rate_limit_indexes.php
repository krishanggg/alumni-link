<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('login_attempts', function (Blueprint $table): void {
            $table->index(
                ['email', 'ip_address', 'attempted_at'],
                'login_attempts_email_ip_attempted_at_idx',
            );
            $table->index(
                ['ip_address', 'attempted_at'],
                'login_attempts_ip_attempted_at_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('login_attempts', function (Blueprint $table): void {
            $table->dropIndex('login_attempts_email_ip_attempted_at_idx');
            $table->dropIndex('login_attempts_ip_attempted_at_idx');
        });
    }
};
