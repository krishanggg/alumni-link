<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @font-face {
            font-family: 'Report Display';
            font-weight: 700;
            src: url('{{ resource_path('fonts/Poppins-Bold.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Report Display';
            font-weight: 800;
            src: url('{{ resource_path('fonts/Poppins-ExtraBold.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Report Body';
            font-weight: 400;
            font-style: normal;
            src: url('{{ resource_path('fonts/PTSerif-Regular.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Report Body';
            font-weight: 400;
            font-style: italic;
            src: url('{{ resource_path('fonts/PTSerif-Italic.ttf') }}') format('truetype');
        }
        @font-face {
            font-family: 'Report Body';
            font-weight: 700;
            src: url('{{ resource_path('fonts/PTSerif-Bold.ttf') }}') format('truetype');
        }

        /* The closing treatment (completion line + navy band + accent page
           cap + notice) occupies the bottom 154px of every page (page height
           1123 - top:969 == 154). Reserving that as the @page bottom margin
           means flowing content (e.g. a long roster table) never enters it —
           dompdf wraps to the next page respecting the margin instead of
           overlapping the fixed closing bands. Top gets a real 32px margin
           too — @page margins are the only thing dompdf repeats on every
           page; a padding-top on .content only applied once, at the very
           start of the flow, leaving continuation pages flush against the
           page edge. Left/right stay 0 — .content's own horizontal padding
           handles those on every page already, since it repeats with the
           element it's declared on (unlike a one-shot top padding that only
           renders where the flow actually starts). */
        @page { margin: 32px 0 154px 0; }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            font-family: 'Report Body', serif;
            font-size: 12px;
            color: #191c1e;
        }

        /* Wraps every non-fixed element (corner ornament + masthead/content).
           @page's left/right margins are 0, so this div's horizontal origin
           IS the page's true left edge — absolutely positioned children
           (the corner ornament) can use the exact page-relative x coordinates
           from the design mockup with no translation. Its vertical origin
           sits 32px down (the @page top margin), which repeats on every
           page — see the @page comment above. */
        .page-frame { position: relative; }

        .content { padding: 20px 56px 0 56px; }

        /* FACETED CORNER — see partials/_corner.blade.php */
        .corner-facet { position: absolute; left: 494px; top: 0; width: 300px; height: 200px; }
        .facet-cell { position: absolute; width: 100px; height: 100px; }
        .facet-tri { width: 0; height: 0; border-style: solid; }

        /* MASTHEAD */
        table.masthead { border-collapse: collapse; }
        .masthead-seal { width: 74px; padding-right: 18px; vertical-align: middle; }
        .masthead-text { vertical-align: middle; }
        .masthead-school { font: 700 17px 'Report Body', serif; line-height: 22px; color: #2d75b4; }
        .masthead-rule-1 { margin-top: 18px; height: 2px; background: #2d75b4; }
        .masthead-rule-2 { margin-top: 3px; height: 1px; background: #0041c9; }

        /* border-radius only clips a plain block box in dompdf — silently
           ignored on a <table> — so the circle is a div, and an inner
           single-cell table (not line-height) handles true vertical
           centering, since a custom embedded font's line-height metrics
           don't reliably center against a div's box the way table-cell
           vertical-align does. Size is set directly on the <td> in matching
           fixed px (not a %, not on the <table>) — the only combination
           dompdf reliably honors for table-cell sizing. */
        .seal { position: relative; width: 74px; height: 74px; border-radius: 37px; background: #2d75b4; overflow: hidden; }
        .seal-ring { position: absolute; left: 7px; top: 7px; width: 60px; height: 60px; border-radius: 30px; border: 1px solid #c4c6d1; box-sizing: border-box; }
        .seal table { border-collapse: collapse; }
        .seal td { width: 74px; height: 74px; padding: 0; text-align: center; vertical-align: middle; }
        .seal-logo { max-width: 56px; max-height: 56px; }
        .seal-mark { width: 32px; height: 32px; }

        .report-headline { margin-top: 24px; font: 700 40px 'Report Body', serif; line-height: 44px; letter-spacing: 0.5px; color: #2d75b4; }

        /* META STRIP — the outer div carries the border/radius; the inner
           table only handles the two-column split (border-radius is ignored
           on <table>, so the two responsibilities are deliberately split
           across two elements). */
        .meta-strip { margin-top: 20px; border: 1px solid #c4c6d1; border-radius: 2px; overflow: hidden; }
        .meta-strip-table { width: 100%; height: 44px; border-collapse: collapse; }
        /* Same top-align + empirically-measured padding-top technique used
           throughout this file — vertical-align:middle here (even with a
           matching table height) landed the label+value line well above
           center. Unlike the other fixes in this file, this cell's global
           box-sizing:border-box is NOT honored for a table cell's `height`
           in dompdf — padding-top here ADDS to the box instead of eating
           into it, so `height` is shortened by the padding-top amount to
           compensate and keep the box at a true 44px. */
        .meta-cell { width: 50%; height: 36.3px; padding: 7.7px 18px 0; vertical-align: top; }
        .meta-cell-border { border-right: 1px solid #c4c6d1; }
        .meta-cell-full { width: 100%; }
        .meta-label { font: 700 9.5px 'Report Display', sans-serif; letter-spacing: 1.4px; color: #444750; }
        .meta-value { font: 14px 'Report Body', serif; color: #191c1e; }

        /* STAT BOXES — the <td> only positions the column; the nested div
           carries background/border/radius (same td-vs-div split as the
           meta strip, for the same reason). */
        table.stat-row { width: 100%; border-collapse: collapse; margin-top: 12px; table-layout: fixed; }
        .stat-gap { width: 12px; }
        .stat-cell { vertical-align: top; }
        /* table-layout:fixed is supposed to split width equally among cells
           with no explicit width of their own, but dompdf falls back to
           sizing by content instead — the fill box (shorter caption, no
           border) rendered visibly wider than the bordered ones next to it
           (one of which even wrapped its caption to two lines for lack of
           room). Explicit per-cell widths (tried first) didn't fix it
           either — with dedicated .stat-gap cells still in the row, dompdf
           rendered all 5 columns (3 boxes + 2 gaps) at roughly equal width
           regardless of what each was declared, shrinking the boxes and
           inflating the gaps into large dead space. Removing the separate
           gap cells entirely (spacing now lives in padding-right on the
           box cells themselves, see .stat-row-triple .stat-cell below)
           and going back to a plain 3-column row fixed that: the column
           count dompdf actually divides by matches the columns that exist.
           Scoped to the 3-box row (alumni_summary) specifically —
           .stat-row is shared with yearly_comparison's 2-box row, which
           needs a different split. */
        .stat-row-triple .stat-cell { width: 227px; padding-right: 12px; }
        /* The last cell needs no trailing gap — with it, this box's right
           edge fell short of the content's true right edge, breaking
           alignment with the full-width meta-strip/section-band above and
           below it. */
        .stat-row-triple .stat-cell-last { padding-right: 0; }
        .stat-box { height: 112px; border-radius: 2px; background: #ffffff; border: 1px solid #c4c6d1; padding: 21px 19px; }
        .stat-box-fill { background: #2d75b4; border: none; padding: 22px 20px; }
        .stat-figure { font: 700 38px 'Report Body', serif; line-height: 38px; color: #2d75b4; }
        .stat-figure-muted { color: #9aa1b1; }
        .stat-box-fill .stat-figure { color: #ffffff; }
        .stat-caption { margin-top: 12px; font: 700 9.5px 'Report Display', sans-serif; letter-spacing: 1.6px; color: #444750; text-transform: uppercase; }
        .stat-box-fill .stat-caption { color: #c4c6d1; }

        /* SECTION BAND — full-width filled bar, replaces the old underlined
           label. A height + matching line-height on a plain block <div>
           rendered the text at an unpredictable vertical offset (a dompdf
           quirk), so the label is a single-cell table instead. But a
           <table>'s own reported box height is itself unreliable in dompdf
           — the following sibling's margin-top was landing inside the
           table's visually painted area, not below it — so the table is
           wrapped in an outer <div> with an explicit height; divs' explicit
           heights are respected consistently throughout this template, so
           later siblings' margins are computed against that div, not the
           table. The cell itself uses the same top-align + empirically-
           measured padding-top technique as .closing-band-table td and
           .roster-table th — line-height-matched-to-height still carries a
           small embedded-font-metrics bias, same as everywhere else in this
           file. */
        .section-band { margin-top: 14px; height: 24px; }
        .section-band-table { width: 100%; height: 24px; border-collapse: collapse; }
        .section-band-cell { height: 24px; background: #2d75b4; vertical-align: top; padding: 0 16px; font: 700 10px 'Report Display', sans-serif; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }

        /* GENDER DONUT */
        /* margin-top is larger than the visual gap it looks like it should
           need — dompdf renders this table's content overlapping upward
           into less top clearance, covering the preceding section-band's
           text with the donut's white background. 40px is the smallest
           value verified (by rendering and inspecting the actual PDF) to
           clear that overlap. */
        table.chart-row { border-collapse: collapse; margin-top: 60px; }
        /* Large variant only: centers the whole donut+legend block
           horizontally within the content width, and adds extra clearance
           below the section band. A table needs an explicit width (not
           auto) for margin:auto centering to work, so the width here is
           the measured natural content width (donut-cell-lg + the legend
           column's own explicit width below) rather than something the
           table sizes itself. */
        table.chart-row.chart-row-lg { width: 438px; margin: 90px auto 0; }
        /* Standard-size variant, horizontally centered only (no size
           change) — used by alumni_summary. Same technique: explicit width
           (measured natural content width) + margin:auto, since a table
           needs a fixed width for that centering to work at all. */
        table.chart-row.chart-row-centered { width: 355px; margin: 60px auto 0; }
        .legend-cell-centered { width: 155px; }
        .donut-cell { width: 160px; vertical-align: middle; padding-right: 40px; }
        .donut { position: relative; width: 160px; height: 160px; }
        .donut-img { display: block; width: 160px; height: 160px; }
        .donut-overlay { position: absolute; left: 0; top: 0; width: 160px; height: 160px; border-collapse: collapse; }
        .donut-overlay td { width: 160px; height: 160px; text-align: center; vertical-align: middle; }
        /* table-cell vertical-align:middle centers the *box* of this two-line
           stack, but the embedded PT Serif Bold's baked-in leading renders
           visually low within that box (same embedded-TTF-metrics quirk
           documented on .seal above) — .donut-hole-text carries an
           empirically-measured correction so the glyphs themselves land
           centered in the punched hole, not just their nominal line boxes. */
        .donut-hole-text { margin-top: -65px; }
        .donut-hole-text-lg { margin-top: -83.3px; }
        .donut-figure { font: 700 24px 'Report Body', serif; line-height: 26px; color: #2d75b4; }
        .donut-caption { margin-top: 4px; font: 700 8.5px 'Report Display', sans-serif; letter-spacing: 1.4px; color: #444750; text-transform: uppercase; }
        /* vertical-align on .legend-cell has NO measurable effect here —
           tested top/middle/bottom against a plain div, a div-wrapped
           table, and a bare table directly in the cell: the legend always
           renders at the identical absolute position regardless (confirmed
           by direct measurement of rendered text bounding boxes). Whatever
           positions this content, it isn't table-cell vertical-align, so
           .legend-wrap's negative margin-top is an empirically-measured
           correction against that fixed natural position, not an offset
           from a working vertical-align:middle. */
        .legend-cell { vertical-align: middle; }
        .legend-cell-lg { width: 183px; }
        .legend-wrap { margin-top: -69px; }
        .legend-outer-lg { width: 100%; height: 210px; border-collapse: collapse; }
        .legend-outer-td-lg { vertical-align: middle; }
        .legend-nudge-lg { margin-top: -14.1px; }
        table.legend-table { width: 100%; border-collapse: collapse; }
        .legend-row td { height: 40px; border-bottom: 1px solid #dfe3ea; padding: 0; vertical-align: middle; }
        .legend-row-total td { border-bottom: none; }
        .legend-swatch-cell { width: 20px; }
        .legend-swatch { display: inline-block; width: 11px; height: 11px; }
        .legend-label { padding-left: 8px; padding-right: 22px; font: 700 10.5px 'Report Display', sans-serif; letter-spacing: 1.4px; color: #191c1e; text-transform: uppercase; }
        .legend-value { padding-left: 10px; text-align: right; font: 700 17px 'Report Body', serif; color: #2d75b4; }
        .legend-pct { width: 56px; text-align: right; font: 13px 'Report Body', serif; color: #444750; }

        /* LARGE VARIANT — used only by the standalone Gender Distribution
           report (via _gender_pie's $large flag), which has no content
           after this section and was otherwise leaving a lot of unused
           page height. Not used by alumni_summary's copy of this same
           partial, which already has a Batch Breakdown section below it. */
        .donut-cell-lg { width: 210px; padding-right: 45px; }
        .donut-lg { width: 210px; height: 210px; }
        .donut-img-lg { width: 210px; height: 210px; }
        .donut-overlay-lg { width: 210px; height: 210px; }
        .donut-overlay-lg td { width: 210px; height: 210px; }
        .donut-figure-lg { font-size: 31px; line-height: 33px; }
        .donut-caption-lg { margin-top: 5px; font-size: 11px; letter-spacing: 1.6px; }
        .legend-table-lg .legend-row td { height: 48px; }
        .legend-table-lg .legend-swatch-cell { width: 22px; }
        .legend-table-lg .legend-swatch { width: 13px; height: 13px; }
        .legend-table-lg .legend-label { padding-left: 10px; padding-right: 26px; font-size: 12px; }
        .legend-table-lg .legend-value { font-size: 21px; }
        .legend-table-lg .legend-pct { width: 60px; font-size: 14px; }

        /* BATCH GRID — two-column list, mirroring the design's grid layout.
           A margin-top on the table itself (tried first) was swallowed by
           the same "table margin-top is unreliable in dompdf" quirk
           documented on .section-band above — the first row rendered flush
           against the band. padding-top on the first row's own cells isn't
           subject to that collapse, so the clearance lives there instead. */
        table.batch-grid { width: 100%; border-collapse: collapse; }
        /* box-sizing:border-box (global) means height already includes
           padding, so the first row's extra top clearance needs its height
           bumped by the same amount — not just a bare padding-top — or the
           padding would squeeze the row's own text instead of adding space
           above it. */
        table.batch-grid tr:first-child .batch-year,
        table.batch-grid tr:first-child .batch-bar-cell,
        table.batch-grid tr:first-child .batch-count { height: 41px; padding-top: 14px; }
        /* Same technique for the closing side: this is the last thing on
           the page before the fixed "End of Report" line, and it was
           landing right up against it with no breathing room. The real
           culprit turned out to be two thin gray lines sitting only ~9px
           apart — this row's own border-bottom, then the completion rule
           right below it — which read as "still touching" regardless of
           padding. Dropping this row's own border (already implied by the
           completion rule taking over as the closing divider) removes the
           double-line effect; the page is tuned right at its one-page
           limit for 10 batch years, so padding here stays modest rather
           than risking a second page. */
        table.batch-grid tr:last-child .batch-year,
        table.batch-grid tr:last-child .batch-bar-cell,
        table.batch-grid tr:last-child .batch-count { height: 36px; padding-bottom: 9px; border-bottom: none; }
        .batch-year { width: 44px; height: 27px; border-bottom: 1px solid #dfe3ea; vertical-align: middle; font: 700 14px 'Report Body', serif; color: #2d75b4; }
        /* Horizontal bar per batch year, scaled relative to the largest
           batch (see $batchBarWidth in the partial) — a quick visual read
           of relative batch sizes instead of bare numbers in a plain list. */
        .batch-bar-cell { width: 142px; height: 27px; border-bottom: 1px solid #dfe3ea; vertical-align: middle; padding: 0 12px 0 0; }
        .batch-bar-track { position: relative; width: 130px; height: 8px; background: #eef1f5; border-radius: 2px; }
        .batch-bar-fill { position: absolute; left: 0; top: 0; height: 8px; background: #2d75b4; border-radius: 2px; }
        .batch-count { width: 34px; height: 27px; border-bottom: 1px solid #dfe3ea; vertical-align: middle; text-align: right; font: 700 13px 'Report Body', serif; color: #2d75b4; }
        .batch-gap { width: 40px; }

        /* ROSTER TABLE */
        table.roster-table { width: 100%; border-collapse: collapse; margin-top: 24px; }
        /* Same fix family as .closing-band-table td: top-align + an
           empirically-measured padding-top instead of the line-height-
           matched-to-height trick (which, per this file's own older
           comment, was "proven reliable" only in the loose sense of not
           crashing — it still carries a small embedded-font-metrics bias,
           same as everywhere else in this file). */
        .roster-table th { height: 26px; background: #2d75b4; text-align: left; vertical-align: top; padding: 0.66px 16px 0; font: 700 10px 'Report Display', sans-serif; letter-spacing: 2px; color: #ffffff; text-transform: uppercase; }
        .roster-table th.roster-col-year, .roster-table th.roster-col-section { text-align: center; }
        .roster-col-year { width: 96px; }
        .roster-col-section { width: 150px; }
        .roster-table td { height: 34px; border-bottom: 1px solid #dfe3ea; font: 14px 'Report Body', serif; color: #191c1e; }
        .roster-table tbody tr:nth-child(even) td { background: #f7f9fb; }
        .roster-name { padding: 0 16px; }
        .roster-index { font: 600 9.5px 'Report Display', sans-serif; letter-spacing: 0.8px; color: #9aa1b1; }
        .roster-year, .roster-section { text-align: center; }
        .roster-year { font: 13.5px 'Report Body', serif; color: #2d75b4; }
        .roster-section { font: 600 10.5px 'Report Display', sans-serif; letter-spacing: 1px; color: #2d75b4; text-transform: uppercase; }
        .report-truncation-note { margin-top: 14px; font: 600 10.5px 'Report Display', sans-serif; letter-spacing: 0.5px; color: #444750; }

        /* Same dompdf quirk as table.chart-row above: an <img> immediately
           after a section-band renders overlapping upward into it unless
           given generous top clearance — a small margin-top on the img
           itself isn't enough, so the wrapping div carries the margin. */
        .bar-chart { margin-top: 60px; }
        .bar-chart img { width: 100%; }
        table.bar-labels { width: 100%; border-collapse: collapse; margin: 6px 0 16px; }
        table.bar-labels td { text-align: center; font: 11px 'Report Body', serif; color: #444750; }

        /* CLOSING TREATMENT — two `position: fixed` bands anchored to the
           @page margin box, which repeats them identically on every page
           (the same technique the v1 footer used). A `bottom` offset of
           -(top + height - 969) places each band at its design-mockup
           page-y position: e.g. the notice line (top:1046, height:40) needs
           bottom:-117px so it lands 1046px from the true page top.

           The completion line (rule — rule — "End of Report" — accent
           page-count box) is entirely absent from this stylesheet: it's
           real content only on the actual last page (the rules used to be
           static HTML that rendered on every page even when the "End of
           Report" text between them was conditionally blank, which read as
           broken), so the whole thing — both rules and the text — is drawn
           directly on the canvas from ReportService::storeReportFile()'s
           Canvas::page_script() callback, the only mechanism that knows the
           real page number/count and can conditionally draw only on the
           last page. Geometry it targets: rules at page-y 975, left rule
           page-x 56-309, right rule page-x 485-738, color #c4c6d1; "End of
           Report" label box left:273 top:969 width:136 height:12
           (page-relative), font 700 9px 'Report Display', letter-spacing
           3px, color #2d75b4. The "Page N / Total" label is also
           canvas-drawn, on every page, filling .closing-accent (left:628
           top:1004 width:110 height:32, page-relative), font 700 9.5px
           'Report Display', letter-spacing 1.6px, color #ffffff. */

        .closing-band { position: fixed; left: 56px; bottom: -67px; width: 572px; height: 32px; background: #2d75b4; }
        .closing-band-table { width: 100%; height: 32px; border-collapse: collapse; }
        /* vertical-align:middle (even with matched heights on table and td)
           still lands the text ~1.4pt below true center — a residual of the
           same embedded-TTF-metrics quirk documented throughout this file.
           top-align + an empirically-measured padding-top gives exact
           control instead of fighting the automatic centering. Left-aligned
           (not centered) — the school name sits at the box's start, offset
           only by its own left padding. */
        .closing-band-table td { height: 32px; padding: 4.75px 16px 0; vertical-align: top; text-align: left; font: 700 9.5px 'Report Display', sans-serif; letter-spacing: 1.6px; color: #ffffff; }

        .closing-accent { position: fixed; left: 628px; bottom: -67px; width: 110px; height: 32px; background: #0041c9; }

        .closing-notice { position: fixed; left: 56px; bottom: -104px; width: 682px; height: 40px; }
        /* height needs setting on the table/td too, not just the wrapping
           div — a table doesn't inherit/stretch to a parent's height on its
           own, so vertical-align:middle had no box to center within and
           fell back to the bottom. No left/right padding: the contact line
           and the generated-date line are meant to span edge to edge with
           the band above, left cell flush left / right cell flush right. */
        .closing-notice-table { width: 100%; height: 40px; border-collapse: collapse; }
        .closing-notice-table td { height: 40px; padding: 0; vertical-align: middle; font: italic 10.5px 'Report Body', serif; color: #444750; }
        .closing-notice-left { text-align: left; }
        .closing-notice-right { text-align: right; font-style: normal; }
    </style>
</head>
<body>
    <div class="page-frame">
        @include('reports.partials._corner')
        <div class="content">
            @include('reports.partials.'.$type, ['data' => $data, 'charts' => $charts ?? [], 'school' => $school, 'title' => $title])
        </div>
    </div>

    @include('reports.partials._closing', ['school' => $school])
</body>
</html>
