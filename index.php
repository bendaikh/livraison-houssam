<?php

/**
 * Laravel - A PHP Framework For Web Artisans
 *
 * This file serves as the entry point for the application when
 * deployed on shared hosting where the document root cannot be
 * changed to the /public directory.
 *
 * @package  Laravel
 */

// Define the path to the public directory
define('LARAVEL_PUBLIC_PATH', __DIR__ . '/public');

// Check if the request is for a file in the public directory
$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// If the request is for an existing file in public, serve it
if ($uri !== '/' && file_exists(LARAVEL_PUBLIC_PATH . $uri)) {
    // Check if it's a PHP file
    if (pathinfo($uri, PATHINFO_EXTENSION) === 'php') {
        require LARAVEL_PUBLIC_PATH . $uri;
        return;
    }
    
    // For static files, let the server handle them
    return false;
}

// Change to the public directory for proper asset resolution
chdir(LARAVEL_PUBLIC_PATH);

// Include the public/index.php
require_once LARAVEL_PUBLIC_PATH . '/index.php';
