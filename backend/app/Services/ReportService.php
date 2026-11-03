<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AlumniPrivacy;
use App\Enums\ReportFormat;
use App\Enums\ReportVisibility;
use App\Models\Alumni;
use App\Models\Report;
use App\Models\School;
use App\Support\ExportCellSanitizer;
use Barryvdh\DomPDF\Facade\Pdf;
use Dompdf\Canvas;
use Dompdf\FontMetrics;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;

class ReportService
{
    public const REPORT_MAX_ROWS = 25_000;

    public function __construct(private readonly ReportChartService $chartService = new ReportChartService) {}

    public function generateReportData(string $type, array $filters): array
    {
        $query = Alumni::confirmed()->whereNull('deleted_at');

        if (! empty($filters['school_id'])) {
            $query->where('school_id', $filters['school_id']);
        }

        if (! empty($filters['graduation_year_from'])) {
            $query->where('graduation_year', '>=', $filters['graduation_year_from']);
        }

        if (! empty($filters['graduation_year_to'])) {
            $query->where('graduation_year', '<=', $filters['graduation_year_to']);
        }

        if (! empty($filters['section'])) {
            $query->where('section_strand', $filters['section']);
        }

        if (! empty($filters['gender'])) {
            $query->where('gender', $filters['gender']);
        }

        return match ($type) {
            'alumni_summary' => [
                'total' => (clone $query)->count(),
                'active' => (clone $query)->whereHas('user')->count(),
                'archived' => (clone $query)->whereDoesntHave('user')->count(),
                'gender' => (clone $query)->whereIn('gender', ['male', 'female'])->selectRaw('gender, COUNT(*) as count')->groupBy('gender')->pluck('count', 'gender'),
                'batches' => (clone $query)->selectRaw('graduation_year, COUNT(*) as count')->groupBy('graduation_year')->orderBy('graduation_year')->pluck('count', 'graduation_year'),
            ],
            'batch_report' => $this->generateBatchReportData($query),
            'gender_distribution' => [
                'gender' => $query->whereIn('gender', ['male', 'female'])->selectRaw('gender, COUNT(*) as count')->groupBy('gender')->pluck('count', 'gender'),
            ],
            'yearly_comparison' => $query->selectRaw('graduation_year, COUNT(*) as total')
                ->groupBy('graduation_year')
                ->orderBy('graduation_year')
                ->get()
                ->toArray(),
            default => [],
        };
    }

    /**
     * @return array{alumni: array<int, array<string, mixed>>, truncation_note?: string}
     */
    private function generateBatchReportData(Builder $query): array
    {
        $truncated = (clone $query)->count() > self::REPORT_MAX_ROWS;
        $alumni = $query
            ->orderBy('id')
            ->limit(self::REPORT_MAX_ROWS)
            ->get(['id', 'first_name', 'last_name', 'graduation_year', 'section_strand', 'privacy']);

        $data = [
            'alumni' => $alumni
                ->map(fn (Alumni $a) => [
                    'id' => $a->id,
                    'first_name' => $a->first_name,
                    'last_name' => $a->last_name,
                    'graduation_year' => $a->graduation_year,
                    'section_strand' => $a->section_strand,
                    'privacy' => $a->privacy?->value,
                ])
                ->toArray(),
        ];

        if ($truncated) {
            $data['truncation_note'] = 'Output truncated at '.self::REPORT_MAX_ROWS.' rows.';
        }

        return $data;
    }

    /**
     * Whether a generated data set actually contains any alumni. An empty
     * report is never worth rendering — the caller turns this into a clear
     * "no alumni match these filters" message instead of an empty PDF.
     *
     * @param  array<string, mixed>  $data
     */
    public function hasReportData(string $type, array $data): bool
    {
        return match ($type) {
            'alumni_summary' => (int) ($data['total'] ?? 0) > 0,
            'batch_report' => ! empty($data['alumni']),
            'gender_distribution' => collect($data['gender'] ?? [])->sum() > 0,
            'yearly_comparison' => $data !== [],
            default => $data !== [],
        };
    }

    /**
     * Build the auto-generated report title used when an admin does not supply one:
     * "<Report Type> — <School> <Year Segment> (<Section>, <Gender>)", where every
     * part after the report type is dropped when the matching filter is unset.
     *
     * @param  array<string, mixed>  $filters
     */
    public function defaultTitle(string $typeLabel, array $filters): string
    {
        $school = ! empty($filters['school_id']) ? School::find($filters['school_id']) : null;
        $title = $typeLabel.' — '.($school?->name ?? 'All Schools');

        $years = $this->titleYearSegment($filters);

        if ($years !== null) {
            $title .= ' '.$years;
        }

        $extras = array_values(array_filter([
            $filters['section'] ?? null,
            isset($filters['gender']) ? ucfirst((string) $filters['gender']) : null,
        ]));

        if ($extras !== []) {
            $title .= ' ('.implode(', ', $extras).')';
        }

        return Str::limit($title, 255, '');
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function titleYearSegment(array $filters): ?string
    {
        $from = $filters['graduation_year_from'] ?? null;
        $to = $filters['graduation_year_to'] ?? null;

        return match (true) {
            $from && $to && (int) $from === (int) $to => "Class of {$from}",
            (bool) $from && (bool) $to => "Classes of {$from}–{$to}",
            (bool) $from => "Classes of {$from} Onward",
            (bool) $to => "Classes up to {$to}",
            default => null,
        };
    }

    /**
     * Strips private-privacy alumni rows and internal-only fields so a
     * published report never exposes what an alumnus marked private.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function filterReportDataForPublish(array $data): array
    {
        if (! isset($data['alumni']) || ! is_array($data['alumni'])) {
            return $data;
        }

        $filtered = array_filter($data['alumni'], fn (array $row): bool => ($row['privacy'] ?? '') !== AlumniPrivacy::Private->value
        );

        $filtered = array_map(function (array $row): array {
            unset($row['privacy'], $row['id']);

            return $row;
        }, array_values($filtered));

        $data['alumni'] = $filtered;

        return $data;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function stripInternalColumns(array $data): array
    {
        if (! isset($data['alumni']) || ! is_array($data['alumni'])) {
            return $data;
        }

        $data['alumni'] = array_map(function (array $row): array {
            unset($row['privacy'], $row['id']);

            return $row;
        }, $data['alumni']);

        return $data;
    }

    public function storeReportFile(array $data, string $type, string|ReportFormat $format, string $title, array $filters = []): ?string
    {
        $ext = $format instanceof ReportFormat ? $format->value : $format;
        $filename = 'reports/'.Str::slug($title).'_'.time().'.'.$ext;

        if ($ext === ReportFormat::Csv->value) {
            Storage::disk('local')->put($filename, $this->toCsv($data));

            return $filename;
        }

        if ($ext === ReportFormat::Xlsx->value) {
            Storage::disk('local')->put($filename, $this->toXlsx($title, $data));

            return $filename;
        }

        Storage::disk('local')->put($filename, $this->renderPdf($data, $type, $title, $filters));

        return $filename;
    }

    /**
     * Renders the branded PDF report to raw bytes without persisting anything.
     * Shared by storeReportFile() (which saves the result) and the live
     * preview endpoint (which streams it inline, un-persisted).
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $filters
     */
    public function renderPdf(array $data, string $type, string $title, array $filters = []): string
    {
        // dompdf writes .ufm font-metrics files into font_cache (storage/fonts)
        // the first time each @font-face TTF is seen. A deploy that ships an
        // empty/absent storage/fonts makes that fopen() fail and aborts the
        // whole render, so guarantee the directory exists before handing off.
        File::ensureDirectoryExists(storage_path('fonts'));

        $school = ! empty($filters['school_id']) ? School::find($filters['school_id']) : null;
        $charts = $this->buildCharts($type, $data);
        $html = view('reports.template', ['title' => $title, 'data' => $data, 'type' => $type, 'school' => $school, 'charts' => $charts])->render();

        $pdf = Pdf::loadHTML($html);
        // page_script() walks the canvas's already-built page list — it must
        // run after layout/pagination (render()) has produced that list, not
        // before, or the callback silently never fires (0 pages to iterate).
        // Calling render() explicitly here (and letting output() see
        // $rendered already true) is what makes that ordering possible.
        $pdf->render();
        $pdf->getDomPDF()->getCanvas()->page_script($this->drawClosingPageText(...));

        return $pdf->output();
    }

    /**
     * Render a fresh PDF for a report request so its footer records the time
     * the user downloads or previews it, rather than the original generation
     * time stored in the report file.
     */
    public function renderPdfForRequest(Report $report): string
    {
        $filters = $report->filters ?? [];
        $data = $this->generateReportData($report->report_type, $filters);

        if ($report->visibility === ReportVisibility::Published) {
            $data = $this->filterReportDataForPublish($data);
        } else {
            $data = $this->stripInternalColumns($data);
        }

        return $this->renderPdf($data, $report->report_type, $report->title, $filters);
    }

    /**
     * Draws the two page-count-dependent pieces of the closing treatment
     * directly on the canvas: the "Page N / Total" label, and "End of
     * Report" (last page only). Neither CSS counter(page)/counter(pages)
     * nor dompdf's legacy {PAGE_NUM} text substitution actually resolves in
     * the installed dompdf version — Canvas::page_script() is the only
     * mechanism that receives the real page number/count, and the only way
     * to conditionally draw something on just the last page. The box
     * geometry mirrors template.blade.php's .closing-accent /
     * .closing-complete-label CSS (kept in sync manually; see the comment
     * above .closing-band in that file). dompdf renders at 96dpi, so CSS px
     * converts to PDF points at *0.75.
     */
    private function drawClosingPageText(int $pageNumber, int $pageCount, Canvas $canvas, FontMetrics $fontMetrics): void
    {
        $px = 0.75;
        $primary = [45 / 255, 117 / 255, 180 / 255];
        $white = [1, 1, 1];
        $rule = [196 / 255, 198 / 255, 209 / 255];

        $accentFont = $fontMetrics->getFont('Report Display', 'bold');
        $this->drawCenteredLabel(
            $canvas, $accentFont,
            "Page {$pageNumber} / {$pageCount}",
            x: 628 * $px, y: 1004 * $px, width: 110 * $px, height: 32 * $px,
            size: 9.5 * $px, letterSpacing: 1.6 * $px, color: $white,
        );

        if ($pageNumber === $pageCount) {
            // Rules only ever accompany the "End of Report" text (both were
            // previously static HTML that rendered on every page even when
            // the text between them was conditionally blank — reads as a
            // broken/truncated footer), so both are drawn here as one unit,
            // last page only.
            $ruleY = 975 * $px;
            $canvas->line(56 * $px, $ruleY, 309 * $px, $ruleY, $rule, 0.75);
            $canvas->line(485 * $px, $ruleY, 738 * $px, $ruleY, $rule, 0.75);

            $completeFont = $fontMetrics->getFont('Report Display', 'bold');
            $this->drawCenteredLabel(
                $canvas, $completeFont, 'End of Report',
                x: 329 * $px, y: 969 * $px, width: 136 * $px, height: 12 * $px,
                size: 9 * $px, letterSpacing: 3 * $px, color: $primary,
            );
        }
    }

    /**
     * @param  array{0: float, 1: float, 2: float}  $color
     */
    private function drawCenteredLabel(Canvas $canvas, string $font, string $text, float $x, float $y, float $width, float $height, float $size, float $letterSpacing, array $color): void
    {
        // Centering purely off get_font_height() renders visibly high versus
        // the box's true geometric center (measured by comparing rendered
        // glyph bounding boxes against the target box, after also fixing
        // the equivalent CSS-side table-cell centering bug — see
        // .closing-band-table td in template.blade.php) — the same
        // embedded-TTF-metrics mismatch documented elsewhere in this file
        // for the donut hole text. Empirically-measured correction, not a
        // guess.
        $verticalBias = 2.32;
        $textWidth = $canvas->get_text_width($text, $font, $size, 0.0, $letterSpacing);
        $fontHeight = $canvas->get_font_height($font, $size);
        $canvas->text(
            $x + ($width - $textWidth) / 2,
            $y + ($height - $fontHeight) / 2 - $verticalBias,
            $text, $font, $size, $color, 0.0, $letterSpacing,
        );
    }

    /**
     * Builds the chart PNGs a report type needs, keyed for the Blade partials.
     * `batch_report` gets none — a roster listing has no natural chart.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private function buildCharts(string $type, array $data): array
    {
        return match ($type) {
            'alumni_summary', 'gender_distribution' => $this->genderChart($data),
            'yearly_comparison' => $this->yearlyChart($data),
            default => [],
        };
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private function genderChart(array $data): array
    {
        $gender = collect($data['gender'] ?? []);

        if ($gender->isEmpty()) {
            return [];
        }

        return [
            // Flat navy/grey — the second series is a neutral, not a second
            // hue, so the chart still reads correctly on a black-and-white
            // photocopy of the printed report.
            'gender_pie' => $this->chartService->donutChart(
                [$gender->get('male', 0), $gender->get('female', 0)],
                ['#2d75b4', '#9aa1b1'],
            ),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, string>
     */
    private function yearlyChart(array $data): array
    {
        // `yearly_comparison`'s top-level shape (see generateReportData()) is
        // itself the list of {graduation_year, total} rows, not a keyed array.
        $totals = collect($data)->pluck('total')->filter(fn ($v) => $v !== null)->values();

        if ($totals->isEmpty()) {
            return [];
        }

        $max = $totals->max();
        $colors = $totals->map(fn ($value) => $value === $max ? '#2d75b4' : '#9aa1b1')->all();

        return [
            'yearly_bar' => $this->chartService->barChart($totals->all(), $colors),
        ];
    }

    public function toCsv(array $data): string
    {
        if (empty($data)) {
            return '';
        }

        $csv = '';

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $csv .= "{$key}\n";
                $csv .= $this->arrayToCsv($value);
            } else {
                $csv .= "\"{$key}\",\"{$value}\"\n";
            }
        }

        return $csv;
    }

    public function arrayToCsv(array $rows): string
    {
        if (empty($rows)) {
            return '';
        }

        $csv = '';
        $headers = array_keys(reset($rows));
        $csv .= implode(',', $headers)."\n";

        foreach ($rows as $row) {
            $csv .= implode(',', array_map(
                fn ($v) => '"'.str_replace('"', '""', ExportCellSanitizer::sanitize($v)).'"',
                array_values($row)
            ))."\n";
        }

        return $csv;
    }

    public function toXlsx(string $title, array $data): string
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Report');

        $row = 1;
        $sheet->setCellValueExplicit(
            'A'.$row,
            ExportCellSanitizer::sanitize($title),
            DataType::TYPE_STRING,
        );
        $row += 2;

        foreach ($data as $key => $value) {
            $sheet->setCellValue('A'.$row, str_replace('_', ' ', ucfirst((string) $key)));
            $row++;

            if (is_array($value) && array_is_list($value)) {
                if (count($value) > 0) {
                    $headers = array_keys((array) $value[0]);
                    foreach ($headers as $col => $header) {
                        $colLetter = Coordinate::stringFromColumnIndex($col + 1);
                        $sheet->setCellValue($colLetter.$row, str_replace('_', ' ', ucfirst((string) $header)));
                    }
                    $row++;

                    foreach ($value as $dataRow) {
                        foreach (array_values((array) $dataRow) as $col => $cell) {
                            $colLetter = Coordinate::stringFromColumnIndex($col + 1);

                            if (is_string($cell)) {
                                $sheet->setCellValueExplicit(
                                    $colLetter.$row,
                                    ExportCellSanitizer::sanitize($cell),
                                    DataType::TYPE_STRING,
                                );
                            } else {
                                $sheet->setCellValue($colLetter.$row, $cell ?? '');
                            }
                        }
                        $row++;
                    }
                }
            } elseif (is_array($value)) {
                foreach ($value as $k => $v) {
                    $sheet->setCellValue('A'.$row, str_replace('_', ' ', ucfirst((string) $k)));

                    if (is_string($v)) {
                        $sheet->setCellValueExplicit(
                            'B'.$row,
                            ExportCellSanitizer::sanitize($v),
                            DataType::TYPE_STRING,
                        );
                    } else {
                        $sheet->setCellValue('B'.$row, is_array($v) ? json_encode($v) : $v);
                    }
                    $row++;
                }
            } else {
                if (is_string($value)) {
                    $sheet->setCellValueExplicit(
                        'A'.$row,
                        ExportCellSanitizer::sanitize($value),
                        DataType::TYPE_STRING,
                    );
                } else {
                    $sheet->setCellValue('A'.$row, $value);
                }
                $row++;
            }

            $row++;
        }

        $writer = new XlsxWriter($spreadsheet);
        $tmpPath = tempnam(sys_get_temp_dir(), 'report_xlsx_');
        $writer->save($tmpPath);
        $contents = file_get_contents($tmpPath);
        unlink($tmpPath);

        // Worksheet holds a back-reference to its parent Spreadsheet, so the pair
        // forms a reference cycle PHP's GC won't promptly collect — disconnect it
        // explicitly or every call leaks a full workbook for the life of the
        // process (28 uncollected workbooks from repeated seeding was enough to
        // exhaust the test suite's memory limit).
        $spreadsheet->disconnectWorksheets();
        unset($spreadsheet, $writer);

        return $contents;
    }

    public function filename(Report $report): string
    {
        return Str::slug($report->title).'.'.$report->format->value;
    }
}
