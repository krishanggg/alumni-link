<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\School\StoreSchoolRequest;
use App\Http\Requests\School\UpdateSchoolRequest;
use App\Http\Requests\School\UploadSchoolLogoRequest;
use App\Http\Resources\SchoolResource;
use App\Models\ActivityLog;
use App\Models\School;
use App\Services\SchoolService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SchoolController extends Controller
{
    public function __construct(
        private readonly SchoolService $schoolService,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', School::class);

        $schools = School::orderBy('name')->get();

        return response()->json(['data' => SchoolResource::collection($schools)]);
    }

    public function active(): JsonResponse
    {
        $schools = School::where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json(['schools' => $schools]);
    }

    public function store(StoreSchoolRequest $request): JsonResponse
    {
        $this->authorize('create', School::class);

        $school = $this->schoolService->create($request->validated());

        ActivityLog::log(
            $request->user()?->id,
            'school.created',
            School::class,
            $school->id,
            "School '{$school->name}' created",
            null,
            $request->ip(),
        );

        return response()->json(new SchoolResource($school), 201);
    }

    public function show(School $school): JsonResponse
    {
        $this->authorize('view', $school);

        return response()->json(new SchoolResource($school));
    }

    public function update(UpdateSchoolRequest $request, School $school): JsonResponse
    {
        $this->authorize('update', $school);

        $school = $this->schoolService->update($school, $request->validated());

        ActivityLog::log(
            $request->user()?->id,
            'school.updated',
            School::class,
            $school->id,
            "School '{$school->name}' updated",
            null,
            $request->ip(),
        );

        return response()->json(new SchoolResource($school));
    }

    public function toggleStatus(Request $request, School $school): JsonResponse
    {
        $this->authorize('update', $school);

        $school = $this->schoolService->toggleStatus($school);

        $action = $school->is_active ? 'school.activated' : 'school.deactivated';
        $desc = $school->is_active
            ? "School '{$school->name}' activated"
            : "School '{$school->name}' deactivated";

        ActivityLog::log(
            $request->user()?->id,
            $action,
            School::class,
            $school->id,
            $desc,
            null,
            $request->ip(),
        );

        return response()->json(new SchoolResource($school));
    }

    public function destroy(Request $request, School $school): JsonResponse
    {
        $this->authorize('delete', $school);

        $name = $school->name;
        $schoolId = $school->id;

        $this->schoolService->delete($school);

        ActivityLog::log(
            $request->user()?->id,
            'school.deleted',
            School::class,
            $schoolId,
            "School '{$name}' deleted",
            null,
            $request->ip(),
        );

        return response()->json(['message' => 'School deleted successfully.']);
    }

    public function uploadLogo(UploadSchoolLogoRequest $request, School $school): JsonResponse
    {
        $this->authorize('update', $school);

        $school = $this->schoolService->uploadLogo($school, $request->file('logo'));

        ActivityLog::log(
            $request->user()?->id,
            'school.logo_updated',
            School::class,
            $school->id,
            "School '{$school->name}' logo updated",
            null,
            $request->ip(),
        );

        return response()->json(new SchoolResource($school));
    }
}
