import { SignIn } from '@clerk/nextjs';
import Radar from '@/components/Radar';

export default function Page() {
  return (
    <div className="relative flex justify-center items-center min-h-screen overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Radar
          speed={0.5}
          scale={0.6}
          ringCount={12}
          spokeCount={8}
          color="#6366f1"
          backgroundColor="#060818"
          brightness={0.6}
          enableMouseInteraction={true}
          mouseInfluence={0.05}
        />
      </div>
      <div className="relative z-10">
        <SignIn />
      </div>
    </div>
  );
}

