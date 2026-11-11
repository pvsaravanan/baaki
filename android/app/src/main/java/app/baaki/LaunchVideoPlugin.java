package app.baaki;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The app tells the launch animation (LaunchVideo) it has loaded. Resolves
 * once the animation has left the screen. If the screen beneath has a logo of
 * its own, it passes that logo's place (x, y, width, height, in CSS pixels) and
 * the launch logo glides onto it.
 */
@CapacitorPlugin(name = "LaunchVideo")
public class LaunchVideoPlugin extends Plugin {

    @PluginMethod
    public void finish(PluginCall call) {
        Double x = call.getDouble("x");
        Double y = call.getDouble("y");
        Double width = call.getDouble("width");
        Double height = call.getDouble("height");
        getActivity().runOnUiThread(() -> {
            float[] target = null;
            if (x != null && y != null && width != null && height != null && getBridge().getWebView() != null) {
                float density = getActivity().getResources().getDisplayMetrics().density;
                int[] origin = new int[2];
                getBridge().getWebView().getLocationInWindow(origin);
                target = new float[] {
                    origin[0] + (float) (x * density),
                    origin[1] + (float) (y * density),
                    (float) (width * density),
                    (float) (height * density),
                };
            }
            LaunchVideo.appReady(call::resolve, target);
        });
    }
}
