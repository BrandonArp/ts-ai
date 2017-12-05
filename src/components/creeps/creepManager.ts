import * as Config from "../../config/config";

import * as builder from "./roles/builder";
import * as harvester from "./roles/harvester";
import * as worker from "./roles/worker";
import * as architect from "./architect";

import { log } from "../../lib/logger/log";

/**
 * Initialization scripts for CreepManager module.
 *
 * @export
 * @param {Room} room
 */
export function run(room: Room): void {
  const creeps = room.find<Creep>(FIND_MY_CREEPS);
  const creepCount = _.size(creeps);

  if (Config.ENABLE_DEBUG_MODE) {
    log.info(creepCount + " creeps found in the playground.");
  }

  _buildMissingCreeps(room, creeps);

  architect.plan(room);

  _.each(creeps, (creep: Creep) => {
    if (creep.memory.role === "harvester") {
      harvester.run(creep);
    } else if (creep.memory.role === "worker") {
      worker.run(creep);
    } else if (creep.memory.role === "builder") {
      builder.run(creep);
    } else {
      console.error("Unknown creep role", creep.memory.role);
    }
  });
}

/**
 * Creates a new creep if we still have enough space.
 *
 * @param {Room} room
 */
function _buildMissingCreeps(room: Room, creeps: Creep[]) {
  let bodyParts: BodyPartConstant[];

  // Iterate through each creep and push them into the role array.
  // const harvesters = _.filter(creeps, (creep) => creep.memory.role === "harvester");
  const harvesters: Creep[] = [];
  const workers: Creep[] = [];
  const builders: Creep[] = [];
  const energySources = room.find<Source>(FIND_SOURCES_ACTIVE);

  _.each(creeps, (creep) => {
    const role = creep.memory.role;
    if (role === "harvester") {
      harvesters.push(creep);
    } else if (role === "worker") {
      workers.push(creep);
    } else if (role === "builder") {
      builders.push(creep);
    }
  });

  const spawns: Spawn[] = room.find<Spawn>(FIND_MY_SPAWNS, {
    filter: (spawn: Spawn) => {
      return spawn.spawning === null;
    },
  });

  if (Config.ENABLE_DEBUG_MODE) {
    if (spawns[0]) {
      log.info("Spawn: " + spawns[0].name);
    }
  }

  if (harvesters.length < energySources.length * 4) {
    log.info("Wanting to spawn a new harvester");
    if (harvesters.length < 1 || room.energyCapacityAvailable <= 800) {
      bodyParts = [WORK, WORK, CARRY, MOVE];
    } else if (room.energyCapacityAvailable > 800) {
      bodyParts = [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE];
    }

    _.each(spawns, (spawn: Spawn) => {
      if (spawn.energy >= computeSpawnCost(bodyParts)) {
        _spawnCreep(spawn, bodyParts, "harvester");
      } else {
        log.info("Waiting for enough energy to spawn a harvester");
      }
    });
  } else if (workers.length < harvesters.length - 2) {
    log.info("Wanting to spawn a new worker");
    bodyParts = [WORK, WORK, CARRY, MOVE];
    _.each(spawns, (spawn: Spawn) => {
      if (spawn.energy >= computeSpawnCost(bodyParts)) {
        _spawnCreep(spawn, bodyParts, "worker");
      } else {
        log.info("Waiting for enough energy to spawn a worker");
      }
    });
  } else if (builders.length < 2) {
    log.info("Wanting to spawn a new builder");
    bodyParts = [WORK, WORK, CARRY, MOVE];
    _.each(spawns, (spawn: Spawn) => {
      if (spawn.energy >= computeSpawnCost(bodyParts)) {
        _spawnCreep(spawn, bodyParts, "builder");
      } else {
        log.info("Waiting for enough energy to spawn a builder");
      }
    });
  }

  if ((workers.length >= harvesters.length + 1 || harvesters.length < 2) && workers.length > 0) {
    workers[0].memory.role = "harvester";
    workers[0].memory.task = "";
  } else if ((builders.length >= harvesters.length + 1 || harvesters.length < 2) && builders.length > 0) {
    builders[0].memory.role = "harvester";
    builders[0].memory.task = "";
  }
}

function computeSpawnCost(parts: BodyPartConstant[]): number {
  let sum = 0;
  _.each(parts, (current) => {
    if (current === WORK) {
      sum += 100;
    } else if (current === MOVE) {
      sum += 50;
    } else if (current === CARRY) {
      sum += 50;
    } else if (current === ATTACK) {
      sum += 80;
    } else if (current === RANGED_ATTACK) {
      sum += 150;
    } else if (current === HEAL) {
      sum += 250;
    } else if (current === TOUGH) {
      sum += 10;
    } else if (current === CLAIM) {
      sum += 600;
    }
  });
  return sum;
}

/**
 * Spawns a new creep.
 *
 * @param {Spawn} spawn
 * @param {BodyPartConstant[]} bodyParts
 * @param {string} role
 * @returns
 */
function _spawnCreep(spawn: Spawn, bodyParts: BodyPartConstant[], role: string) {
  const uuid: number = Memory.uuid;
  let status: number | string = spawn.canCreateCreep(bodyParts, undefined);

  const properties: CreepMemory = {
    role,
    room: spawn.room.name,
    target: null,
    task: "",
    working: false
  };

  status = _.isString(status) ? OK : status;
  if (status === OK) {
    Memory.uuid = uuid + 1;
    const creepName: string = spawn.room.name + " - " + role + uuid;

    log.info("Started creating new creep: " + creepName);
    if (Config.ENABLE_DEBUG_MODE) {
      log.info("Body: " + bodyParts);
    }

    status = spawn.createCreep(bodyParts, creepName, properties);

    return _.isString(status) ? OK : status;
  } else {
    if (Config.ENABLE_DEBUG_MODE) {
      log.info("Failed creating new creep: " + status);
    }

    return status;
  }
}
