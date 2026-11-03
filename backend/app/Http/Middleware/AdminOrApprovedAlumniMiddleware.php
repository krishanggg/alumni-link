<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Http\Middleware\Concerns\ChecksApprovedAlumniEligibility;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminOrApprovedAlumniMiddleware
{
    use ChecksApprovedAlumniEligibility;

    /**
     * Directory and other browse-style endpoints are available to both admins
     * (unrestricted) and approved alumni (privacy-filtered) per spec, unlike
     * ApprovedAlumniMiddleware which is alumni-only.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $isAdmin = $user?->isAdmin() ?? false;
        $isApprovedAlumni = $this->approvedAlumniEligibilityFailure($user) === null;

        if (! $isAdmin && ! $isApprovedAlumni) {
            return response()->json(['message' => 'Forbidden. Admin or approved alumni access required.'], Response::HTTP_FORBIDDEN);
        }

        return $next($request);
    }
}
