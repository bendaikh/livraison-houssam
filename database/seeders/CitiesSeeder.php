<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitiesSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $cities = [];

        // Seed full curated list (from cITIES.xlsx).
        foreach (config('tawsilex_cities', []) as $name) {
            $normalizedName = trim((string) $name);
            if ($normalizedName !== '') {
                $cities[$normalizedName] = [
                    'name' => $normalizedName,
                    'delivery_cost' => 0.00,
                    'is_active' => true,
                ];
            }
        }

        // Set preferred defaults for key cities.
        $defaultCitiesWithCosts = [
            ['name' => 'Casablanca', 'delivery_cost' => 50.00, 'is_active' => true],
            ['name' => 'Rabat', 'delivery_cost' => 45.00, 'is_active' => true],
            ['name' => 'Fes', 'delivery_cost' => 60.00, 'is_active' => true],
            ['name' => 'Marrakech', 'delivery_cost' => 70.00, 'is_active' => true],
            ['name' => 'Tangier', 'delivery_cost' => 55.00, 'is_active' => true],
            ['name' => 'Agadir', 'delivery_cost' => 75.00, 'is_active' => true],
            ['name' => 'Meknes', 'delivery_cost' => 55.00, 'is_active' => true],
            ['name' => 'Oujda', 'delivery_cost' => 80.00, 'is_active' => true],
            ['name' => 'Kenitra', 'delivery_cost' => 40.00, 'is_active' => true],
            ['name' => 'Sale', 'delivery_cost' => 42.00, 'is_active' => true],
            ['name' => 'Tetouan', 'delivery_cost' => 50.00, 'is_active' => true],
            ['name' => 'Larache', 'delivery_cost' => 52.00, 'is_active' => true],
            ['name' => 'Benslimane', 'delivery_cost' => 38.00, 'is_active' => true],
            ['name' => 'Mohammedia', 'delivery_cost' => 48.00, 'is_active' => true],
            ['name' => 'Settat', 'delivery_cost' => 45.00, 'is_active' => true],
            ['name' => 'Taza', 'delivery_cost' => 65.00, 'is_active' => true],
            ['name' => 'Safi', 'delivery_cost' => 55.00, 'is_active' => true],
            ['name' => 'Essaouira', 'delivery_cost' => 70.00, 'is_active' => true],
            ['name' => 'Taounate', 'delivery_cost' => 60.00, 'is_active' => true],
            ['name' => 'Guelmim', 'delivery_cost' => 85.00, 'is_active' => true],
        ];

        foreach ($defaultCitiesWithCosts as $city) {
            $cities[$city['name']] = $city;
        }

        // Only insert if cities don't already exist
        foreach (array_values($cities) as $city) {
            City::firstOrCreate(
                ['name' => $city['name']],
                [
                    'delivery_cost' => $city['delivery_cost'],
                    'is_active' => $city['is_active']
                ]
            );
        }
    }
}
