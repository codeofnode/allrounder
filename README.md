# allrounder

> It validate everything. From rest call to dbvalidation to system commands to unit tests. Just almost everything.

## Why Allrounder ?
#### Act as simple REST Client
> Just defined the request, with all entries eg url, method, body, headers then after execution, debug the response.

#### You can pipe the sesion from one execution to another
> Yes, can pipe the sessions. So that you can pass the session variables to another execution.
```
allrounder -p=pipeFile.json myfile.json
```

#### Re-usable components
> You can re-use a component (set of test cases) in a number of test suites. So you don't have to write same test case everywhere. Plus when its to modify, its a single place change.

#### Can use variables also for objects and at any depth
> It uses [templist](https://github.com/codeofnode/templist) engine to resolve the variables at run time.

#### Extractors
> You can chain a set of variables from one test case to another and even on other test suite

#### Assertions
> You can setup the various assertions with easy to use jsonpath syntax, as all the results are always available as json format.

#### Purely data driven
> As you provide json file for your test cases and all sort of configurations, allrounder supports purely data driven approach.

#### Remote json
> You can fetch the json file from remote server as well.
```
allrounder -f=http://myrestserver.com/allrounder-test-file.json
```

#### Looping
> You can loop through a set of array or number for single or batch of test cases

#### Act as curl for windows users and also as simplified curl for others
> Execute a request right on command line, with the simplest format
```
allrounder -e [method] https://myrestcallurl?withquery=parametersifany [<escaped-JSON-stringified-headers-or-jsonfilepath>] [<escaped-JSON-stringified-paylaod-or-jsonfilepath>]
```

#### Can do database validation
> Set `type` as `db` in test and provide a `dbname` eg mongodb, `dbconfig`, and payload in request entry.

#### Can call system commands
> Set `type` as `command` in test and provide a payload as string of complete command in request entry.

#### Suitable for unit testing as well
> Provide the `require` as which file to require, `method` as which method to test, `payload` as the arguments to pass, `async` to instruct if the call is async or not, `constructor` to tell if we are creating a new instance and so on.

#### All in one tool
> Say you want to do REST validation, db validation, also want to do unit testing, and also want to execute system commands, you don't need to hunt for various different tools, just go for `allrounder`. Its an all in one tool.

#### Granular level debugging
> You can provide jsonpath syntax to debug very specifically what you want to debug


#### Support of javascript APIs
> You can customize the request, jsonquery, logging etc as per your requirement with javascript APIs

#### Pre and Post hooks
> You can defined pre and post hook function handlers which initializing the options.

#### Conditon based execution
> You can setup condition based execution for any test case, with the property `condition` which is evaluated dynamically.

#### Beautifull reporting
> Uses mocha internally to display the results and diff beautifully on command line.

#### Easy to understand
> Its easy to understand a json file rather lines of code. So keeping data in jsonfile is always a smart choice.

#### Langauge independent
> Don't you think that being programming language independent is good move.

## Install

```
$ npm install [-g] allrounder
```

## Usage
> A very general usage is below. There are many more options available.

```
$ allrounder my-json-file.json
$ allrounder my-json-dir
```
