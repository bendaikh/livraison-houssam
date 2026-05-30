<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class SyncProductImages extends Command
{
    protected $signature = 'storage:sync-product-images
                            {--url= : Base URL of the remote storage (defaults to STORAGE_REMOTE_URL)}';

    protected $description = 'Download missing product images from a remote server into local storage';

    public function handle(): int
    {
        $baseUrl = rtrim($this->option('url') ?: config('filesystems.disks.public.remote_url', ''), '/');

        if ($baseUrl === '') {
            $this->error('No remote URL configured. Set STORAGE_REMOTE_URL in .env or pass --url=https://your-domain.com/storage');
            return self::FAILURE;
        }

        $paths = Product::query()
            ->whereNotNull('images')
            ->pluck('images')
            ->flatten()
            ->filter()
            ->unique()
            ->values();

        if ($paths->isEmpty()) {
            $this->info('No product images found in the database.');
            return self::SUCCESS;
        }

        $downloaded = 0;
        $skipped = 0;
        $failed = 0;

        foreach ($paths as $path) {
            if (Storage::disk('public')->exists($path)) {
                $skipped++;
                continue;
            }

            $url = $baseUrl . '/' . ltrim($path, '/');

            try {
                $response = Http::timeout(30)->get($url);

                if (!$response->successful()) {
                    $this->warn("Failed ({$response->status()}): {$url}");
                    $failed++;
                    continue;
                }

                $contentType = $response->header('Content-Type', '');
                if (str_contains($contentType, 'text/html')) {
                    $this->warn("Skipped (HTML response, not an image): {$url}");
                    $failed++;
                    continue;
                }

                Storage::disk('public')->put($path, $response->body());
                $this->line("Downloaded: {$path}");
                $downloaded++;
            } catch (\Throwable $e) {
                $this->warn("Error downloading {$url}: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Done. Downloaded: {$downloaded}, already present: {$skipped}, failed: {$failed}");

        return $failed > 0 && $downloaded === 0 ? self::FAILURE : self::SUCCESS;
    }
}
