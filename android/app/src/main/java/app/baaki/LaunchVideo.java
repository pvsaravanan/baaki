package app.baaki;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.res.Configuration;
import android.graphics.Region;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.animation.PathInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * The launch animation, after the system splash: Android's launch screen
 * shows the logo (launch_logo.png); this cover then shows the
 * same logo in the same place, glides it up to its place, and plays
 * the video beneath it (res/raw/splash.mp4: the glow and the wordmark, rendered
 * from baaki-splash/, composition "SplashLaunch"). It all plays over the
 * WebView while the app loads, and leaves, fading out, once the video has
 * ended and the app has said it's ready (LaunchVideoPlugin.finish); until then
 * it holds the last frame.
 *
 * Start-up keeps the main thread busy for seconds (the WebView, the app's
 * scripts, the database), so the animation stays off it: the video plays on a
 * SurfaceView, which the system compositor draws on its own, the player runs
 * on a thread of its own. A
 * SurfaceView is black until its first frame, so a veil in the splash colour
 * (as is the system splash, and the video's own background) covers it until
 * then; the video then starts from the top.
 */
final class LaunchVideo {
    // Not playing by then (no decoder, broken file): skip the animation.
    private static final long START_TIMEOUT_MS = 3000;
    // The app never said it's ready (it crashed or hangs): leave anyway, so the
    // app's own loading or recovery screen shows instead of a frozen splash.
    private static final long GIVE_UP_MS = 20000;
    private static final String KEY_PLAYED = "animationPlayed";
    private static final String KEY_STILL_THEME = "stillLaunchScreen";
    private static final long FADE_MS = 420;
    private static final float EXIT_SCALE = 1.04f;
    // The system splash normally hands over soon after the app starts.
    private static final long SYSTEM_SPLASH_TIMEOUT_MS = 4000;
    private static final long GLIDE_MS = 450;

    // Android draws a splash icon without a background at 288dp.
    private static final int SPLASH_ICON_DP = 288;
    // launch_logo.png: the logo is 340 of its 1000-wide canvas, centred in it.
    private static final float LOGO_TILE = 0.34f;
    // The logo's place in the launch video (baaki-splash/src/SplashLaunch.tsx),
    // in video pixels: the logo, 200px wide, centred at y = 825.
    private static final int VIDEO_WIDTH = 1080;
    private static final int VIDEO_HEIGHT = 1920;
    private static final float VIDEO_TILE = 200f;
    private static final float VIDEO_LOGO_Y = 825f;

    private static LaunchVideo current;

    // Main thread.
    private final Handler main = new Handler(Looper.getMainLooper());
    private final Cover root;
    private final SurfaceView video;
    private final ImageView still;
    private final View veil;
    private final ImageView logo;
    private final int splashIconSize;
    private boolean glided;
    private boolean freshInstall;
    private final List<Runnable> onGone = new ArrayList<>();
    private boolean ended;
    private boolean ready;
    private boolean leaving;
    private boolean systemSplashGone;
    private SplashScreenViewProvider handedSplash;
    private boolean videoWaiting;
    private volatile boolean started;

    // The player's thread: every MediaPlayer call and callback happens on it.
    private final HandlerThread thread = new HandlerThread("launch-video");
    private final Handler playerThread;
    private MediaPlayer player;
    private SurfaceHolder surface;
    private boolean prepared;
    private boolean firstFrame;
    private volatile int videoWidth;
    private volatile int videoHeight;

    /**
     * Start the animation. Call before the activity's super.onCreate: it sits
     * on the window's decor view, above whatever content comes later, and the
     * video starts loading while the app is still starting up.
     */
    static void show(Activity activity, SplashScreen splash) {
        current = new LaunchVideo(activity, splash);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences("launch", Context.MODE_PRIVATE);
    }

    /**
     * The full animation is for a fresh install only: it hasn't played yet,
     * and the app hasn't been updated since it was installed (so someone who
     * updates from a version without it doesn't suddenly get it).
     */
    private static boolean isFreshInstall(Context context) {
        if (prefs(context).getBoolean(KEY_PLAYED, false)) return false;
        try {
            PackageInfo info = context.getPackageManager().getPackageInfo(context.getPackageName(), 0);
            return info.firstInstallTime == info.lastUpdateTime;
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * From now on, Android's launch screen shows the logo at rest rather than
     * animating it in. Android 13+ only; before that the theme can't change, so
     * the logo keeps animating in on the launch screen (without the rest).
     */
    private static void useStillLaunchScreen(Activity activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        SharedPreferences prefs = prefs(activity);
        if (prefs.getBoolean(KEY_STILL_THEME, false)) return;
        activity.getSplashScreen().setSplashScreenTheme(R.style.AppTheme_NoActionBarLaunch_Still);
        prefs.edit().putBoolean(KEY_STILL_THEME, true).apply();
    }

    /** The app beneath is ready; `gone` runs once the animation has left. */
    static void appReady(Runnable gone) {
        if (current == null) gone.run();
        else current.ready(gone);
    }

    private LaunchVideo(Activity activity, SplashScreen splash) {
        int background = ContextCompat.getColor(activity, R.color.splash_background);
        root = new Cover(activity);
        root.setBackgroundColor(background);
        // Swallow taps meant for the app beneath while it's covered.
        root.setClickable(true);
        video = new SurfaceView(activity);
        root.addView(video, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER));
        // The video's last frame, fitted as the video is (see videoEnded).
        still = new ImageView(activity);
        still.setImageResource(R.drawable.splash_last_frame);
        boolean landscape = activity.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        still.setScaleType(landscape ? ImageView.ScaleType.FIT_CENTER : ImageView.ScaleType.CENTER_CROP);
        still.setVisibility(View.GONE);
        root.addView(still, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        veil = new View(activity);
        veil.setBackgroundColor(background);
        root.addView(veil, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        // The logo, at rest exactly where (and as) the system splash's animated
        // icon ends: centred, at the splash icon's size.
        logo = new ImageView(activity);
        logo.setImageResource(R.drawable.launch_logo);
        splashIconSize = Math.round(SPLASH_ICON_DP * activity.getResources().getDisplayMetrics().density);
        root.addView(logo, new FrameLayout.LayoutParams(splashIconSize, splashIconSize, Gravity.CENTER));
        // Placed (see placeLogo) before anything is drawn, so it's never seen elsewhere.
        root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                if (leaving) {
                    root.getViewTreeObserver().removeOnPreDrawListener(this);
                    return true;
                }
                boolean placed = placeLogo();
                // The system splash goes as this frame is drawn (see below).
                if (placed && handedSplash != null) {
                    handedSplash.remove();
                    handedSplash = null;
                    systemSplashRemoved();
                }
                return placed;
            }
        });
        ((ViewGroup) activity.getWindow().getDecorView()).addView(
            root, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        root.addOnLayoutChangeListener((v, l, t, r, b, ol, ot, or, ob) -> fit());

        thread.start();
        playerThread = new Handler(thread.getLooper());
        main.postDelayed(this::leave, GIVE_UP_MS);

        // Removed as this window next draws, not at once: its logo vanishes the
        // moment it's removed, but the cover beneath only shows once the window
        // has redrawn, and with the main thread busy just then that left the
        // screen blank for a few frames. Removed in the frame that draws the
        // cover, the logo stays put; a busy thread only keeps the splash longer.
        splash.setOnExitAnimationListener(provider -> {
            if (leaving) {
                provider.remove();
                systemSplashRemoved();
                return;
            }
            handedSplash = provider;
            root.invalidate();
        });
        // In case the system splash is never handed over (there's none to remove).
        main.postDelayed(this::systemSplashRemoved, SYSTEM_SPLASH_TIMEOUT_MS);

        // Every launch after the first, or with "Remove animations" on: no
        // video and no glide, just the logo at rest until the app is ready.
        freshInstall = isFreshInstall(activity);
        if (freshInstall) prefs(activity).edit().putBoolean(KEY_PLAYED, true).apply();
        // Later launches show the logo at rest from the start (Android 13+).
        useStillLaunchScreen(activity);
        float animations = Settings.Global.getFloat(activity.getContentResolver(), Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
        if (!freshInstall || animations == 0f) {
            video.setVisibility(View.GONE);
            ended = true;
            return;
        }

        main.postDelayed(() -> {
            if (!started) finished();
        }, START_TIMEOUT_MS);

        video.getHolder().addCallback(new SurfaceHolder.Callback() {
            @Override
            public void surfaceCreated(SurfaceHolder holder) {
                playerThread.post(() -> {
                    surface = holder;
                    if (player != null) player.setDisplay(holder);
                    maybePlay();
                });
            }

            @Override
            public void surfaceChanged(SurfaceHolder holder, int format, int width, int height) {}

            @Override
            public void surfaceDestroyed(SurfaceHolder holder) {
                // Must be detached before this returns: wait for the player's thread.
                CountDownLatch detached = new CountDownLatch(1);
                boolean queued = playerThread.post(() -> {
                    surface = null;
                    if (player != null) player.setDisplay(null);
                    detached.countDown();
                });
                if (!queued) return;
                try {
                    detached.await(500, TimeUnit.MILLISECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        });

        Context context = activity.getApplicationContext();
        playerThread.post(() -> load(context));
    }

    // ---- The player's thread ----

    private void load(Context context) {
        try {
            player = new MediaPlayer();
            player.setDataSource(context, Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.splash));
            player.setVolume(0f, 0f);
            player.setOnPreparedListener(mp -> {
                prepared = true;
                videoWidth = mp.getVideoWidth();
                videoHeight = mp.getVideoHeight();
                main.post(this::fit);
                maybePlay();
            });
            player.setOnInfoListener((mp, what, extra) -> {
                if (what == MediaPlayer.MEDIA_INFO_VIDEO_RENDERING_START && !firstFrame) {
                    // The surface has a picture now: rewind, lift the veil, and
                    // only then play, so the opening isn't lost behind it.
                    firstFrame = true;
                    mp.pause();
                    mp.seekTo(0);
                }
                return false;
            });
            player.setOnSeekCompleteListener(mp -> {
                if (!firstFrame || started) return;
                started = true;
                main.post(() -> {
                    videoWaiting = true;
                    maybeStartVideo();
                });
            });
            // The last frame stays on screen after it ends.
            player.setOnCompletionListener(mp -> main.post(this::videoEnded));
            player.setOnErrorListener((mp, what, extra) -> {
                main.post(this::finished);
                return true;
            });
            player.prepareAsync();
        } catch (Exception e) {
            main.post(this::finished);
        }
    }

    private void maybePlay() {
        if (prepared && surface != null && !firstFrame && player != null) {
            player.setDisplay(surface);
            player.start();
        }
    }

    // ---- Main thread ----

    private void systemSplashRemoved() {
        if (systemSplashGone) return;
        systemSplashGone = true;
        maybeStartVideo();
    }

    /** The video's first frame is up and the system splash has gone: play. */
    private void maybeStartVideo() {
        if (!videoWaiting || !systemSplashGone || leaving) return;
        videoWaiting = false;
        veil.setVisibility(View.GONE);
        glideLogo();
        video.postOnAnimation(() -> playerThread.post(() -> {
            if (player != null) player.start();
        }));
    }

    /**
     * Lay the logo out at its place in the video (above the wordmark), then
     * shrink and move it, by its transform, to where the system splash's icon
     * is: the screen's centre, at the splash icon's size. The glide just undoes
     * that transform, so the logo never draws outside its own bounds (drawn
     * outside them, over the video's surface, it shows cut off).
     * Runs before every draw; returns whether the layout was already right.
     */
    private boolean placeLogo() {
        int w = root.getWidth();
        int h = root.getHeight();
        if (w == 0 || h == 0) return true;
        float scale = videoScale(VIDEO_WIDTH, VIDEO_HEIGHT, w, h);
        int size = Math.round(VIDEO_TILE * scale / LOGO_TILE);
        float centreY = h / 2f + (VIDEO_LOGO_Y - VIDEO_HEIGHT / 2f) * scale;
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) logo.getLayoutParams();
        int top = Math.round(centreY - size / 2f);
        if (params.width == size && params.topMargin == top && params.gravity == (Gravity.TOP | Gravity.CENTER_HORIZONTAL)) return true;
        params.width = size;
        params.height = size;
        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.topMargin = top;
        logo.setLayoutParams(params);
        if (!glided) {
            float atSplash = splashIconSize / (float) size;
            logo.setScaleX(atSplash);
            logo.setScaleY(atSplash);
            logo.setTranslationY(h / 2f - (top + size / 2f));
        }
        return false;
    }

    /**
     * Move the logo from the splash icon's place up to its place in the video,
     * as the wordmark comes in. Run by the render thread (no listeners, so
     * ViewPropertyAnimator hands it over): the app's start-up keeps the main
     * thread busy for most of a second just then, which froze the glide.
     */
    private void glideLogo() {
        glided = true;
        logo.animate()
            .translationY(0f)
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(GLIDE_MS)
            .setInterpolator(new PathInterpolator(0.16f, 1f, 0.3f, 1f));
    }

    private float videoScale(int vw, int vh, float w, float h) {
        boolean landscape = root.getResources().getConfiguration().orientation == Configuration.ORIENTATION_LANDSCAPE;
        return landscape ? Math.min(w / vw, h / vh) : Math.max(w / vw, h / vh);
    }

    /**
     * Fill the screen keeping the video's shape: cropped at the sides on a
     * phone (the surface overhangs the screen), shown whole on a landscape
     * screen, on the same colour.
     */
    private void fit() {
        int vw = videoWidth;
        int vh = videoHeight;
        float w = root.getWidth();
        float h = root.getHeight();
        if (vw == 0 || vh == 0 || w == 0 || h == 0) return;
        float scale = videoScale(vw, vh, w, h);
        int width = Math.round(vw * scale);
        int height = Math.round(vh * scale);
        FrameLayout.LayoutParams params = (FrameLayout.LayoutParams) video.getLayoutParams();
        if (params.width == width && params.height == height) return;
        params.width = width;
        params.height = height;
        video.setLayoutParams(params);
    }

    private void finished() {
        ended = true;
        maybeLeave();
    }

    private void ready(Runnable gone) {
        ready = true;
        onGone.add(gone);
        maybeLeave();
    }

    private void maybeLeave() {
        if (ended && ready) leave();
    }

    /**
     * The video has played: swap it for a still of its last frame (drawn the
     * same size and place), so the exit is only ordinary views, which the
     * render thread can fade on its own (see leave). The video goes a frame
     * after the still is up, so there's never a gap between them.
     */
    private void videoEnded() {
        if (leaving) return;
        still.setVisibility(View.VISIBLE);
        still.postOnAnimation(() -> still.postOnAnimation(() -> {
            video.setVisibility(View.GONE);
            playerThread.post(() -> {
                if (player != null) {
                    player.release();
                    player = null;
                }
            });
            finished();
        }));
    }

    /**
     * Dissolve into the app beneath: fade out while growing a touch, as if the
     * splash were lifting off. Run by the render thread (no listeners, so
     * ViewPropertyAnimator hands it over), since the main thread is busy with
     * the app's first screen just then and would make it stutter.
     */
    private void leave() {
        if (leaving) return;
        leaving = true;
        main.removeCallbacksAndMessages(null);
        if (handedSplash != null) {
            handedSplash.remove();
            handedSplash = null;
        }
        // Left early (gave up, or no animation): nothing to fade with the video.
        video.setVisibility(View.GONE);
        // Taps go through to the app as it comes into view.
        root.setClickable(false);
        root.animate()
            .alpha(0f)
            .scaleX(EXIT_SCALE)
            .scaleY(EXIT_SCALE)
            .setDuration(FADE_MS)
            .setInterpolator(new PathInterpolator(0.4f, 0f, 0.2f, 1f));
        main.postDelayed(this::remove, FADE_MS + 50);
    }

    private void remove() {
        root.setVisibility(View.GONE);
        if (root.getParent() instanceof ViewGroup) ((ViewGroup) root.getParent()).removeView(root);
        playerThread.post(() -> {
            if (player != null) {
                player.release();
                player = null;
            }
            thread.quitSafely();
        });
        if (current == this) current = null;
        for (Runnable gone : onGone) gone.run();
        onGone.clear();
    }

    /**
     * The cover reports all of itself as drawn. With a SurfaceView in it, the
     * window asks its views which parts they draw and the compositor crops the
     * window to those; that's worked out from their laid-out bounds, so the
     * logo, scaled and moved by its glide, gets cut off. The window still has
     * per-pixel alpha, so the video shows through wherever nothing's drawn.
     */
    private static final class Cover extends FrameLayout {
        private final int[] location = new int[2];

        Cover(Context context) {
            super(context);
        }

        @Override
        public boolean gatherTransparentRegion(Region region) {
            if (region != null) {
                getLocationInWindow(location);
                region.op(location[0], location[1], location[0] + getWidth(), location[1] + getHeight(), Region.Op.DIFFERENCE);
            }
            return false;
        }
    }
}
