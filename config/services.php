<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google_sheets' => [
        'api_key' => env('GOOGLE_SHEETS_API_KEY'),
    ],

    'bmdelivery' => [
        'base_url' => env('BMDELIVERY_BASE_URL', 'https://bmdelivery.ma/api'),
        'timeout' => env('BMDELIVERY_TIMEOUT', 20),
        'connect_timeout' => env('BMDELIVERY_CONNECT_TIMEOUT', 10),
        'retry_times' => env('BMDELIVERY_RETRY_TIMES', 2),
        'retry_sleep_ms' => env('BMDELIVERY_RETRY_SLEEP_MS', 400),
        'force_http1' => env('BMDELIVERY_FORCE_HTTP1', true),
        'force_tls12' => env('BMDELIVERY_FORCE_TLS12', true),
    ],

];
