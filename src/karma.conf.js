// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const fs = require('node:fs');
const path = require('node:path');

/**
 * New code, as globs relative to the repository root. `pnpm test:coverage`
 * fails when a TypeScript file matched here has less than
 * NEW_CODE_MIN_COVERAGE percent of its statements or of its lines covered by
 * unit tests, or when no unit test loads it. Add every new folder, and every
 * new file in a folder that is not listed, in the commit that creates it
 * (see "Coverage of new code" in docs/ARCHITECTURE.md). Only code under src/
 * can be listed: the test build instruments nothing else.
 */
const NEW_CODE = [
  'src/app/profile/**',
  'src/brew-session/**',
  'src/classes/changeTracking/**',
  'src/classes/settings/settingsSecrets.ts',
  'src/services/attachmentManifest/**',
  'src/services/changeTracking/**',
  'src/services/deletionJournal/**',
  'src/services/deviceIdentity/**',
  'src/services/documentLanguage/**',
  'src/services/tabletLayout/**',
  'src/services/theme/theme-plugins.ts',
];
const NEW_CODE_MIN_COVERAGE = 80;

const REPOSITORY = path.join(__dirname, '..');
const COVERAGE_DIR = path.join(REPOSITORY, 'coverage');
const COVERAGE_SUMMARY = path.join(COVERAGE_DIR, 'coverage-summary.json');

/** Specs, the helpers in `__tests__` folders and declarations are not checked. */
function isCheckedFile(file) {
  return (
    file.endsWith('.ts') &&
    !file.endsWith('.spec.ts') &&
    !file.endsWith('.d.ts') &&
    !file.split('/').includes('__tests__')
  );
}

/**
 * Whether istanbul counts statements in the file. A file with only types or
 * re-exports compiles to imports and exports alone, so no test has to load it.
 * Istanbul does not count `export default <value>` either, only the functions
 * inside the value.
 */
function hasStatements(file) {
  const ts = require('typescript');
  const { outputText } = ts.transpileModule(
    fs.readFileSync(path.join(REPOSITORY, file), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.ESNext } },
  );
  const containsFunction = (node) =>
    ts.isFunctionLike(node) || ts.forEachChild(node, containsFunction) === true;
  return ts
    .createSourceFile('output.js', outputText, ts.ScriptTarget.Latest)
    .statements.some((statement) =>
      ts.isExportAssignment(statement)
        ? containsFunction(statement.expression)
        : !ts.isImportDeclaration(statement) &&
          !ts.isExportDeclaration(statement),
    );
}

/** Checks the new code against the coverage summary; returns the problems. */
function checkNewCode() {
  if (!fs.existsSync(COVERAGE_SUMMARY)) {
    return [
      'No coverage summary: run with --code-coverage and list coverage-istanbul before new-code-coverage in the reporters.',
    ];
  }
  const summary = JSON.parse(fs.readFileSync(COVERAGE_SUMMARY, 'utf8'));
  const problems = [];
  const files = new Set();
  for (const glob of NEW_CODE) {
    const matches = fs
      .globSync(glob, { cwd: REPOSITORY })
      .map((file) => file.split(path.sep).join('/'))
      .filter(isCheckedFile);
    if (matches.length === 0) {
      problems.push(
        `NEW_CODE in src/karma.conf.js: ${glob} matches no TypeScript file (list a folder as 'folder/**').`,
      );
    }
    matches.forEach((file) => files.add(file));
  }

  const rows = [];
  for (const file of [...files].sort()) {
    const coverage = summary[path.join(REPOSITORY, file)];
    if (!coverage) {
      if (hasStatements(file)) {
        rows.push(`  ${'not loaded'.padStart(19)}  ${file}`);
        problems.push(`${file} is new code, but no unit test loads it.`);
      }
      continue;
    }
    const { statements, lines } = coverage;
    if (statements.total === 0) {
      // Loaded by a test, but there is nothing to cover (see hasStatements).
      continue;
    }
    rows.push(
      `  ${`${statements.pct} %`.padStart(10)} ${`${lines.pct} %`.padStart(8)}  ${file}`,
    );
    for (const [metric, { pct }] of Object.entries({ statements, lines })) {
      if (pct < NEW_CODE_MIN_COVERAGE) {
        problems.push(
          `${file}: ${pct} % of the ${metric} covered, at least ${NEW_CODE_MIN_COVERAGE} % needed.`,
        );
      }
    }
  }
  console.log(
    [
      `New code (NEW_CODE in src/karma.conf.js), at least ${NEW_CODE_MIN_COVERAGE} % per file:`,
      '  statements    lines  file',
      ...rows,
    ].join('\n'),
  );
  return problems;
}

/**
 * Fails the run when the new code misses NEW_CODE_MIN_COVERAGE. It reads the
 * summary that coverage-istanbul writes when the run completes, so it is
 * listed after it (`coverage` configuration of the test target in
 * angular.json). The thresholds of coverage-istanbul cannot do this: the
 * Angular builder points Karma's basePath at its temporary output folder, so
 * globs relative to the repository never match, and its coverage map only
 * knows the files that a test loads.
 */
function NewCodeCoverageReporter(config, logger) {
  const log = logger.create('new-code-coverage');

  // A summary left over from an earlier run must not pass for this one.
  this.onRunStart = () => fs.rmSync(COVERAGE_SUMMARY, { force: true });

  this.onRunComplete = (browsers, results) => {
    const problems = checkNewCode();
    problems.forEach((problem) => log.error(problem));
    if (problems.length > 0 && config.singleRun) {
      results.exitCode = 1;
    }
  };
}
NewCodeCoverageReporter.$inject = ['config', 'logger'];

module.exports = function (config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage-istanbul-reporter'),
      { 'reporter:new-code-coverage': ['type', NewCodeCoverageReporter] },
    ],
    client: {
      clearContext: false, // leave Jasmine Spec Runner output visible in browser
    },
    coverageIstanbulReporter: {
      dir: COVERAGE_DIR,
      // json-summary is read by the new-code-coverage reporter.
      reports: ['html', 'lcovonly', 'json-summary', 'text-summary'],
      fixWebpackSourcePaths: true,
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeHeadlessNoSandbox'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox'],
      },
    },
    singleRun: false,
  });
};
