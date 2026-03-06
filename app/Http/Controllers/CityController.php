<?php

namespace App\Http\Controllers;

use App\Models\ApiIntegration;
use App\Models\City;
use App\Services\BMDeliveryService;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index(Request $request)
    {
        if ($request->boolean('sync_sources')) {
            $this->syncCitiesFromSources();
        }

        $cities = City::orderBy('name')->get();
        return response()->json($cities);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name',
            'delivery_cost' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $validated['delivery_cost'] = $validated['delivery_cost'] ?? 0;
        $city = City::create($validated);
        return response()->json($city, 201);
    }

    public function show(City $city)
    {
        return response()->json($city);
    }

    public function update(Request $request, City $city)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name,' . $city->id,
            'delivery_cost' => 'nullable|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $validated['delivery_cost'] = $validated['delivery_cost'] ?? 0;
        $city->update($validated);
        return response()->json($city);
    }

    public function destroy(City $city)
    {
        $city->delete();
        return response()->json(['message' => 'City deleted successfully']);
    }

    public function syncFromSources()
    {
        $result = $this->syncCitiesFromSources();

        return response()->json([
            'message' => 'City sources synchronized successfully',
            'synced' => $result,
            'warnings' => $result['warnings'],
        ]);
    }

    private function syncCitiesFromSources(): array
    {
        $warnings = [];
        $sourceCities = [];

        // Source 1: curated Tawsilex list from cITIES.xlsx.
        $tawsilexCities = config('tawsilex_cities', []);
        foreach ($tawsilexCities as $city) {
            $normalized = $this->normalizeCityName($city);
            if ($normalized !== null) {
                $sourceCities[$normalized] = true;
            }
        }
        $tawsilexCount = count($sourceCities);

        // Source 2: BMDelivery API.
        $bmApiCitiesCount = 0;
        try {
            $bmIntegration = ApiIntegration::where('type', 'delivery')
                ->where('provider', 'bmdelivery')
                ->where('is_active', true)
                ->latest('id')
                ->first();

            if ($bmIntegration) {
                $apiToken = $bmIntegration->credentials['api_token']
                    ?? $bmIntegration->credentials['apiToken']
                    ?? $bmIntegration->credentials['token']
                    ?? null;

                if ($apiToken) {
                    $bmService = new BMDeliveryService();
                    $bmService->setApiToken($apiToken);
                    $bmCities = $bmService->listCities();

                    foreach ($bmCities as $city) {
                        $cityName = $this->extractCityName($city);
                        $normalized = $this->normalizeCityName($cityName);
                        if ($normalized !== null) {
                            $sourceCities[$normalized] = true;
                            $bmApiCitiesCount++;
                        }
                    }
                } else {
                    $warnings[] = 'BMDelivery integration found but API token is missing.';
                }
            } else {
                $warnings[] = 'No active BMDelivery integration found.';
            }
        } catch (\Throwable $e) {
            $warnings[] = 'BMDelivery cities sync failed: ' . $e->getMessage();
        }

        $created = 0;
        $existing = 0;

        foreach (array_keys($sourceCities) as $cityName) {
            $city = City::firstOrCreate(
                ['name' => $cityName],
                [
                    'delivery_cost' => 0,
                    'is_active' => true,
                ]
            );

            if ($city->wasRecentlyCreated) {
                $created++;
            } else {
                $existing++;
            }
        }

        return [
            'source_total' => count($sourceCities),
            'created' => $created,
            'already_existing' => $existing,
            'tawsilex_source_count' => $tawsilexCount,
            'bmdelivery_source_count' => $bmApiCitiesCount,
            'warnings' => $warnings,
        ];
    }

    private function extractCityName(mixed $city): ?string
    {
        if (is_string($city)) {
            return $city;
        }

        if (!is_array($city)) {
            return null;
        }

        return $city['name']
            ?? $city['ville']
            ?? $city['city']
            ?? $city['label']
            ?? $city['nom']
            ?? null;
    }

    private function normalizeCityName(?string $city): ?string
    {
        if ($city === null) {
            return null;
        }

        $normalized = trim(preg_replace('/\s+/', ' ', $city) ?? '');
        return $normalized !== '' ? $normalized : null;
    }
}
