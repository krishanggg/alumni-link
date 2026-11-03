@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    @if ($statusMessage)
        Your Feedback conversation was {{ $statusMessage }}: <strong>{{ $threadSubject }}</strong>.
    @else
        You have a {{ $messageIntro }} Feedback: <strong>{{ $threadSubject }}</strong>.
    @endif
</p>
<p style="margin:0 0 16px 0;">
    <a href="{{ $feedbackUrl }}" style="display:inline-block; padding:10px 16px; background:#1476d6; color:#ffffff; text-decoration:none; border-radius:4px;">Open Feedback</a>
</p>
@endsection
