/* eslint-disable no-loop-func */
/* eslint-disable no-await-in-loop */
exports.jobType = 'task-per-node';
exports.name = 'File system';
exports.version = '0.1';
exports.disabled = false;

const os = require('os');

const {
  Generators: { fromFile },
  scopedResource,
  Path: { pathFilter }
} = C.internal;


let pathProvider;
let filter;
let contentFilter;
let recurse;
let dir;
let batchSize;
let maxResults;
let resultsCount = 0;
let reverseResults;
let parseOnRead;

/*
  create a collection task per worker for a filtered path /a/path/to/afile/
  write contents as results
*/

exports.initJob = async () => {};
exports.initTask = async (opts) => {
  const conf = opts.conf;
  const path = conf.path;
  dir = path && path.startsWith('~/') ? path.replace('~', os.homedir()) : path;
  if (dir == null) return Promise.reject(new Error('path is required'));
  dir = C.util.resolveEnvVars(dir);
  recurse = conf.recurse != null ? conf.recurse : true;
  reverseResults = conf.reverseResults != null ? conf.reverseResults : false;
  filter = conf.filter || 'true';
  contentFilter = conf.contentFilter;
  batchSize = conf.resultBatchSize || 10;
  maxResults = conf.maxResults;
  parseOnRead = conf.parseOnRead != null ? conf.parseOnRead : false;
  pathProvider = C.internal.Path.fileSystemProvider(recurse, dir);
  return pathProvider.init();
};
exports.jobSeedTask = async () => {
  return {
    dir,
    filter,
  };
}; // the first task pushed to the queue

exports.jobOnError = async () => {};

exports.taskExecute = async (job) => {
  const _pathFilter = pathFilter(
    dir,
    filter,
    pathProvider,
    job.logger()
  );
  let curPath = await _pathFilter.getNextPath();
  while (!curPath.done && (!maxResults || resultsCount < maxResults)) {
    let file;
    try {
      file = await fromFile(curPath.val, undefined, reverseResults);
    } catch (error) {
      // don't crash if somebody pulls the rug from under us
      job.reportError(error).catch(() => {});
    }
    if (file) {
      await scopedResource(
        () => {
          return file.byLines(parseOnRead, parseOnRead)
            .filteredBy(contentFilter)
            .jsonStringify()
            .map((str) => ({ content: str, file: curPath.val, size: str.length }))
            .byChunksOf(batchSize)
            .unwrap();
        },
        async (gen) => {
          let { value, done } = await gen.next();
          while (!done && (!maxResults || resultsCount <= maxResults)) {
            const remaining = maxResults - resultsCount;
            const results =
             maxResults && value.length > remaining ? value.slice(0, remaining) : value;
            await job.addResults(results);
            resultsCount += results.length;
            ({ value, done } = await gen.next());
          }
        }
      );
    }
    curPath = await _pathFilter.getNextPath();
  }
};
