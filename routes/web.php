<?php

use Illuminate\Support\Facades\Route;

// All routes handled by React Router
Route::get('/{any}', function () {
    return view('app');
})->where('any', '.*');
