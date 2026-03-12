<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleSheetService
{
    private string $apiKey = '';
    private string $sheetId = '';
    private string $range = 'Orders!A1:Z1000';
    private int $headerRow = 1;

    public function setApiKey(string $apiKey): self
    {
        $this->apiKey = trim($apiKey);
        return $this;
    }

    public function setCredentials(string $apiKey, string $sheetId, ?string $range = null, int $headerRow = 1): self
    {
        $this->apiKey = trim($apiKey);
        $this->sheetId = $this->extractSheetId($sheetId);
        if ($range) {
            $this->range = $range;
        }
        $this->headerRow = max(1, $headerRow);
        return $this;
    }

    public function fetchRows(): array
    {
        $values = $this->fetchValues();
        if (empty($values)) {
            return [];
        }

        // Ensure header row exists
        $headerIndex = $this->headerRow - 1;
        if (!isset($values[$headerIndex])) {
            return [];
        }

        $rawHeaders = $values[$headerIndex];
        $headers = $this->normalizeHeaders($rawHeaders);

        $rows = [];
        foreach ($values as $index => $row) {
            if ($index <= $headerIndex) {
                continue; // skip header rows
            }

            $rows[] = $this->mapRowToAssoc($headers, $row, $index + 1);
        }

        return $rows;
    }

    /**
     * List sheet tabs (titles)
     */
    public function listTabs(string $sheetId): array
    {
        $this->validateApiKey();
        $sheetId = $this->extractSheetId($sheetId);

        $url = sprintf('https://sheets.googleapis.com/v4/spreadsheets/%s', $sheetId);
        $response = Http::get($url, [
            'key' => $this->apiKey,
            'fields' => 'sheets.properties.title'
        ]);

        if (!$response->successful()) {
            throw new \Exception('Failed to list Google Sheet tabs: HTTP ' . $response->status());
        }

        $data = $response->json();
        $sheets = $data['sheets'] ?? [];
        return array_map(function ($sheet) {
            return $sheet['properties']['title'] ?? '';
        }, $sheets);
    }

    /**
     * Fetch values from a specific tab (first 200 rows by default)
     */
    public function fetchTab(string $sheetId, string $tab, int $maxRows = 200): array
    {
        $sheetId = $this->extractSheetId($sheetId);
        $range = $tab . '!A1:Z' . $maxRows;
        $this->setCredentials($this->apiKey, $sheetId, $range, 1);
        return $this->fetchValues($maxRows);
    }

    public function testConnection(): bool
    {
        try {
            $values = $this->fetchValues(2); // fetch minimal rows
            return !empty($values);
        } catch (\Exception $e) {
            Log::warning('Google Sheet testConnection failed', [
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    private function fetchValues(?int $maxRows = null): array
    {
        $this->validate();
        $range = $this->range;
        if ($maxRows) {
            // append limit using Sheets API majorDimension=ROWS & range that limits rows
            // easiest: keep range but we will slice client-side
        }

        $url = sprintf('https://sheets.googleapis.com/v4/spreadsheets/%s/values/%s', $this->sheetId, $range);

        $response = Http::get($url, ['key' => $this->apiKey]);

        if (!$response->successful()) {
            throw new \Exception('Failed to fetch Google Sheet values: HTTP ' . $response->status() . ' ' . $response->body());
        }

        $data = $response->json();
        $values = $data['values'] ?? [];

        if ($maxRows) {
            $values = array_slice($values, 0, $maxRows);
        }

        return $values;
    }

    private function normalizeHeaders(array $rawHeaders): array
    {
        return array_map(function ($header, $index) {
            $header = is_string($header) ? $header : 'col_' . ($index + 1);
            $normalized = strtolower(trim($header));
            $normalized = preg_replace('/[^a-z0-9]+/i', '_', $normalized);
            $normalized = trim($normalized, '_');
            return $normalized ?: 'col_' . ($index + 1);
        }, $rawHeaders, array_keys($rawHeaders));
    }

    private function mapRowToAssoc(array $headers, array $row, int $rowNumber): array
    {
        $assoc = ['__row_number' => $rowNumber];
        foreach ($headers as $i => $header) {
            $assoc[$header] = $row[$i] ?? null;
        }
        return $assoc;
    }

    private function extractSheetId(string $sheetIdOrUrl): string
    {
        $sheetIdOrUrl = trim($sheetIdOrUrl);
        if (str_contains($sheetIdOrUrl, 'docs.google.com')) {
            // URLs look like https://docs.google.com/spreadsheets/d/{sheetId}/edit#gid=0
            $parts = explode('/d/', $sheetIdOrUrl);
            if (count($parts) > 1) {
                $rest = $parts[1];
                $sheetId = strtok($rest, '/');
                return $sheetId ?: $sheetIdOrUrl;
            }
        }
        return $sheetIdOrUrl;
    }

    private function validate(): void
    {
        $this->validateApiKey();
        if (empty($this->sheetId)) {
            throw new \Exception('Google Sheet ID is missing.');
        }
    }

    private function validateApiKey(): void
    {
        if (empty($this->apiKey)) {
            throw new \Exception('Google Sheets API key is missing.');
        }
    }
}
