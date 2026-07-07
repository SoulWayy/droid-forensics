import { Composition, registerRoot } from 'remotion';
import { DeathSpiral } from './DeathSpiral';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="DeathSpiral"
      component={DeathSpiral}
      durationInFrames={240}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
