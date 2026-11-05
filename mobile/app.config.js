const fs = require('fs');
const path = require('path');

const isLocalDev = process.env.ALUMNILINK_LOCAL_DEV === '1';

const localGoogleServices = path.join(__dirname, 'google-services.json');

const googleServicesFile = process.env.GOOGLE_SERVICES_JSON
  ?? (fs.existsSync(localGoogleServices) ? './google-services.json' : undefined);

module.exports = {
  expo: {
    name: isLocalDev ? 'AlumniLink Dev' : 'AlumniLink',
    slug: 'alumni-link',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',

    ios: {
      supportsTablet: true,
    },

    android: {
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },

      package: isLocalDev
        ? 'com.app.alumnilink.dev'
        : 'com.app.alumnilink',

      runtimeVersion: {
        policy: 'appVersion',
      },

      ...(googleServicesFile ? { googleServicesFile } : {}),
    },

    // Expo Over-the-Air Updates
    updates: {
      url: 'https://u.expo.dev/26ea7153-81c3-4648-a474-8ed18376e0d8',
    },

    web: {
      favicon: './assets/favicon.png',
    },

    plugins: [
      '@react-native-community/datetimepicker',
      'expo-sharing',
      'expo-asset',
      'expo-image',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#E6F4FE',
          image: './assets/splash-icon.png',
          imageWidth: 220,
          resizeMode: 'contain',
        },
      ],
    ],

    extra: {
      eas: {
        projectId: '26ea7153-81c3-4648-a474-8ed18376e0d8',
      },
    },

    owner: 'shang18s-team',
  },
};