<?php

declare(strict_types=1);

namespace App\Enums;

enum AnnouncementType: string
{
    case Event = 'event';
    case General = 'general';
    case Closure = 'closure';
}
