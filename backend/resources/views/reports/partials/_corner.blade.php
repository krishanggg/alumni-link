{{-- Decorative top-right corner ornament: a 3x2 grid of 100px cells, each a
     flat background plus one CSS border-triangle. dompdf can't render SVG or
     rotated transforms, but a border-triangle is pure, unrotated border
     rendering, so this reproduces the mockup exactly (see
     specs/change-requests/01-reports-branding-design/Main.dc.html). Sits
     absolutely inside .page-frame, which shares the page's own top-left
     origin since @page has zero top/left/right margin. --}}
<div class="corner-facet">
    <div class="facet-cell" style="left:0;top:0;background:#f7f9fb;"><div class="facet-tri" style="border-width:100px 100px 0 0;border-color:#dfe3ea transparent transparent transparent;"></div></div>
    <div class="facet-cell" style="left:100px;top:0;background:#dfe3ea;"><div class="facet-tri" style="border-width:0 100px 100px 0;border-color:transparent #23598b transparent transparent;"></div></div>
    <div class="facet-cell" style="left:200px;top:0;background:#2d75b4;"><div class="facet-tri" style="border-width:100px 0 0 100px;border-color:#23598b transparent transparent transparent;"></div></div>
    <div class="facet-cell" style="left:100px;top:100px;background:#ffffff;"><div class="facet-tri" style="border-width:0 0 100px 100px;border-color:transparent transparent #f7f9fb transparent;"></div></div>
    <div class="facet-cell" style="left:200px;top:100px;background:#ffffff;"><div class="facet-tri" style="border-width:100px 100px 0 0;border-color:#0041c9 transparent transparent transparent;"></div></div>
</div>
