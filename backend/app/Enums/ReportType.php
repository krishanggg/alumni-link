<?php

declare(strict_types=1);

namespace App\Enums;

enum ReportType: string
{
    case AlumniSummary = 'alumni_summary';
    case BatchReport = 'batch_report';
    case GenderDistribution = 'gender_distribution';
    case YearlyComparison = 'yearly_comparison';

    public function label(): string
    {
        return match ($this) {
            self::AlumniSummary => 'Alumni Summary',
            self::BatchReport => 'Batch Report',
            self::GenderDistribution => 'Gender Distribution',
            self::YearlyComparison => 'Yearly Comparison',
        };
    }

    /** Stored value => display label, the shape `GET /api/reports/types` returns. */
    public static function labels(): array
    {
        return array_reduce(
            self::cases(),
            fn (array $carry, self $type) => $carry + [$type->value => $type->label()],
            [],
        );
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_column(self::cases(), 'value');
    }
}
