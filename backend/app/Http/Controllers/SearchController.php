<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Search\AdminSuggestRequest;
use App\Http\Requests\Search\DirectorySuggestRequest;
use App\Http\Requests\Search\SearchAlumniRequest;
use App\Http\Resources\AlumniListResource;
use App\Http\Resources\DirectoryResource;
use App\Models\Alumni;
use App\Services\SearchService;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __construct(
        private readonly SearchService $searchService,
    ) {}

    public function admin(SearchAlumniRequest $request): JsonResponse
    {
        $this->authorize('searchAdmin', Alumni::class);

        $results = $this->searchService->admin($request->all(), $request->user());

        return response()->json(
            $results instanceof LengthAwarePaginator
                ? $this->paginatedResource($results, AlumniListResource::class)
                : $this->collectionResource($results, AlumniListResource::class),
        );
    }

    public function directory(SearchAlumniRequest $request): JsonResponse
    {
        $this->authorize('searchDirectory', Alumni::class);

        $results = $this->searchService->directory($request->all(), $request->user());

        return response()->json($this->paginatedResource($results, DirectoryResource::class));
    }

    public function adminSuggest(AdminSuggestRequest $request): JsonResponse
    {
        $this->authorize('suggestAdmin', Alumni::class);

        $suggestions = $this->searchService->adminSuggest($request->validated('q'), $request->boolean('unlinked_only'), $request->user());

        return response()->json(['data' => $suggestions]);
    }

    public function directorySuggest(DirectorySuggestRequest $request): JsonResponse
    {
        $this->authorize('suggestDirectory', Alumni::class);

        $suggestions = $this->searchService->directorySuggest($request->validated('q'), $request->user());

        return response()->json(['data' => $suggestions]);
    }

    public function filters(Request $request): JsonResponse
    {
        $this->authorize('viewFilters', Alumni::class);

        return response()->json($this->searchService->filters($request->all(), $request->user()));
    }
}
