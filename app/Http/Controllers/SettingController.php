<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    private const SHARED_SETTING_KEYS = [
        'app_name',
        'app_description',
        'currency_symbol',
        'currency_code',
        'currency_position',
        'currency_decimals',
        'currency_decimal_separator',
        'currency_thousand_separator',
        'order_fulfillment_cost',
    ];

    public function appSettings()
    {
        return response()->json($this->resolveSettings(self::SHARED_SETTING_KEYS));
    }

    public function index(Request $request)
    {
        $group = $request->get('group');

        $query = Setting::query();

        if ($group) {
            $query->where('group', $group);
        }

        return response()->json($this->resolveSettings($query->pluck('key')->all()));
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'settings' => 'required|array',
        ]);

        foreach ($validated['settings'] as $key => $value) {
            $type = is_array($value) ? 'json' : (is_bool($value) ? 'boolean' : (is_numeric($value) ? 'number' : 'string'));
            $group = explode('_', $key)[0] ?? 'general';
            
            Setting::set($key, $value, $type, $group);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function get(string $key)
    {
        $value = Setting::get($key);
        return response()->json(['key' => $key, 'value' => $value]);
    }

    private function resolveSettings(array $keys): array
    {
        return Setting::query()
            ->whereIn('key', $keys)
            ->get()
            ->mapWithKeys(function ($setting) {
                return [$setting->key => Setting::get($setting->key)];
            })
            ->all();
    }
}
