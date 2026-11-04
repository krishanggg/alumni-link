<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

// Redirect the homepage to the Admin Web.
Route::redirect('/', '/app/');

// Serve the React Admin Web.
Route::get('/app/{path?}', function () {
    return response()->file(public_path('app/index.html'));
})->where('path', '.*');