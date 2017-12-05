import * as Config from "../../../config/config";
import * as creepActions from "../creepActions";

enum Task {
  renew = "renew",
  harvestEnergy = "he",
  dropEnergy = "de"
}
/**
 * Runs all creep actions.
 *
 * @export
 * @param {Creep} creep
 */
export function run(creep: Creep): void {
  const spawn = creep.room.find<Spawn>(FIND_MY_SPAWNS)[0];
  const energySources = creep.room.find<Source>(FIND_SOURCES_ACTIVE).sort(
    (a, b) => a.id === b.id ? 0 : a.id < b.id ? -1 : 1);
  const energySource = energySources[hash(creep.id) % energySources.length];

  let task = creep.memory.task;

  if (creepActions.needsRenew(creep)) {
    task = Task.renew;
  } else if (task === undefined || task === null || task === "") {
    if (_.sum(creep.carry) < creep.carryCapacity) {
      task = Task.harvestEnergy;
    } else {
      task = Task.dropEnergy;
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
  } else if (task === Task.harvestEnergy) {
    _moveToHarvest(creep, energySource);
    if (_.sum(creep.carry) === creep.carryCapacity) {
      task = "";
    }
  } else if (task === Task.dropEnergy) {
    _moveToDropEnergy(creep, spawn);
    if (creep.carry.energy === 0) {
      task = "";
    }
  }

  creep.memory.task = task;
}

function _tryHarvest(creep: Creep, target: Source): number {
  return creep.harvest(target);
}

function _moveToHarvest(creep: Creep, target: Source): void {
  if (_tryHarvest(creep, target) === ERR_NOT_IN_RANGE) {
    creepActions.moveTo(creep, target.pos);
  }
}

function _tryEnergyDropOff(creep: Creep, target: Spawn | Structure): number {
  return creep.transfer(target, RESOURCE_ENERGY);
}

function _moveToDropEnergy(creep: Creep, target: Spawn | Structure): void {
  if (_tryEnergyDropOff(creep, target) === ERR_NOT_IN_RANGE) {
    creepActions.moveTo(creep, target.pos);
  }
}

function hash(str: string): number {
  let hashcode = 5381;
  let i = str.length;

  while(i) {
    hashcode = (hashcode * 33) ^ str.charCodeAt(--i);
  }

  /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
   * integers. Since we want the results to be always positive, convert the
   * signed int to an unsigned by doing an unsigned bitshift. */
  return hashcode >>> 0;
}

