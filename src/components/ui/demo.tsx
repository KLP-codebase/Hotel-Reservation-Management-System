import Cloudscape from "@/components/ui/cloudscape";

const settings = {
  speed: 1,
  colorBottom: "#87ceeb",
  colorMid: "#f8f8f8",
  colorTop: "#ffffff",
};

export default function Demo(props: Partial<typeof settings>) {
  const s = { ...settings, ...props };
  return (
    <div className="h-screen w-screen">
      <Cloudscape
        speed={s.speed}
        colorBottom={s.colorBottom}
        colorMid={s.colorMid}
        colorTop={s.colorTop}
        height="100%"
      />
    </div>
  );
}
