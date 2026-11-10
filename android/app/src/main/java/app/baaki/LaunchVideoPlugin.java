package app.baaki;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The app tells the launch animation (LaunchVideo) it has loaded. Resolves
 * once the animation has left the screen.
 */
@CapacitorPlugin(name = "LaunchVideo")
public class LaunchVideoPlugin extends Plugin {

    @PluginMethod
    public void finish(PluginCall call) {
        getActivity().runOnUiThread(() -> LaunchVideo.appReady(call::resolve));
    }
}
