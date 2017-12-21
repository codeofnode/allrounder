'use strict';

const Base = require('mocha').reporters.Base;
Base.colors.pass = 34;
Base.colors.debugblock = 35;
Base.colors.debughead = 95;
Base.colors.debug = 0;
const inherits = require('mocha/lib/utils').inherits;
const color = Base.color;

const cursor = Base.cursor;
const STDOUT = process.stdout;

exports = module.exports = AllRounderReporter;

/**
 * Initialize a new `AllRounderReporter` test reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function AllRounderReporter (runner) {
  Base.call(this, runner);

  var self = this;
  var indents = 0;
  var n = 0;

  function indent () {
    return Array(indents).join('  ');
  }

  runner.on('test', function (test) {
    if (test.ARdisabled) return;
    STDOUT.write(indent() + color('pending', '-->') + ' ' + color('medium', test.title) + ' ');
  });

  runner.on('suite', function (suite) {
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

  function printLogForTest(test){
    if (Array.isArray(test.ARdebuggedLogs) && test.ARdebuggedLogs.length && (test.ARdebuggedFor === 'P' || test.state !== 'passed')) {
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
      --indents;
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
      console.log(fmt, test.title);
    } else {
      fmt = indent() +
        color('checkmark', '  ' + Base.symbols.ok) +
        color('pass', ' %s') +
        color(test.speed, ' (%dms)');
      console.log(fmt, test.title, test.duration);
    }
    printLogForTest(test);
  });

  runner.on('fail', function (test) {
    cursor.CR();
    if (test.ARdisabled) return;
    console.log(indent() + color('fail', '  %d) %s'), ++n, test.title);
    printLogForTest(test);
  });

  runner.on('end', self.epilogue.bind(self));
}

inherits(AllRounderReporter, Base);
