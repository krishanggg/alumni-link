<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ChecksApprovedAlumniEligibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApprovedAlumniMiddleware
{
    use ChecksApprovedAlumniEligibility;

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $eligibilityFailure = $this->approvedAlumniEligibilityFailure($user);

        if ($eligibilityFailure === 'not_approved_alumni') {
            return response()->json(['message' => 'Forbidden. Approved alumni access required.'], Response::HTTP_FORBIDDEN);
        }

        // Every route behind this middleware is about the requester's own
        // alumni experience (own dashboard, own profile, targeted
        // announcements, published reports) rather than browsing other
        // alumni, so it's the right place to require a completed profile.
        // Shared-browsing endpoints (directory/search/batches) use the same
        // eligibility helper, so profile-incomplete and archived alumni
        // cannot bypass this access boundary through a different route group.
        if ($eligibilityFailure === 'profile_incomplete') {
            return response()->json(['message' => 'Please complete your alumni profile before continuing.'], Response::HTTP_FORBIDDEN);
        }

        // An admin can archive an alumni record while its owner is still signed
        // in. That leaves `alumni_id` pointing at a soft-deleted row, so the
        // column check above passes even though there is no longer an active
        // record behind it. Treat that alumnus as deactivated rather than let
        // them keep serving their own dashboard/feed — a restore re-enables it.
        if ($eligibilityFailure === 'archived') {
            return response()->json(['message' => 'Your alumni record has been archived. Please contact your school administrator.'], Response::HTTP_FORBIDDEN);
        }

        if ($eligibilityFailure === 'inactive') {
            return response()->json(['message' => 'Your account has been deactivated. Please contact your school administrator.'], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
