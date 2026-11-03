<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Business-rule failure raised from a Service class (e.g. "this record is
 * already linked", "a graduation year is required") that needs to reach the
 * client as a specific message + HTTP status, rather than the generic
 * per-status wording the curated API exception handler otherwise applies.
 */
class BusinessRuleException extends RuntimeException
{
    public function __construct(string $message, private readonly int $status)
    {
        parent::__construct($message);
    }

    public function status(): int
    {
        return $this->status;
    }
}
