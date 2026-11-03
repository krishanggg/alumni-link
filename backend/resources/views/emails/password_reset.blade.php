@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    A password reset was requested for your account. Click the button below to choose a new password. This link expires in 60 minutes.
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
    <tr>
        <td style="background:#1476d6; border-radius:2px;">
            <a href="{{ $resetUrl }}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">
                Reset Password
            </a>
        </td>
    </tr>
</table>
<p style="margin:0; font-size:13px; line-height:1.6; color:#9aa1b1;">
    If you didn't request this, you can safely ignore this email.
</p>
@endsection
