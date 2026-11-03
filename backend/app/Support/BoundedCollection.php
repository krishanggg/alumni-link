<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Collection;

final class BoundedCollection extends Collection
{
    public function __construct(
        array $items = [],
        private readonly bool $truncated = false,
        private readonly int $limit = Pagination::MAX_ALL_ROWS,
    ) {
        parent::__construct($items);
    }

    public function wasTruncated(): bool
    {
        return $this->truncated;
    }

    public function limit(): int
    {
        return $this->limit;
    }
}
