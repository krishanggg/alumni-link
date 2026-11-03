<?php

declare(strict_types=1);

namespace App\Enums;

enum ReportVisibility: string
{
    case AdminOnly = 'admin_only';
    case Published = 'published';
}
