<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index(Request $request)
    {
        $group = $request->get('group');
        
        $query = Setting::query();
        
        if ($group) {
            $query->where('group', $group);
        }

        $settings = $query->get()->mapWithKeys(function ($setting) {
            return [$setting->key => Setting::get($setting->key)];
        });

        return response()->json($settings);
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
}
