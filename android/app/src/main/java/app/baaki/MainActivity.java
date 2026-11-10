package app.baaki;

import android.os.Bundle;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The system splash animates the logo in; the launch animation takes it
        // over in the same place (LaunchVideo).
        SplashScreen splash = SplashScreen.installSplashScreen(this);
        // Plugins written for this app have to be registered before the bridge starts.
        registerPlugin(PrivacyScreenPlugin.class);
        registerPlugin(LaunchVideoPlugin.class);
        // Before the bridge starts, so the video loads while the WebView does.
        // Only on a fresh start, not when Android recreates the activity.
        if (savedInstanceState == null) LaunchVideo.show(this, splash);
        super.onCreate(savedInstanceState);
    }
}
