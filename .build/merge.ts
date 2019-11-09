import * as YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as chalk from 'chalk';
const pLimit = require('p-limit');

export type scenarioType = {
  sources: string[],
  destination: string,
  mergeconfig: any[],
  maxThreads: number,
}

export class Scenario {
  private scenario: scenarioType;
  private sources: string[];
  private destination: string;
  private maxThreads: number;
  private mc: MergeConfig;
  constructor(confPath: string) {
    this.scenario = readYamlFile(confPath);
    if (!this.scenario.sources) {
      throw new Error('sources missing from scenario');
    }
    if (!Array.isArray(this.scenario.sources)) {
      throw new Error('sources is not an array');
    }
    if (!this.scenario.destination) {
      throw new Error('destination is missing');
    }
    this.sources = this.scenario.sources;
    // Check to see if files exist in sources, if not, try
    // relative path from where the conf file is located
    const relativeIfFail = (s) => {
      let stat;
      try {
        stat = fs.statSync(s);
      } catch (err) {
        if (err.toString().match(/ENOENT/)) {
          s = path.join(path.dirname(path.resolve(confPath)), s)
          stat = fs.statSync(s);
        } else {
          throw err;
        }
      }
      if (!stat.isDirectory()) {
        throw new Error(`${s} is not a directory`);
      }
      return s;
    }
    this.sources = this.sources.map(s => (relativeIfFail(s)));
    this.destination = relativeIfFail(this.scenario.destination);
    if (!this.scenario.mergeconfig || !Array.isArray(this.scenario.mergeconfig)) {
      this.scenario.mergeconfig = [];
    }
    this.scenario.mergeconfig.push(
      {
        pattern: '\.yml$',
        opts: { op: opcode.mergeYaml }
      }
    );
    this.mc = new MergeConfig(this.scenario.mergeconfig);
    this.maxThreads = this.scenario.maxThreads || 3;
  }

  async run() {
    this.sources.forEach(async s => {
      const ol = buildOpList(this.destination, s, this.destination, this.mc);
      await execOpList(ol, this.maxThreads);
    });
  }
}

export type opOpts = {
  arrayMerge?: arrayMergeType,
  arrayMergePos?: number,
  current?: string,
  noOverwrite?: boolean,
  op?: opcode,
}

export enum arrayMergeType {
  prepend,
  append,
  atPos,
}

export type arrayMergeTypeString = keyof typeof arrayMergeType;

export enum opcode {
  copy,
  mergeYaml,
  skip
}

export type opcodeString = keyof typeof opcode;

export type opType = {
  inputDir: string,
  outDir: string,
  filePath: string,
  opts: opOpts,
}

export type matchOpts = {
  pattern: RegExp,
  opts: opOpts,
}

export class MergeConfig {
  private c: matchOpts[];
  constructor(config: Array<any>) {
    if (!this.c) {
      this.c = [] as matchOpts[];
    }
    (config || []).forEach((c, idx) => {
      if (!c.pattern) {
        throw new Error(`pattern missing from item ${idx}, '${JSON.stringify(c)}'`);
      }
      if (!c.opts) {
        throw new Error(`opOpts missing from item ${idx}, '${JSON.stringify(c)}'`);
      }
      const mc = {
        pattern: new RegExp(c.pattern),
        opts: c.opts as opOpts,
      } as matchOpts;
      if (typeof mc.opts.op === 'string') {
        const ocstr = mc.opts.op as opcodeString;
        mc.opts.op = opcode[ocstr];
        if (mc.opts.op === undefined) {
          throw new Error(`invalid opcode ${ocstr}`)
        }
      }
      if (typeof mc.opts.arrayMerge === 'string') {
        const amstr = mc.opts.arrayMerge as arrayMergeTypeString;
        mc.opts.arrayMerge = arrayMergeType[amstr];
        if (mc.opts.arrayMerge === undefined) {
          throw new Error(`invalid arrayMergeType ${amstr}`);
        }
      }
      this.c.push(mc);
    });
  }
  match(file: string): opOpts {
    for (let i = 0; i < this.c.length; i++) {
      if (this.c[i].pattern.test(file)) {
        return this.c[i].opts;
      }
    }
  }
}

/**
 * Merges two objects. As best as possible, creates a deep copy, until it encounters an array. Anything from the array down
 * will be a shallow copy.
 * @param orig - Original object to merge into
 * @param input - Input object to merge
 * @param opts - Merge strategy, for arrays
 * @returns Deep-ish copy of orig merged with input
 */
export function mergeObjs(orig: any, input: any, opOpts: opOpts): any {
  let ret: any;
  if (typeof(orig) !== 'object') {
    throw new TypeError(`orig is not type object at '${opOpts.current || ''}'`);
  }
  if (typeof input !== 'object') {
    throw new TypeError(`input is not type object at '${opOpts.current || ''}'`);
  }
  if (Array.isArray(orig)) {
    if (!Array.isArray(input)) {
      throw new TypeError(`orig is array but input is not at '${opOpts.current || ''}'`);
    }
    // set default to append
    const mergeType = opOpts.arrayMerge === undefined ? arrayMergeType.append as arrayMergeType : opOpts.arrayMerge
    switch (mergeType) {
      case arrayMergeType.append:
        ret = [...orig, ...input];
        break;
      case arrayMergeType.prepend:
        ret = [...input, ...orig];
        break;
      case arrayMergeType.atPos:
        opOpts.arrayMergePos = opOpts.arrayMergePos || 0;
        if (opOpts.arrayMergePos > orig.length || opOpts.arrayMergePos < 0) throw new RangeError('arrayMergePos is out of range');
        ret = [...orig.slice(0, opOpts.arrayMergePos), ...input, ...orig.slice(opOpts.arrayMergePos)];
        break;
    }
  } else {
    ret = { ...orig }; // shallow copy orig
    Object.keys(input).forEach(k => {
      const typeOfInput = typeof(input[k]);
      if (typeOfInput === 'object') {
        if (typeof(orig[k]) !== typeOfInput) {
          ret[k] = input[k]; // type mismatch, input win
          return;
        }
        opOpts = { ...opOpts } as opOpts; // shallow copy opOpts
        opOpts.current = opOpts.current === undefined ? k : `${opOpts.current}.${k}`;
        ret[k] = mergeObjs(orig[k], input[k], opOpts);
      } else {
        ret[k] = input[k];
      }
    });
  }
  return ret;
}

/**
 * Merges two YAML files with the merge function
 * @param orig - Path to the original YAML to merge into
 * @param input - Path to the input YAML to merge from
 * @param opOpts - Merge strategy
 * @param outpath - Where to write the output file
 */
export function mergeYamlFiles(orig: string, input: string, outpath: string, opOpts: opOpts) {
  const origObj = readYamlFile(orig);
  const inputObj = readYamlFile(input);
  const out = mergeObjs(origObj, inputObj, opOpts);
  fs.writeFileSync(outpath, YAML.stringify(out));
}

/**
 * Reads a YAML file into an object
 * @param filePath 
 * @returns - Object with contents of the YAML
 */
export function readYamlFile(filePath: string): any {
  const contents = fs.readFileSync(filePath, 'utf8');
  return YAML.parse(contents);
}

/**
 * Walk a directory, executing callback for each item
 * @param dir - Base directory to walk
 * @param callback - Callback for each item with the path as the parameter.
 */
export function walkDir(dir: string, callback: Function) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    const stat = fs.statSync(dirPath);
    if (stat.isDirectory()) {
      walkDir(dirPath, callback);
      callback(dirPath, stat);
    } else {
      callback(path.join(dir, f), stat);
    }
  });
};

/**
 * Returns a recusrive list of files starting at dir
 * @param dir - Base directory to walk
 * @returns - List of files found from walking the path.
 */
export function buildFileList(dir: string): string[] {
  const ret = [];
  walkDir(dir, (filePath: string, stat: fs.Stats) => {
    if (stat.isFile()) {
      const strippedPath = filePath.substr(dir.length);
      ret.push(strippedPath);
    }
  });
  return ret;
}

/**
 * Builds a list of operations for execOpList to execute
 * @param origDir - Directory to start from. If different than 
 *    outDir, files will be copied by default.
 *    If origDir is the same as outDir, files will be left in place.
 * @param inputDir - Directory to merge into outDir
 * @param outDir - Destination directory
 * @param config - MergeConfig specifying how to merge files
 * @returns - List of operations to execute
 */
export function buildOpList(origDir: string, inputDir: string, outDir: string, config: MergeConfig): opType[] {
  const origFiles = buildFileList(origDir).sort();
  const origHash = origFiles.reduce((prev, cur) => { prev[cur] = true; return prev; }, {});
  const inputFiles = buildFileList(inputDir).sort();
  const _buildOpList = (fList: string[], inputDir: string, config: MergeConfig): opType[] => {
    return fList.map(f => {
      const opts = config.match(f) || { op: opcode.copy };
      if (inputDir === outDir) opts.op = opcode.skip;
      if (origHash[f] && opts.noOverwrite) opts.op = opcode.skip; // Do not overwrite
      return {
        inputDir,
        outDir,
        filePath: f,
        opts,
      } as opType;
    });
  };
  return [..._buildOpList(origFiles, origDir, new MergeConfig([])), // all origFiles are copies
    ..._buildOpList(inputFiles, inputDir, config)
  ] as opType[];
}

/**
 * Executes an op list from `buildOpList`. Returns a promise which resolves after all operations are complete.
 * @param ol - Oplist returned from `buildOpList`
 * @param maxThreads - Maximum simultaneous operations.
 * @returns - Promise with contents of all the operations.
 */
export async function execOpList(ol: opType[], maxThreads: number): Promise<opType[]> {
  const promises = ol.map(op => {
    return pLimit(maxThreads)(() => (new Promise((resolve, reject) => {
      logOp(op);
      const inputFile = `${op.inputDir}${op.filePath}`;
      const outFile = `${op.outDir}${op.filePath}`;
      const copyFile = () => {
        fs.mkdirSync(path.dirname(inputFile), { recursive: true });
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.copyFile(inputFile, outFile, (err) => {
          if (err) {
            return reject(err)
          };
          resolve(op);
        })
      };
      if (op.opts.op === opcode.copy) {
        copyFile();
      } else if (op.opts.op === opcode.mergeYaml) {
        // Merge should merge the file already there with the new file coming in
        try {
          mergeYamlFiles(outFile, inputFile, outFile, op.opts)
        } catch (err) {
          // If the file doesn't exist to merge, copy instead
          if (err.toString().match(/ENOENT/)) {
            copyFile();
          } else {
            return reject(err);
          }
        };
        return resolve(op);
      } else {
        resolve(op);
      }
    }) as Promise<opType>) as Promise<opType>);
  });
  return Promise.all(promises) as Promise<opType[]>;
}

/**
 * Simple function to log an operation to the console.
 * @param op - Operation to log.
 */
exports.logOps = false;
export function logOp(op: opType) {
  if (exports.logOps) {
    const idIdx = op.inputDir.indexOf(__dirname);
    const inDir = idIdx > -1 ? `.${op.inputDir.substr(idIdx + __dirname.length)}` : op.inputDir;
    const odIdx = op.outDir.indexOf(__dirname);
    const outDir = odIdx > -1 ? `.${op.outDir.substr(odIdx + __dirname.length)}` : op.outDir;
    console.log(`${chalk.grey('[ ')}${chalk.greenBright(opcode[op.opts.op].padEnd(9))}${chalk.grey(' ]')}  ${op.filePath.padEnd(40)} ${chalk.cyanBright('->')} from '${inDir}' to '${outDir}`);
  }
}

async function main() {
  if (process.argv.length < 2 || !process.argv[2] || process.argv[2].length === 0) {
    console.log('usage: merge <path/to/scenario.yml>');
    process.exit(1);
  }

  console.log(`${chalk.magentaBright('Creating')} scenario ${process.argv[2]}`);
  let s;
  try {
    s = new Scenario(process.argv[2]);
  } catch (err) {
    console.log(`Error creating scenario: ${err.message}`);
    process.exit(1);
  }
  console.log(`${chalk.blueBright('Starting')} scenario ${process.argv[2]}`);
  exports.logOps = true;
  await s.run();
}

main();
