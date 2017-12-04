// memory extension samples
interface CreepMemory {
  role: string;
  room: string;
  working: boolean;
  task: string;
  target: any;
}

// add objects to `global` here
declare namespace NodeJS {
  interface Global {
    log: any;
  }
}

interface Memory {
  uuid: number;
  log: any;
}

declare const __REVISION__: string
