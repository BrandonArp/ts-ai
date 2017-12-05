export function plan(room: Room) {
  const controller = room.controller;
  const energySources = room.find<Source>(FIND_SOURCES_ACTIVE);
  const spawn = room.find<Spawn>(FIND_MY_SPAWNS)[0];
  const constructionSites = room.find<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);

  let pending = constructionSites.length;
  const maxPlanned = 1;
  console.log("Pending construction: ", pending);
  if (energySources.length > 0) {
    // Look at the paths between the spawn and the energy sources.
    _.each(energySources, (source) => {
      const path: PathStep[] = room.findPath(spawn.pos, source.pos, {ignoreCreeps: true});
      _.each(path, (step) => {
        const structures = room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
        if (step.x === source.pos.x && step.y === source.pos.y) {
          return;
        } else if (structures.length === 0 && maxPlanned > pending) {
          room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
          console.log("Architect would build road at ", step.x, step.y);
          pending++;
        }
      });
    });
  }

  if (controller) {
    const path: PathStep[] = room.findPath(spawn.pos, controller.pos, {ignoreCreeps: true});
    _.each(path, (step) => {
      const structures = room.lookForAt(LOOK_STRUCTURES, step.x, step.y);
      // console.log("structures", structures.length);
      if (structures.length === 0 && maxPlanned > pending) {
        console.log("Want to build a road at ", step.x, step.y);
        room.createConstructionSite(step.x, step.y, STRUCTURE_ROAD);
        console.log("Architect would build road at ", step.x, step.y);
        pending++;
      }
    });
  } else {
    console.log("No controller to build a road to?");
  }
}
