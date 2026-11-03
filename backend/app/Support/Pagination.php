<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

final class Pagination
{
    public const MAX_PER_PAGE = 100;

    public const MAX_ALL_ROWS = 1000;

    public static function clampPerPage(int|string|null $value, int $default = 15, int $max = self::MAX_PER_PAGE): int
    {
        return min(max((int) ($value ?? $default), 1), $max);
    }

    /**
     * Fetches one look-ahead row to detect truncation while returning no more
     * than the configured all-mode bound to callers.
     */
    public static function boundedAll(Builder $query, int $limit = self::MAX_ALL_ROWS): BoundedCollection
    {
        $items = $query->limit($limit + 1)->get();

        return new BoundedCollection(
            $items->take($limit)->all(),
            $items->count() > $limit,
            $limit,
        );
    }
}
