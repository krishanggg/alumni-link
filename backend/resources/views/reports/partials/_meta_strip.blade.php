{{-- $left / $right: ['label' => string, 'value' => string]. $right is
     optional — when omitted, $left spans the full width with no divider. --}}
<div class="meta-strip">
    <table class="meta-strip-table"><tr>
        <td class="meta-cell{{ isset($right) ? ' meta-cell-border' : ' meta-cell-full' }}"><span class="meta-label">{{ $left['label'] }}</span> &nbsp; <span class="meta-value">{{ $left['value'] }}</span></td>
        @isset($right)
            <td class="meta-cell"><span class="meta-label">{{ $right['label'] }}</span> &nbsp; <span class="meta-value">{{ $right['value'] }}</span></td>
        @endisset
    </tr></table>
</div>
