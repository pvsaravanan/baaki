import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  interpolate,
  useCurrentFrame,
} from "remotion";

const { fontFamily } = loadFont("normal", {
  weights: ["700", "800"],
  subsets: ["latin"],
});

/**
 * The Android app's launch video: "Splash" without its logo. Android's own
 * launch screen animates the logo, and the app then glides that same logo up
 * to its place here (android/.../LaunchVideo.java), so the video only draws
 * what goes around it: the glow and the wordmark.
 *
 * The logo's place, which LaunchVideo.java relies on: the tile is 200px wide,
 * centred (with its ink shadow, which overhangs right and down) at (540, 825).
 */
export const SplashLaunch: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill
      name="Background"
      style={{ backgroundColor: "#F8F2E9", fontFamily }}
    >
      <Interactive.Div
        name="Glow"
        style={{
          position: "absolute",
          left: -160,
          top: 125,
          width: 1400,
          height: 1400,
          borderRadius: 700,
          background:
            "radial-gradient(circle, rgba(197,115,79,0.16) 0%, rgba(197,115,79,0) 62%)",
          opacity: interpolate(frame, [0, 24], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
          }),
          scale: interpolate(frame, [0, 66], [0.8, 1.05], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            output: "perceptual-scale",
          }),
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 989,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily,
            fontSize: 104,
            fontWeight: 800,
            color: "#1A1A1A",
            letterSpacing: "-0.01em",
            lineHeight: 1,
          }}
        >
          <Interactive.Span
            name="Letter 1"
            style={{
              opacity: interpolate(frame, [8, 16], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [8, 22], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            b
          </Interactive.Span>
          <Interactive.Span
            name="Letter 2"
            style={{
              opacity: interpolate(frame, [11, 19], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [11, 25], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            a
          </Interactive.Span>
          <Interactive.Span
            name="Letter 3"
            style={{
              opacity: interpolate(frame, [14, 22], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [14, 28], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            a
          </Interactive.Span>
          <Interactive.Span
            name="Letter 4"
            style={{
              opacity: interpolate(frame, [17, 25], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [17, 31], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            k
          </Interactive.Span>
          <Interactive.Span
            name="Letter 5"
            style={{
              opacity: interpolate(frame, [20, 28], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
              translate: interpolate(frame, [20, 34], ["0px 60px", "0px 0px"], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.spring({ damping: 200 }),
              }),
            }}
          >
            i
          </Interactive.Span>
        </div>

        <Interactive.Div
          name="Underline"
          style={{
            marginTop: 24,
            height: 6,
            borderRadius: 4,
            backgroundColor: "#C5734F",
            width: interpolate(frame, [26, 42], [0, 130], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        />

        <Interactive.Div
          name="Tagline"
          style={{
            marginTop: 32,
            fontFamily,
            fontSize: 34,
            fontWeight: 700,
            color: "#525252",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: interpolate(frame, [30, 44], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
            translate: interpolate(frame, [30, 44], ["0px 24px", "0px 0px"], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: Easing.bezier(0.16, 1, 0.3, 1),
            }),
          }}
        >
          Your money story
        </Interactive.Div>
      </div>
    </AbsoluteFill>
  );
};
