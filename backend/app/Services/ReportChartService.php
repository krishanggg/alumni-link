<?php

declare(strict_types=1);

namespace App\Services;

use Intervention\Image\Drivers\Gd\Driver;
use Intervention\Image\Geometry\Factories\CircleFactory;
use Intervention\Image\Geometry\Factories\PolygonFactory;
use Intervention\Image\Geometry\Factories\RectangleFactory;
use Intervention\Image\ImageManager;
use Intervention\Image\Interfaces\ImageInterface;

class ReportChartService
{
    /**
     * The Blade partial displays the chart at 100x100 CSS px (`.pie-chart-cell
     * img`) — but the exported PNG is deliberately several times *larger* than
     * that, not equal to it. A PDF (or any raster export) is inspected at
     * whatever zoom the viewer chooses, and a 1:1 source scales up (blurry/
     * blocky) the moment anyone zooms past 100%. Exporting at a higher native
     * resolution means the viewer only ever needs to *downscale* — which any
     * renderer does cleanly — never upscale.
     */
    private const PIE_DISPLAY_SIZE = 100;

    private const PIE_EXPORT_SCALE = 4;

    /**
     * GD fills polygons with no anti-aliasing, so the pie is drawn at this
     * multiple of the export size and downscaled — the resize's interpolation
     * is what actually smooths the slice edges.
     */
    private const PIE_SUPERSAMPLE = 4;

    private const BAR_WIDTH = 90;

    private const BAR_HEIGHT = 260;

    private const BAR_GAP = 24;

    /**
     * Draws a solid-slice pie chart (no donut hole, no baked-in text/legend —
     * labels and totals are rendered as HTML around the <img> in the Blade
     * partial instead, since intervention/image's text() needs an explicit
     * font file and this keeps chart typography consistent with the report).
     *
     * @param  array<int, int|float>  $values
     * @param  array<int, string>  $colors  hex color per value, same order/length as $values
     */
    public function pieChart(array $values, array $colors): string
    {
        $exportSize = self::PIE_DISPLAY_SIZE * self::PIE_EXPORT_SCALE;
        $size = $exportSize * self::PIE_SUPERSAMPLE;
        $manager = new ImageManager(Driver::class);
        $image = $manager->createImage($size, $size);

        // A solid opaque background, not the canvas's default transparency —
        // PDF viewers don't reliably alpha-blend embedded PNGs, so a
        // semi-transparent supersampled edge can render as a hard/jagged one
        // instead of fading smoothly. Filling solid white (matching the page)
        // first means the downscale blends color-to-white, never color-to-alpha.
        $image->fill('#ffffff');

        $this->drawPieSlices($image, $values, $colors, $size);

        return $this->encode($image->resize($exportSize, $exportSize));
    }

    /**
     * A pie chart with a flat white disc punched out of the center — the
     * report suite's "donut" (total figure sits in the hole, rendered as
     * HTML text over the PNG, not baked into the image).
     *
     * @param  array<int, int|float>  $values
     * @param  array<int, string>  $colors  hex color per value, same order/length as $values
     */
    public function donutChart(array $values, array $colors): string
    {
        $exportSize = self::PIE_DISPLAY_SIZE * self::PIE_EXPORT_SCALE;
        $size = $exportSize * self::PIE_SUPERSAMPLE;
        $manager = new ImageManager(Driver::class);
        $image = $manager->createImage($size, $size);
        $image->fill('#ffffff');

        $this->drawPieSlices($image, $values, $colors, $size);

        // Hole radius matches the design spec's ratio (94px hole / 160px
        // outer diameter at display size == 47/80 of the radius).
        $center = (int) round($size / 2);
        $holeRadius = (int) round($size / 2 * (47 / 80));

        $image->drawCircle(function (CircleFactory $circle) use ($center, $holeRadius): void {
            $circle->at($center, $center);
            $circle->radius($holeRadius);
            $circle->background('#ffffff');
        });

        return $this->encode($image->resize($exportSize, $exportSize));
    }

    /**
     * Filters out zero-value slices (so the last *drawn* slice, whichever
     * index it was, is always the one forced to close the circle exactly at
     * 360°) and fans each remaining slice out as a filled polygon.
     *
     * @param  array<int, int|float>  $values
     * @param  array<int, string>  $colors  hex color per value, same order/length as $values
     */
    private function drawPieSlices(ImageInterface $image, array $values, array $colors, int $size): void
    {
        $slices = [];
        foreach ($values as $i => $value) {
            if ($value > 0) {
                $slices[] = ['value' => $value, 'color' => $colors[$i] ?? '#444750'];
            }
        }

        $total = array_sum(array_column($slices, 'value'));

        if ($total <= 0) {
            return;
        }

        $center = $size / 2;
        $radius = $size / 2;
        $lastIndex = count($slices) - 1;
        $cumulative = 0.0;

        foreach ($slices as $i => $slice) {
            $startFraction = $cumulative;
            $cumulative += $slice['value'] / $total;
            $endFraction = $i === $lastIndex ? 1.0 : $cumulative;

            $startAngle = -90.0 + 360.0 * $startFraction;
            $endAngle = -90.0 + 360.0 * $endFraction;
            $color = $slice['color'];

            $image->drawPolygon(function (PolygonFactory $polygon) use ($center, $radius, $startAngle, $endAngle, $color): void {
                $polygon->point((int) round($center), (int) round($center));

                // Fan the arc into 2-degree steps so it reads as a smooth curve.
                $steps = max(2, (int) ceil(($endAngle - $startAngle) / 2));
                for ($step = 0; $step <= $steps; $step++) {
                    $angle = $startAngle + (($endAngle - $startAngle) * $step / $steps);
                    $radians = deg2rad($angle);
                    $polygon->point(
                        (int) round($center + $radius * cos($radians)),
                        (int) round($center + $radius * sin($radians)),
                    );
                }

                $polygon->background($color);
            });
        }
    }

    /**
     * Draws a set of bottom-anchored bars scaled to the tallest value.
     *
     * @param  array<int, int|float>  $values
     * @param  array<int, string>  $colors  hex color per bar, same order/length as $values
     */
    public function barChart(array $values, array $colors): string
    {
        $count = count($values);
        $width = $count * self::BAR_WIDTH + max(0, $count - 1) * self::BAR_GAP;

        $manager = new ImageManager(Driver::class);
        $image = $manager->createImage(max($width, 1), self::BAR_HEIGHT);

        $max = max([1, ...$values]);

        foreach (array_values($values) as $i => $value) {
            $height = $value <= 0 ? 0 : (int) round(self::BAR_HEIGHT * ($value / $max));
            $x = $i * (self::BAR_WIDTH + self::BAR_GAP);
            $y = self::BAR_HEIGHT - $height;
            $color = $colors[$i] ?? '#0041c9';

            if ($height <= 0) {
                continue;
            }

            $image->drawRectangle(function (RectangleFactory $rectangle) use ($x, $y, $height, $color): void {
                $rectangle->size(self::BAR_WIDTH, $height);
                $rectangle->at($x, $y);
                $rectangle->background($color);
            });
        }

        return $this->encode($image);
    }

    private function encode(ImageInterface $image): string
    {
        $encoded = $image->encodeUsingFileExtension('png');

        return 'data:image/png;base64,'.base64_encode((string) $encoded);
    }
}
