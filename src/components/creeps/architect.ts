export function plan(room: Room) {
  const energySources = room.find<Source>(FIND_SOURCES_ACTIVE);
  const spawn = room.find<Spawn>(FIND_MY_SPAWNS)[0];
  const constructionSites = room.find<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);

  let pending = constructionSites.length;
  const maxPlanned = 1;
  console.log("Pending construction: ", pending);
  if (energySources.length > 0) {
    // Look at the paths between the spawn and the energy sources.
    _.each(energySources, (source) => {
      const path: PathStep[] = room.findPath(spawn.pos, source.pos, {ignoreCreeps: false, ignoreRoads: false});
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

  const controller = room.controller;
  if (controller) {
    const path: PathStep[] = room.findPath(spawn.pos, controller.pos, {ignoreCreeps: false, ignoreRoads: false});
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

  let highest = 0;
  let highestPos: {x: number, y: number} | null = null;
  // Decay all the walk entries
  if (Game.time % 25 === 0) {
    for (let x = 0; x < 50; x++) {
      for (let y = 0; y < 50; y++) {
        room.memory.walk[x][y] *= 0.8;
        if (room.memory.walk[x][y] > highest && room.lookForAt(LOOK_STRUCTURES, x, y).length === 0) {
          highest = room.memory.walk[x][y];
          highestPos = {x: x, y: y};
        }
      }
    }
  }

  if (pending < maxPlanned && highest > 10 && highestPos != null) {
    console.log("building additional road at highest traveled, highest: ", highest);
    room.createConstructionSite(highestPos.x, highestPos.y, STRUCTURE_ROAD);
  }
}
