import * as Config from "../../../config/config";
import * as creepActions from "../creepActions";

enum Task {
  renew = "renew",
  acquireEnergy = "ae",
  build = "build",
}

/**
 * Runs all creep actions.
 *
 * @export
 * @param {Creep} creep
 */
export function run(creep: Creep): void {
  const spawn = creep.room.find<Spawn>(FIND_MY_SPAWNS)[0];
  const controller = creep.room.controller;
  const allSites =  creep.room.find<ConstructionSite>(FIND_MY_CONSTRUCTION_SITES);
  let task = creep.memory.task;

  if (creepActions.needsRenew(creep)) {
     task = Task.renew;
  } else if (task === undefined || task === null || task === "") {
    if (_.sum(creep.carry) < creep.carryCapacity) {
      task = Task.acquireEnergy;
    } else if (allSites.length > 0) {
      task = Task.build;
    } else if (controller) {
      console.log("cannot upgrade controller for " + controller.upgradeBlocked + " ticks");
    } else {
      console.log("cannot upgrade controller, no controller found");
    }
  }

  if (task === Task.renew) {
    creepActions.moveToRenew(creep, spawn);
    if (creep.ticksToLive > 1000 ||
      (spawn.energy < 10 && creep.ticksToLive > (Config.DEFAULT_MIN_LIFE_BEFORE_NEEDS_REFILL * 2))) {
      task = "";
    }
  } else if (task === Task.acquireEnergy) {
    // Go get resources from the spawn
    _moveToEnergyWithdraw(creep, spawn);
    if (_.sum(creep.carry) === creep.carryCapacity) {
      task = "";
    }
  } else if (task === Task.build) {
    const constructionSites = allSites.sort((a, b) => {
      const distToA = distanceApprox(a.pos, creep.pos);
      const distToB = distanceApprox(b.pos, creep.pos);
      return distToA < distToB ? -1 : 1;
    });
    const target = constructionSites[0];
    _moveToBuild(creep, target);
    if (creep.carry.energy === 0) {
      task = "";
    }
  } else {
    console.log("builder creep holding", creep);
  }

  creep.memory.task = task;
}

function distanceApprox(p1: RoomPosition, p2: RoomPosition) {
  // Approximation by using octagons approach
  const x = p2.x - p1.x;
  const y = p2.y - p1.y;
  return 1.426776695 * Math.min(0.7071067812 * (Math.abs(x) + Math.abs(y)), Math.max (Math.abs(x), Math.abs(y)));
}

function _tryBuild(creep: Creep, target: ConstructionSite): number {
  return creep.build(target);
}

function _moveToBuild(creep: Creep, target: ConstructionSite): void {
  const buildResult = _tryBuild(creep, target);
  if (buildResult === OK) {
    return;
  } else if (buildResult === ERR_NOT_IN_RANGE) {
    creepActions.moveTo(creep, target.pos);
  } else {
    console.log("error trying to build ", buildResult);
  }
}

function _tryEnergyWithdraw(creep: Creep, target: Spawn | Structure): number {
  return creep.withdraw(target, RESOURCE_ENERGY);
}

function _moveToEnergyWithdraw(creep: Creep, target: Spawn | Structure): void {
  if (_tryEnergyWithdraw(creep, target) === ERR_NOT_IN_RANGE) {
    creepActions.moveTo(creep, target.pos);
  }
}
