<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
            'permission' => \App\Http\Middleware\CheckPermission::class,
            'auth.custom_api' => \App\Http\Middleware\AuthenticateCustomApi::class,
            'auth.sanctum_or_custom_api' => \App\Http\Middleware\AuthenticateSanctumOrCustomApi::class,
            'optional.custom_api' => \App\Http\Middleware\OptionalCustomApiAuth::class,
            'auth.api_or_sanctum' => \App\Http\Middleware\AuthenticateApiOrSanctum::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
