<?php

namespace Database\Seeders;

use App\Models\City;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    public function run(): void
    {
        $cities = [
            ['name' => 'Casablanca', 'delivery_cost' => 50.00, 'is_active' => true],
            ['name' => 'Rabat', 'delivery_cost' => 45.00, 'is_active' => true],
            ['name' => 'Marrakech', 'delivery_cost' => 60.00, 'is_active' => true],
            ['name' => 'Fès', 'delivery_cost' => 55.00, 'is_active' => true],
            ['name' => 'Tanger', 'delivery_cost' => 70.00, 'is_active' => true],
            ['name' => 'Agadir', 'delivery_cost' => 80.00, 'is_active' => true],
            ['name' => 'Meknès', 'delivery_cost' => 55.00, 'is_active' => true],
            ['name' => 'Oujda', 'delivery_cost' => 75.00, 'is_active' => true],
            ['name' => 'Kenitra', 'delivery_cost' => 50.00, 'is_active' => true],
            ['name' => 'Tétouan', 'delivery_cost' => 65.00, 'is_active' => true],
        ];

        foreach ($cities as $city) {
            City::updateOrCreate(
                ['name' => $city['name']],
                $city
            );
        }
    }
}
