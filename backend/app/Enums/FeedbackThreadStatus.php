<?php

declare(strict_types=1);

namespace App\Enums;

enum FeedbackThreadStatus: string
{
    case Open = 'open';
    case Resolved = 'resolved';
}
