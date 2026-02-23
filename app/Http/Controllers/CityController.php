<?php

namespace App\Http\Controllers;

use App\Models\City;
use Illuminate\Http\Request;

class CityController extends Controller
{
    public function index()
    {
        $cities = City::orderBy('name')->get();
        return response()->json($cities);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:cities,name',
            'delivery_cost' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

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
            'delivery_cost' => 'required|numeric|min:0',
            'is_active' => 'boolean',
        ]);

        $city->update($validated);
        return response()->json($city);
    }

    public function destroy(City $city)
    {
        $city->delete();
        return response()->json(['message' => 'City deleted successfully']);
    }
}
