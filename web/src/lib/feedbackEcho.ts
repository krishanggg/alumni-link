import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

interface ChannelAuthorizationParams {
  socketId: string;
  channelName: string;
}
interface ChannelAuthorizationData {
  auth: string;
  channel_data?: string;
  shared_secret?: string;
}

type ChannelAuthorizationCallback = (error: Error | null, data: ChannelAuthorizationData | null) => void;

type ChannelAuthorizationHandler = (
  params: ChannelAuthorizationParams,
  callback: ChannelAuthorizationCallback,
) => void;

let feedbackEcho: Echo<'reverb'> | null | undefined;

function getXsrfToken(): string | undefined {
  const cookie = document.cookie
    .split('; ')
    .find((value) => value.startsWith('XSRF-TOKEN='));

  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : undefined;
}

const authorizeFeedbackChannel: ChannelAuthorizationHandler = (params, callback) => {
  const xsrfToken = getXsrfToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  if (xsrfToken) {
    headers['X-XSRF-TOKEN'] = xsrfToken;
  }

  void fetch('/broadcasting/auth', {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify({
      socket_id: params.socketId,
      channel_name: params.channelName,
    }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => null) as unknown;
      if (!response.ok) {
        throw new Error(`Feedback channel authorization failed (${response.status}).`);
      }

      if (!data || typeof data !== 'object' || typeof (data as { auth?: unknown }).auth !== 'string') {
        throw new Error('Feedback channel authorization returned an invalid response.');
      }

      callback(null, data as ChannelAuthorizationData);
    })
    .catch((error: unknown) => {
      callback(error instanceof Error ? error : new Error('Feedback channel authorization failed.'), null);
    });
};

export function getFeedbackEcho(): Echo<'reverb'> | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (feedbackEcho !== undefined) {
    return feedbackEcho;
  }

  const key = import.meta.env.VITE_REVERB_APP_KEY;
  const host = import.meta.env.VITE_REVERB_HOST;

  if (!key || !host) {
    feedbackEcho = null;
    return feedbackEcho;
  }

  const port = Number(import.meta.env.VITE_REVERB_PORT || 80);
  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';

  feedbackEcho = new Echo({
    broadcaster: 'reverb',
    Pusher,
    key,
    wsHost: host,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint: '/broadcasting/auth',
    channelAuthorization: {
      customHandler: authorizeFeedbackChannel,
    },
  });

  return feedbackEcho;
}
