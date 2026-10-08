package app.baaki;

import android.os.Build;
import android.view.WindowManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Keeps baaki's contents out of Android's recent-apps screen while the app lock
 * is on, so balances aren't readable from the app switcher.
 *
 * On Android 13+ only the recents preview is hidden. Older versions have no
 * such switch, so the whole window is marked secure instead (which also blocks
 * screenshots, but only while the lock is on).
 */
@CapacitorPlugin(name = "PrivacyScreen")
public class PrivacyScreenPlugin extends Plugin {

    @PluginMethod
    public void setEnabled(PluginCall call) {
        final boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        getActivity().runOnUiThread(() -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                getActivity().setRecentsScreenshotEnabled(!enabled);
            } else if (enabled) {
                getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
            } else {
                getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
            }
            call.resolve();
        });
    }
}
