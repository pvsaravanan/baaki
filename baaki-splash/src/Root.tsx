import { Composition } from "remotion";
import { Splash } from "./Splash";
import { SplashInk } from "./SplashInk";
import { SplashLaunch } from "./SplashLaunch";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Splash"
        component={Splash}
        durationInFrames={90}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SplashLaunch"
        component={SplashLaunch}
        durationInFrames={66}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="SplashInk"
        component={SplashInk}
        durationInFrames={105}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
