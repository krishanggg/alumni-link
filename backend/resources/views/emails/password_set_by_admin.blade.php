@extends('emails.layout')

@section('content')
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    Hello {{ $firstName }},
</p>
<p style="margin:0 0 16px 0; font-size:14px; line-height:1.6; color:#444750;">
    An administrator has set a new password for your account. You can sign in with it now:
</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0; width:100%;">
    <tr>
        <td style="background:#f2f4f6; border:1px solid #c4c6d1; border-radius:2px; padding:14px 18px; font-family: 'Courier New', Courier, monospace; font-size:16px; letter-spacing:0.5px; color:#191c1e;">
            {{ $newPassword }}
        </td>
    </tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px 0;">
    <tr>
        <td style="background:#1476d6; border-radius:2px;">
            <a href="{{ $loginUrl }}" style="display:inline-block; padding:12px 24px; font-size:14px; font-weight:bold; color:#ffffff; text-decoration:none;">
                Sign In
            </a>
        </td>
    </tr>
</table>
<p style="margin:0; font-size:13px; line-height:1.6; color:#9aa1b1;">
    For your security, change this password to one only you know after signing in. If you weren't expecting this, contact your school administrator.
</p>
@endsection
