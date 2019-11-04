import * as YAML from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
const pLimit = require('p-limit');

const limit = pLimit(3);

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

export enum opcode {
  copy,
  mergeYaml,
  skip
}

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
      this.c.push({ 
        pattern: new RegExp(c.pattern),
        opts: c.opts as opOpts,
      } as matchOpts);
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

export function execOpList(ol: opType[]): Promise<opType[]> {
  const promises = ol.map(op => {
    return limit(() => (new Promise((resolve, reject) => {
      const inputFile = `${op.inputDir}${op.filePath}`;
      const outFile = `${op.outDir}${op.filePath}`;
      if (op.opts.op === opcode.copy) {
        fs.mkdirSync(path.dirname(inputFile), { recursive: true });
        fs.mkdirSync(path.dirname(outFile), { recursive: true });
        fs.copyFile(inputFile, outFile, (err) => {
          if (err) {
            return reject(err)
          };
          resolve(op);
        })
      } else if (op.opts.op === opcode.mergeYaml) {
        // Merge should merge the file already there with the new file coming in
        try {
          mergeYamlFiles(outFile, inputFile, outFile, op.opts)
        } catch (err) {
          return reject(err);
        };
        return resolve(op);
      } else {
        resolve(op);
      }
    }) as Promise<opType>) as Promise<opType>);
  });
  return Promise.all(promises) as Promise<opType[]>;
}

export function logOp(op: opType) {
  let opStr;
  switch (op.opts.op) {
    case opcode.copy:
      opStr = 'copy';
      break;
    case opcode.mergeYaml:
      opStr = 'mergeYaml';
      break;
    case opcode.skip:
      opStr = 'skip';
      break;
  }
  console.log(`${op.filePath} -> ${opStr} from '${op.inputDir}' to '${op.outDir}`);
}

console.log('main!');
