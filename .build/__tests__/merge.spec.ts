import { expect } from 'chai';
import { mergeObjs, opOpts, arrayMergeType, readYamlFile, mergeYamlFiles, walkDir, buildFileList, MergeConfig, buildOpList, execOpList, opcode, logOp, opType } from '../merge';
import * as path from 'path';
import * as fs from 'fs';
import * as md5File from 'md5-file';

process.env.NODE_ENV = 'test';

const emptyOpts = {
  arrayMerge: arrayMergeType.append
} as opOpts;

const origDir = path.join(__dirname, 'mergeorig');
const inputDir = path.join(__dirname, 'mergeinput');
const outDir = path.join(__dirname, 'mergeoutput');
const origYaml = path.join(origDir, 'conf.yml');
const inYaml = path.join(inputDir, 'conf.yml');
const outYaml = path.join(outDir, 'conf.yml');
const defaultMergeConfig = new MergeConfig([
  { 
    pattern: '\.yml$',
    opts: { op: opcode.mergeYaml }
  }
])

const cleanOutDir = () => {
  walkDir(outDir, (f, stat) => {
    if (stat.isFile()) {
      if (f.indexOf('gitignore') === -1) {
        fs.unlinkSync(f);
      }
    } else {
      try {
        fs.rmdirSync(f);
      } catch (err) { };
    }
  });
};

describe('mergeObjs', () => {
  it('orig should have to be an object', () => {
    expect(() => mergeObjs('foo', 'bar', emptyOpts)).to.throw(/^orig is not type object/);
  });
  it('input should have to be an object', () => {
    expect(() => mergeObjs({}, 'bar', emptyOpts)).to.throw(/^input is not type object/);
  });
  it('orig is array but input is not', () => {
    expect(() => mergeObjs([], {}, emptyOpts)).to.throw(/^orig is array but input is not/);
  });
  it('should override orig with simple value from input', () => {
    expect(mergeObjs({ arr: [] }, { arr: 'string' }, emptyOpts)).to.eql({ arr: 'string' });
  });
  it('nested orig is array but input is not', () => {
    expect(() => mergeObjs({ arr: [] }, { arr: {} }, emptyOpts)).to.throw(/^orig is array but input is not/);
  });
  it('should append arrays', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.append;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([1, 2, 3, 4, 5, 6]);
  });
  it('should prepend arrays', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.prepend;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([4, 5, 6, 1, 2, 3]);
  });
  it('should mergeObjs at pos arrays', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 1;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([1, 4, 5, 6, 2, 3]);
  });
  it('should mergeObjs at pos arrays at different pos', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 2;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([1, 2, 4, 5, 6, 3]);
  });
  it('should mergeObjs at pos arrays at different pos', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 3;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([1, 2, 3, 4, 5, 6]);
  });
  it('should mergeObjs at pos arrays at another different pos', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 0;

    const newArr = mergeObjs(origArr, inputArr, opOpts);
    expect(newArr).to.eql([4, 5, 6, 1, 2, 3]);
  });
  it('should fail with out of range arrayMergePos', () => {
    const origArr = [1, 2, 3];
    const inputArr = [4, 5, 6];
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 5;
    expect(() => mergeObjs(origArr, inputArr, opOpts)).to.throw(/^arrayMergePos is out of range/);
    opOpts.arrayMergePos = -3;
    expect(() => mergeObjs(origArr, inputArr, opOpts)).to.throw(/^arrayMergePos is out of range/);
  });
  it('should mergeObjs two objects like JS', () => {
    const orig = { 'a': 'z', 'b': 'y' };
    const input = { '1': '2', '3': '4' };
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, emptyOpts);
    expect(out).to.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
  });
  it('should deeply mergeObjs two objects like JS', () => {
    const orig = { 'a': 'z', 'b': 'y', 'c': { 'z': 'a', 'y': 'b' } };
    const input = { '1': '2', '3': '4' };
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, emptyOpts);
    expect(out).to.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
  });
  it('should deeply copy two objects, unlike JS', () => {
    const orig = { 'a': 'z', 'b': 'y', 'c': { 'z': 'a', 'y': 'b' } };
    const input = { '1': '2', '3': '4', 'c': { 'x': 'c', 'w': 'd' } };
    const expected = { 'a': 'z', 'b': 'y', '1': '2', '3': '4', 'c': { 'z': 'a', 'y': 'b', 'x': 'c', 'w': 'd' } };
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, emptyOpts);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
  it('should mergeObjs nested arrays the way we want', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [1, 2, 3, 4] };
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, emptyOpts);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
  it('should mergeObjs nested arrays the way we want with prepend strategy', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [4, 1, 2, 3] };
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.prepend;
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, opOpts);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
  it('should mergeObjs nested arrays the way we want with atPos strategy', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [1, 2, 4, 3] };
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 2;
    const jsMerge = Object.assign({}, orig, input);
    const out = mergeObjs(orig, input, opOpts);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
});

describe('readYamlFile', () => {
  it('should error on invalid path', () => {
    expect(() => readYamlFile('./nonexistant.yml')).to.throw(/^ENOENT: no such file or directory/);
  });
  it('should error on not a yaml file', () => {
    expect(() => readYamlFile(path.join(__dirname, 'notyaml.txt'))).to.throw(/^Implicit map keys need to be on a single line/);
  });
  it('should read a yaml file', () => {
    const expected = { 'a': 'z', 'b': [1, 2, 3] };
    const out = readYamlFile(path.join(__dirname, 'mergeorig', 'conf.yml'));
    expect(expected).to.eql(out);
  });
});

describe('mergeYamlFiles', () => {
  it('should error on invalid path', () => {
    expect(() => mergeYamlFiles('./nonexistant.yml', './nonexistant2.yml', './nonexistantout.yml', {} as opOpts)).to.throw(/^ENOENT: no such file or directory/);
  });
  it('should error on not a yaml file', () => {
    expect(() => mergeYamlFiles(path.join(__dirname, 'notyaml.txt'), 'dontmatter.yml', 'alsodontmatter..yml', {} as opOpts)).to.throw(/^Implicit map keys need to be on a single line/);
  });
  it('should mergeObjs nested arrays the way we want', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [1, 2, 3, 4] };
    const jsMerge = Object.assign({}, orig, input);
    mergeYamlFiles(origYaml, inYaml, outYaml, emptyOpts);
    const out = readYamlFile(outYaml);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
  it('should mergeObjs nested arrays the way we want with prepend strategy', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [4, 1, 2, 3] };
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.prepend;
    const jsMerge = Object.assign({}, orig, input);
    mergeYamlFiles(origYaml, inYaml, outYaml, opOpts);
    const out = readYamlFile(outYaml);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });
  it('should mergeObjs nested arrays the way we want with atPos strategy', () => {
    const orig = { 'a': 'z', 'b': [1, 2, 3] };
    const input = { 'b': [4] };
    const expected = { 'a': 'z', 'b': [1, 2, 4, 3] };
    const opOpts = Object.assign({}, emptyOpts) as opOpts;
    opOpts.arrayMerge = arrayMergeType.atPos;
    opOpts.arrayMergePos = 2;
    const jsMerge = Object.assign({}, orig, input);
    mergeYamlFiles(origYaml, inYaml, outYaml, opOpts);
    const out = readYamlFile(outYaml);
    expect(out).to.not.eql(jsMerge);
    expect(orig).to.eql(orig); // Original object should be unmodified
    expect(expected).to.eql(out)
  });

  after(() => {
    cleanOutDir();
  });
});

describe('buildFileList', () => {
  it('errors on invalid dir', () => {
    expect(() => buildFileList('/path/to/invalid/dir')).to.throw(/ENOENT/);
  })
  it('builds a list for mergeinput', () => {
    const expected = [
      '/conf.yml',
      '/dir1/file.txt',
      '/dir1/nested/frominput.txt',
      '/dir2/bothpresent.txt',
      '/dir2/deepconf.yml',
      '/dir2/newfile.txt',
    ];
    const list = buildFileList(path.join(__dirname, 'mergeinput')).sort();
    // Validate each item is in the list at the same position
    list.forEach((item, idx) => {
      expect(item.indexOf(expected[idx])).to.be.greaterThan(-1);
    });
  });
  it('builds a list for mergeorig', () => {
    const expected = [
      '/conf.yml',
      '/dir1/justhere.txt',
      '/dir1/nested/we support files with spaces.txt',
      '/dir1/notpresent/onlyinorig.txt',
      '/dir2/bothpresent.txt',
      '/dir2/deepconf.yml',
      '/dir2/origonly.txt',
    ];
    const list = buildFileList(path.join(__dirname, 'mergeorig')).sort();
    // Validate each item is in the list at the same position
    list.forEach((item, idx) => {
      expect(item.indexOf(expected[idx])).to.be.greaterThan(-1);
    });
  });
}); 

describe('MergeConfig', () => {
  it('should do nothing with no config input', () => {
    const mc = new MergeConfig([]);
    expect(mc['c'].length).to.equal(0); 
  });
  it('should error with missing pattern', () => {
    expect(() => { new MergeConfig([{}]); }).to.throw(/pattern missing/);
  });
  it('should error with missing opOpts', () => {
    expect(() => { new MergeConfig([{ pattern: 'foo' }]); }).to.throw(/opOpts missing/);
  });
  it('should error with invalid regexp', () => {
    expect(() => { 
      new MergeConfig([
        { 
          pattern: '[',
          opts: {},
        }
      ]);
    }).to.throw(/Invalid regular expression/);
  });
  it('should get the correct config', () => {
    const mc = new MergeConfig([
      {
        pattern: '\.yml$',
        opts: {
          op: 1 // mergeYaml
        }
      }
    ]);
    expect(mc.match('/asdf/foo.yml')).to.eql({ op: 1 });
  });
  it('early boom regexes work', () => {
    const mc = new MergeConfig([
      {
        pattern: '.*',
        opts: {}
      },
      {
        pattern: '\.yml$',
        opts: {
          op: 1 // mergeYaml
        }
      }
    ]);
    expect(mc.match('/asdf/foo.yml')).to.not.eql({ op: 1 });
    expect(mc.match('/asdf/foo.yml')).to.eql({});
  });
});

describe('buildOpList', () => {
  it('errors on invalid origDir', () => {
    expect(() => 
      buildOpList('/path/to/invalid/dir', 
                  '/path/to/invalidDir', 
                  '/path/to/invalidDir', 
                  new MergeConfig([])))
        .to.throw(/ENOENT/);
  });
  it('errors on invalid inputDir', () => {
    expect(() =>
      buildOpList(origDir,
        '/path/to/invalidDir',
        '/path/to/invalidDir',
        new MergeConfig([])))
      .to.throw(/ENOENT/);
  });
  it('all copies on empty mergeconfig', () => {
    const ol = buildOpList(origDir,
      inputDir,
      outDir,
      new MergeConfig([]));

    ol.forEach(o => {
      expect(o.opts.op).to.equal(opcode.copy);
    });
  });
  it('can override with config', () => {
    const ol = buildOpList(origDir,
      inputDir,
      outDir,
      new MergeConfig([
        {
          pattern: '\/conf\.yml$',
          opts: {
            op: opcode.mergeYaml,
          }
        }
      ]));

    ol.forEach(o => {
      if (o.inputDir === inputDir && o.filePath.match(/\/conf\.yml$/)) {
        expect(o.opts.op).to.equal(opcode.mergeYaml);
      } else {
        expect(o.opts.op).to.equal(opcode.copy);
      }
    });
  });
  it('skips if writing back to the same outdir', () => {
    const ol = buildOpList(origDir,
      inputDir,
      origDir,
      new MergeConfig([
        {
          pattern: '\/conf\.yml$',
          opts: {
            op: opcode.mergeYaml,
          }
        }
      ]));

    ol.forEach(o => {
      if (o.inputDir === inputDir && o.filePath.match(/\/conf\.yml$/)) {
        expect(o.opts.op).to.equal(opcode.mergeYaml);
      } else if (o.inputDir === origDir) {
        expect(o.opts.op).to.equal(opcode.skip);
      } else {
        expect(o.opts.op).to.equal(opcode.copy);
      }
    });
  });
});

const compareFiles = (file1: string, file2: string): boolean => {
  const hash1 = md5File.sync(file1);
  const hash2 = md5File.sync(file2);
  return hash1 === hash2;
}

describe('execOpList', () => {
  before(() => {
    const ol = buildOpList(origDir, inputDir, outDir, defaultMergeConfig);
    const promises = execOpList(ol);
    return promises.catch((err) => console.error(err))
      // .then((ops) => { (ops || [] as opType[]).forEach(op => logOp(op)) });
  });
  it('merged yaml right', () => {
    const expected = { 'a': 'z', 'b': [1, 2, 3, 4] };
    const out = readYamlFile(outYaml);
    expect(expected).to.eql(out);
  });
  it('merged deep yaml right', () => {
    const expected = { foo: 'bar', baz: [4, 5, 6], anotherkey: 'anothervalue', bar: [1, 2, 3] };
    const out = readYamlFile(`${outDir}/dir2/deepconf.yml`);
    expect(expected).to.eql(out);
  });
  it('copies the right files', () => {
    [
      [`${origDir}/dir1/justhere.txt`, `${outDir}/dir1/justhere.txt`],
      [`${origDir}/dir1/notpresent/onlyinorig.txt`, `${outDir}/dir1/notpresent/onlyinorig.txt`],
      [`${origDir}/dir1/nested/we support files with spaces.txt`, `${outDir}/dir1/nested/we support files with spaces.txt`],
      [`${origDir}/dir2/origonly.txt`, `${outDir}/dir2/origonly.txt`],
      [`${inputDir}/dir1/file.txt`, `${outDir}/dir1/file.txt`],
      [`${inputDir}/dir1/nested/frominput.txt`, `${outDir}/dir1/nested/frominput.txt`],
      [`${inputDir}/dir2/bothpresent.txt`, `${outDir}/dir2/bothpresent.txt`],
    ].forEach(tuple => {
      expect(compareFiles(tuple[0], tuple[1]), 
        `${tuple[0]} is not the same as ${tuple[1]}`
      ).to.be.true;
    });
  });
  after(() => {
    console.log('this should execute after all operations');
    cleanOutDir();
  })
});

describe('execOpList skip txt', () => {
  before(() => {
    const mc = new MergeConfig([
      {
        pattern: '\.yml$',
        opts: { op: opcode.mergeYaml },
      },
      {
        pattern: '\.txt$',
        opts: { op: opcode.skip },
      },
    ])
    const ol = buildOpList(origDir, inputDir, outDir, mc);
    const promises = execOpList(ol);
    return promises.catch((err) => console.error(err))
      // .then((ops) => { (ops || [] as opType[]).forEach(op => logOp(op)) });
  });
  it('merged yaml right', () => {
    const expected = { 'a': 'z', 'b': [1, 2, 3, 4] };
    const out = readYamlFile(outYaml);
    expect(expected).to.eql(out);
  });
  it('merged deep yaml right', () => {
    const expected = { foo: 'bar', baz: [4, 5, 6], anotherkey: 'anothervalue', bar: [1, 2, 3] };
    const out = readYamlFile(`${outDir}/dir2/deepconf.yml`);
    expect(expected).to.eql(out);
  });
  it('copies the right files', () => {
    [
      [`${origDir}/dir1/justhere.txt`, `${outDir}/dir1/justhere.txt`],
      [`${origDir}/dir1/notpresent/onlyinorig.txt`, `${outDir}/dir1/notpresent/onlyinorig.txt`],
      [`${origDir}/dir1/nested/we support files with spaces.txt`, `${outDir}/dir1/nested/we support files with spaces.txt`],
      [`${origDir}/dir2/origonly.txt`, `${outDir}/dir2/origonly.txt`],
      [`${origDir}/dir2/bothpresent.txt`, `${outDir}/dir2/bothpresent.txt`],
    ].forEach(tuple => {
      expect(compareFiles(tuple[0], tuple[1]),
        `${tuple[0]} is not the same as ${tuple[1]}`
      ).to.be.true;
    });
    [`${outDir}/dir1/file.txt`,
      `${outDir}/dir1/nested/frominput.txt`,
    ].forEach(f => {
      expect(fs.existsSync(f), `${f} exists`).to.be.false;
    });
  });
  after(() => {
    cleanOutDir();
  })
});

describe('execOpList change merge', () => {
  before(() => {
    const mc = new MergeConfig([
      {
        pattern: '\.yml$',
        opts: { 
          op: opcode.mergeYaml,
          arrayMerge: arrayMergeType.atPos,
          arrayMergePos: 1,
        },
      }
    ])
    const ol = buildOpList(origDir, inputDir, outDir, mc);
    const promises = execOpList(ol);
    return promises.catch((err) => console.error(err))
    // .then((ops) => { (ops || [] as opType[]).forEach(op => logOp(op)) });
  });
  it('merged yaml right', () => {
    const expected = { 'a': 'z', 'b': [1, 4, 2, 3] };
    const out = readYamlFile(outYaml);
    expect(expected).to.eql(out);
  });
  it('merged deep yaml right', () => {
    const expected = { foo: 'bar', baz: [4, 5, 6], anotherkey: 'anothervalue', bar: [1, 2, 3] };
    const out = readYamlFile(`${outDir}/dir2/deepconf.yml`);
    expect(expected).to.eql(out);
  });
  it('copies the right files', () => {
    [
      [`${origDir}/dir1/justhere.txt`, `${outDir}/dir1/justhere.txt`],
      [`${origDir}/dir1/notpresent/onlyinorig.txt`, `${outDir}/dir1/notpresent/onlyinorig.txt`],
      [`${origDir}/dir1/nested/we support files with spaces.txt`, `${outDir}/dir1/nested/we support files with spaces.txt`],
      [`${origDir}/dir2/origonly.txt`, `${outDir}/dir2/origonly.txt`],
      [`${inputDir}/dir1/file.txt`, `${outDir}/dir1/file.txt`],
      [`${inputDir}/dir1/nested/frominput.txt`, `${outDir}/dir1/nested/frominput.txt`],
      [`${inputDir}/dir2/bothpresent.txt`, `${outDir}/dir2/bothpresent.txt`],
    ].forEach(tuple => {
      expect(compareFiles(tuple[0], tuple[1]),
        `${tuple[0]} is not the same as ${tuple[1]}`
      ).to.be.true;
    });
  });
  after(() => {
    cleanOutDir();
  });
});