<?php

namespace App\Support;

final class MoroccanPhone
{
    public static function normalize(?string $phone): string
    {
        $digits = preg_replace('/\D+/', '', (string) $phone) ?? '';

        if ($digits === '') {
            return '';
        }

        if (str_starts_with($digits, '00')) {
            $digits = substr($digits, 2);
        }

        if (str_starts_with($digits, '212')) {
            $digits = substr($digits, 3);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if ($digits === '') {
            return '';
        }

        if (strlen($digits) > 9) {
            $digits = substr($digits, -9);
        }

        return '0' . $digits;
    }
}
