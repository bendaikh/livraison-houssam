<?php

namespace Tests\Unit;

use App\Support\Utf8Text;
use PHPUnit\Framework\TestCase;

class Utf8TextTest extends TestCase
{
    public function test_fixes_common_arabic_mojibake(): void
    {
        $original = 'عزيز غرسة';
        $mojibake = mb_convert_encoding($original, 'UTF-8', 'ISO-8859-1');
        $fixed = Utf8Text::fixMojibake($mojibake);

        $this->assertNotSame($mojibake, $fixed);
        $this->assertSame($original, $fixed);
    }

    public function test_leaves_valid_arabic_unchanged(): void
    {
        $value = 'عزيز غرسة';

        $this->assertSame($value, Utf8Text::fixMojibake($value));
    }
}
