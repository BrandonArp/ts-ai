export function plan(room: Room) {
  const energySources = room.find<Source>(FIND_SOURCES_ACTIVE).sort((a, b) => a.id < b.id ? -1 : 1);
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

  Memory.phase = "2";
  for (const source of energySources) {
    const pos = source.pos;
    const area = room.lookAtArea(pos.y - 2, pos.x - 2, pos.y + 2, pos.x + 2);

    // Look for places for the creeps to work
    // Pick 2 or 3 (if colinear)
    const creepCandidates = [];
    for (let x = pos.x - 1; x <= pos.x + 1; x++) {
      for (let y = pos.y - 1; y <= pos.y + 1; y++) {
        const types: any = area[y][x];
        let ok = true;
        for (const type of types) {
          if (type.type === "terrain") {
            if (type.terrain === "wall") {
              ok = false;
            }
          } else if (type.type === "structure") {
            console.log("found structure", type.structure);
          } else {
            console.log("found unknown type", type);
          }
        }
        if (ok) {
          creepCandidates.push({x: x, y: y});
        }
      }
    }
    console.log("candidates", creepCandidates);
    _.each(creepCandidates, (c) => {
      console.log("candidate " + c.x + ", " + c.y);
      room.visual.circle(c.x, c.y);
    });

    // for (let x = pos.x - 2; x <= pos.x + 2; x++) {
    //   for (let y = pos.y - 2; y <= pos.y + 2; y++) {
    //     var types = area[y][x];
    //   }
    // }
  }

  if (pending < maxPlanned && highest > 10 && highestPos != null) {
    console.log("building additional road at highest traveled, highest: ", highest);
    room.createConstructionSite(highestPos.x, highestPos.y, STRUCTURE_ROAD);
  }
}
