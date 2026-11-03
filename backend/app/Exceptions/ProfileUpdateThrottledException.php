<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Thrown by AlumniService::updateSelfProfile() when a user exceeds the
 * self-service profile update rate limit. Rendered as a 429 with its own
 * wording so it survives the curated API error handler, which otherwise
 * reduces every Throwable to a generic message.
 */
class ProfileUpdateThrottledException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Too many updates. Please try again later.');
    }
}
