<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiImportLog extends Model
{
    protected $fillable = [
        'api_integration_id',
        'status',
        'total_records',
        'successful_records',
        'failed_records',
        'errors',
        'message',
    ];

    protected $casts = [
        'errors' => 'array',
    ];

    public function apiIntegration(): BelongsTo
    {
        return $this->belongsTo(ApiIntegration::class);
    }
}
