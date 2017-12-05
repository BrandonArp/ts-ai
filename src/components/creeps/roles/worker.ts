import * as Config from "../../../config/config";
import * as creepActions from "../creepActions";

enum Task {
  renew = "renew",
  acquireEnergy = "ae",
  upgradeController = "uc"
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
  let task = creep.memory.task;

  if (creepActions.needsRenew(creep)) {
     task = Task.renew;
  } else if (task === undefined || task === null || task === "") {
    if (_.sum(creep.carry) < creep.carryCapacity) {
      task = Task.acquireEnergy;
    } else if (controller && (controller.upgradeBlocked === 0 || controller.upgradeBlocked === undefined)) {
        task = Task.upgradeController;
    } else if (controller) {
      console.log("cannot upgrade controller for " + controller.upgradeBlocked + " ticks");
    } else {
      console.log("cannot upgrade controller, no controller found");
    }
  }

  // const structures = creep.room.lookForAt(LOOK_STRUCTURES, creep.pos.x, creep.pos.y);
  // if (structures.length === 0) {
  //   creep.room.createConstructionSite(creep.pos.x, creep.pos.y, STRUCTURE_ROAD);
  // }

  creepActions.registerWalk(creep);

  if (task === Task.renew) {
    creepActions.moveToRenew(creep, spawn);
    if (creep.ticksToLive > 1000 ||
      (spawn.energy < 30 && creep.ticksToLive > Config.DEFAULT_MIN_LIFE_BEFORE_STOP_REFILL)) {
      task = "";
    }
  } else if (task === Task.acquireEnergy) {
    // Go get resources from the spawn
    _moveToEnergyWithdraw(creep, spawn);
    if (_.sum(creep.carry) === creep.carryCapacity) {
      task = "";
    }
  } else if (task === Task.upgradeController && controller) {
    _moveToUpgrade(creep, controller);
    if (creep.carry.energy === 0) {
      task = "";
    }
  } else {
    console.log("worker creep holding", creep);
  }

  creep.memory.task = task;
}

function _tryUpgrade(creep: Creep, target: StructureController): number {
  return creep.upgradeController(target);
}

function _moveToUpgrade(creep: Creep, target: StructureController): void {
  const upgradeResult = _tryUpgrade(creep, target);
  if (upgradeResult === OK) {
    return;
  } else if (upgradeResult === ERR_NOT_IN_RANGE) {
    creepActions.moveTo(creep, target.pos);
  } else {
    console.log("error trying to upgrade ", upgradeResult);
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
