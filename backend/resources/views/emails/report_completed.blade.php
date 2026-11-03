@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Your report <strong>{{ $reportTitle }}</strong> has finished generating and is ready to download from the Reports section.
</p>
@endsection
