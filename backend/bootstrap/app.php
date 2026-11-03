<?php

declare(strict_types=1);

use App\Exceptions\BusinessRuleException;
use App\Exceptions\ProfileUpdateThrottledException;
use App\Http\Middleware\AdminOrApprovedAlumniMiddleware;
use App\Http\Middleware\AdminSurfaceMiddleware;
use App\Http\Middleware\ApprovedAlumniMiddleware;
use App\Http\Middleware\CheckRememberToken;
use App\Http\Middleware\SuperAdminMiddleware;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->encryptCookies(except: ['remember_token']);

        $middleware->appendToGroup('api', CheckRememberToken::class);

        // Laravel sorts `auth:sanctum` (an AuthenticatesRequests implementation)
        // ahead of unlisted middleware, so without an explicit priority the auth
        // check 401s before the remember-me cookie is ever examined and
        // auto-login silently never happens. Pin it to run just before auth.
        $middleware->prependToPriorityList(
            AuthenticatesRequests::class,
            CheckRememberToken::class,
        );

        $middleware->alias([
            'role.admin' => AdminSurfaceMiddleware::class,
            'role.super_admin' => SuperAdminMiddleware::class,
            'role.alumni.approved' => ApprovedAlumniMiddleware::class,
            'role.admin.or.alumni.approved' => AdminOrApprovedAlumniMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // API responses must never leak backend internals (validation-summary
        // wording, exception messages, class names, file paths, stack traces,
        // etc.) to the client, regardless of APP_DEBUG. Every exception on an
        // api/* route is rendered through one of these curated callbacks, so
        // none of them ever fall through to Laravel's default debug-mode
        // rendering.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Please correct the highlighted fields and try again.',
                'errors' => $e->errors(),
            ], $e->status);
        });

        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json([
                'message' => 'Please log in to continue.',
            ], 401);
        });

        $exceptions->render(function (ProfileUpdateThrottledException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(['message' => $e->getMessage()], 429);
        });

        $exceptions->render(function (BusinessRuleException $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            return response()->json(['message' => $e->getMessage()], $e->status());
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')) {
                return null;
            }

            $status = $e instanceof HttpExceptionInterface ? $e->getStatusCode() : 500;

            $message = match (true) {
                $status === 403 => 'You do not have permission to perform this action.',
                $status === 404 => 'The requested resource could not be found.',
                $status === 405 => 'This action is not supported.',
                $status === 419 => 'Your session has expired. Please refresh and try again.',
                $status === 429 => 'Too many requests. Please try again later.',
                default => 'Something went wrong on our end. Please try again later.',
            };

            return response()->json(['message' => $message], $status);
        });
    })->create();
