<?php

declare(strict_types=1);

namespace App\Support;

final class ExportCellSanitizer
{
    /**
     * Prefix spreadsheet formula triggers so exported text stays literal when
     * opened by spreadsheet applications.
     */
    public static function sanitize(mixed $value): string
    {
        $value = (string) ($value ?? '');

        if ($value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)) {
            return "'{$value}";
        }

        return $value;
    }
}
