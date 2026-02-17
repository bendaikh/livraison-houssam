<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\Vendor;
use App\Models\MarketplaceProduct;

class MarketplaceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get some products and vendors
        $products = Product::where('is_active', true)->limit(10)->get();
        $vendors = Vendor::where('is_active', true)->limit(5)->get();

        if ($products->isEmpty() || $vendors->isEmpty()) {
            $this->command->warn('No products or vendors found. Please seed products and vendors first.');
            return;
        }

        $this->command->info('Assigning products to vendors...');

        // Assign products to vendors with different configurations
        foreach ($products as $index => $product) {
            // Assign each product to 1-3 random vendors
            $vendorCount = rand(1, min(3, $vendors->count()));
            $selectedVendors = $vendors->random($vendorCount);

            foreach ($selectedVendors as $vendor) {
                // Check if already assigned
                $exists = MarketplaceProduct::where('product_id', $product->id)
                    ->where('vendor_id', $vendor->id)
                    ->exists();

                if (!$exists) {
                    MarketplaceProduct::create([
                        'product_id' => $product->id,
                        'vendor_id' => $vendor->id,
                        'is_active' => rand(0, 10) > 2, // 80% active
                        'commission_rate' => rand(0, 1) ? null : rand(5, 25), // 50% use custom rate
                        'assigned_quantity' => rand(0, 100),
                        'activated_at' => now()->subDays(rand(1, 30)),
                    ]);

                    $this->command->info("Assigned {$product->name} to {$vendor->name}");
                }
            }
        }

        $this->command->info('Marketplace seeding completed!');
    }
}
