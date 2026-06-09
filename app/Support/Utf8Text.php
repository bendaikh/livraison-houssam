<?php

namespace App\Support;

class Utf8Text
{
    public static function fixMojibake(?string $value): ?string
    {
        if ($value === null || $value === '') {
            return $value;
        }

        if (self::containsArabic($value)) {
            return $value;
        }

        if (!self::looksLikeMojibake($value)) {
            return $value;
        }

        $fixed = @iconv('UTF-8', 'ISO-8859-1//IGNORE', $value);

        if (!is_string($fixed) || $fixed === '' || $fixed === $value) {
            return $value;
        }

        if (self::containsArabic($fixed) && mb_check_encoding($fixed, 'UTF-8')) {
            return $fixed;
        }

        return $value;
    }

    public static function clean(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return self::fixMojibake(trim($value));
    }

    private static function looksLikeMojibake(string $value): bool
    {
        return str_contains($value, 'Ø')
            || str_contains($value, 'Ã')
            || str_contains($value, 'Ù')
            || str_contains($value, 'Ú')
            || str_contains($value, 'Û')
            || str_contains($value, 'Ü')
            || str_contains($value, 'Ý');
    }

    private static function containsArabic(string $value): bool
    {
        return (bool) preg_match('/[\x{0600}-\x{06FF}]/u', $value);
    }
}
