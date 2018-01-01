'use strict';

const Base = require('mocha').reporters.Base;
Base.colors.pass = 34;
Base.colors.debugblock = 35;
Base.colors.debughead = 95;
Base.colors.debug = 0;
const inherits = require('mocha/lib/utils').inherits;
const NodeUtils = require('util');
const fs = require('fs');
const color = Base.color;

const cursor = Base.cursor;
const STDOUT = process.stdout;

exports = module.exports = AllRounderReporter;

function AllRounderReporter (runner, options) {
  Base.call(this, runner);

  let self = this;
  let indents = 0;
  let suiteName;
  let firstSuiteName;
  let outputFileStarted = false;
  let n = 0;
  if (options.reporterOptions.output) {
    if (!fs.createWriteStream) {
      throw new Error('file output not supported in browser');
    }
    try {
      fs.unlinkSync(options.reporterOptions.output);
    } catch(er) {
    }
    self.fileStream = fs.createWriteStream(options.reporterOptions.output);
    self.fileStream.once('error', function(err){ throw err; });
    suiteName = options.reporterOptions.suiteName;
  }

  function indent () {
    return Array(indents).join('  ');
  }

  runner.on('test', function (test) {
    if (test.ARdisabled) return;
    STDOUT.write(indent() + color('pending', '-->') + ' ' + color('medium', test.title) + ' ');
  });

  runner.on('suite', function (suite) {
    firstSuiteName = firstSuiteName ? false: suite.title;
    ++indents;
    console.log(color('suite', '%s%s'), indent(), suite.title);
  });

  runner.on('suite end', function () {
    --indents;
    if (indents === 1) {
      console.log();
    }
  });

  runner.on('pending', function (test) {
    if (test.ARdisabled) return;
    var fmt = indent() + color('pending', '  - %s');
    console.log(fmt, test.title);
  });

  function getTestTitle(test) {
    return  '['+test.ARtestIndex+'] '+test.title;
  }

  function printLogForTest(test){
    if (Array.isArray(test.ARdebuggedLogs) && test.ARdebuggedLogs.length && (test.ARdebuggedFor === 'P' || test.state !== 'passed')) {
      if (self.fileStream) {
        self.fileStream.write((outputFileStarted ? '' : '[\n') + JSON.stringify({
          title: test.title,
          index: test.ARtestIndex,
          failures: test.state !== 'passed'?NodeUtils.inspect(self.failures[self.failures.length - 1]):null,
          state: test.state,
          speed: test.speed,
          duration: test.duration,
          log: test.ARdebuggedLogs
        }, null, 2) + ',\n');
        outputFileStarted = true;
      } else {
        ++indents;
        test.ARdebuggedLogs.forEach(function(dl) {
          ++indents;
          console.log(indent() + color('debugblock', '  %s:'), dl[0]);
          dl[1].forEach(function(dl) {
            ++indents;
            console.log(indent() + color('debughead', '  %s:'), dl[0]);
            ++indents;
            console.log(indent() + '  '+ color('debug', typeof dl[1] === 'string' ? dl[1]: JSON.stringify(dl[1], null, 2).split('\n').join('\n  '+indent())));
            --indents;
            --indents;
          });
          --indents;
        });
        delete test.ARdebuggedLogs;
        --indents;
      }
    }
  }

  runner.on('pass', function (test) {
    cursor.CR();
    if (test.ARdisabled) return;
    var fmt;
    if (test.speed === 'fast') {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s');
      console.log(fmt, getTestTitle(test));
    } else {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s') +
        color(test.speed, ' (%dms)');
      console.log(fmt, getTestTitle(test), test.duration);
    }
    printLogForTest(test);
  });

  runner.on('fail', function (test, err) {
    cursor.CR();
    if (test.ARdisabled) return;
    console.log(indent() + color('fail', '  %d) %s'), ++n, getTestTitle(test));
    printLogForTest(test);
  });

  runner.on('end', function(){
    self.epilogue.apply(self,arguments);
    const stats = self.stats;
    if (self.fileStream) {
      self.fileStream.end((outputFileStarted ? '' : '[\n') + JSON.stringify({
        name: suiteName || firstSuiteName || 'Allrounder Tests',
        tests: stats.tests,
        failures: stats.failures,
        errors: stats.failures,
        skipped: stats.tests - stats.failures - stats.passes,
        timestamp: (new Date()).toUTCString(),
        time: (stats.duration / 1000) || 0
      }, null, 2) + '\n]');
    }
  });
}

inherits(AllRounderReporter, Base);
