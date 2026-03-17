<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BlacklistEntry extends Model
{
    protected $fillable = [
        'phone_number',
        'normalized_phone',
        'reason',
        'cancellation_timing',
    ];

    public static function normalizePhone(?string $phoneNumber): string
    {
        return preg_replace('/\D+/', '', (string) $phoneNumber) ?? '';
    }

    protected static function booted(): void
    {
        static::saving(function (BlacklistEntry $entry) {
            $entry->normalized_phone = self::normalizePhone($entry->phone_number);
        });
    }
}
