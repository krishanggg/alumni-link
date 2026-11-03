<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\BoundedCollection;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Support\Collection;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Keeps pagination fields flat (current_page, last_page, per_page, total)
     * to match the shape web/mobile clients expect. The default
     * `JsonResource::collection($paginator)->response()` nests pagination
     * metadata under `meta`, which the frontend does not read.
     */
    protected function paginatedResource(LengthAwarePaginator $paginator, string $resourceClass): array
    {
        return [
            'data' => $resourceClass::collection($paginator->getCollection())->toArray(request()),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }

    /**
     * Mirrors paginatedResource for the `?all=1` read mode: up to 1,000 rows the
     * caller could reach by paging, delivered in one response so the client can
     * sort and filter a bounded set locally. Scoping and field filtering are
     * unchanged — only the page limit is skipped. A look-ahead row marks a
     * response with `meta.truncated` when more rows were available.
     *
     * @param  Collection<int, mixed>  $items
     * @return array{data: array<int, mixed>, total: int, meta?: array{truncated: bool, limit: int}}
     */
    protected function collectionResource(Collection $items, string $resourceClass): array
    {
        $payload = [
            'data' => $resourceClass::collection($items)->toArray(request()),
            'total' => $items->count(),
        ];

        if ($items instanceof BoundedCollection && $items->wasTruncated()) {
            $payload['meta'] = [
                'truncated' => true,
                'limit' => $items->limit(),
            ];
        }

        return $payload;
    }
}
