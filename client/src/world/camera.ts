import type { CameraContext } from "@/types";

// render loop: smooth movement (interpolation) + camera follow
export function startCamera({ app, world, room, sprites }: CameraContext) {
  app.ticker.add(() => {
    sprites.forEach((g) => {
      g.x += (g.tx - g.x) * 0.2;
      g.y += (g.ty - g.y) * 0.2;
    });
    const me = sprites.get(room.sessionId);
    if (!me) return;
    world.x = app.screen.width / 2 - me.x;
    world.y = app.screen.height / 2 - me.y;
  });
}
