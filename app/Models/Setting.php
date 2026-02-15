<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
    ];

    public static function get(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        return match($setting->type) {
            'json' => json_decode($setting->value, true),
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($setting->value) ? (float)$setting->value : $default,
            default => $setting->value,
        };
    }

    public static function set(string $key, $value, string $type = 'string', string $group = 'general')
    {
        $valueToStore = match($type) {
            'json' => json_encode($value),
            'boolean' => $value ? '1' : '0',
            default => (string)$value,
        };

        return static::updateOrCreate(
            ['key' => $key],
            ['value' => $valueToStore, 'type' => $type, 'group' => $group]
        );
    }
}
