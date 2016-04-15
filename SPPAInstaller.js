var Testing = function(context) {
    const tick = '\u{2705}'
    const cross = '\u{274C}'
    const groupIcon = '\u{1F4E6}'
    const skipIcon = '\u{1F648}'

    var requests_failed = 0
    var requests_skipped = 0
    var requests_succeeded = 0
    var assertions_failed = 0
    var assertions_succeeded = 0
    var testContext = null
    var reportRequest = null

    class TestRequest {
        constructor(request, nesting) {
            this.request = request
            this.nesting = nesting
            this.failed = false
        }

        test() {
            var rthis = this
            function assert(cond, msg) {
                rthis.assert(cond, msg)
            }

            function assertEqual(a, b, msg) {
                rthis.assertEqual(a, b, msg)
            }

            var request = this.request
            var exchange = request.getLastExchange();
            var testCode = this.getTestCode()
            if (exchange) {
                console.log(' '.repeat(this.nesting -1 ) + 'Testing request: ' + request.name + ' \u{1F551} ' + exchange.downloadTime + ' ms')
            } else {
                console.log(' '.repeat(this.nesting -1 ) + 'Testing request: ' + request.name)
            }
            

            if (!testCode || testCode === null) {
                this.skip('skipped no test code found')
                return
            }

            if (!exchange) {
                this.skip('skipped no exchange found')
                return
            }

            try {
                eval(testCode)
            } catch (e) {
                this.logError('\u{1F6E0} Failed to run tests: ' + e)
                requests_failed += 1
                return
            }
            
            if (this.failed) {
                requests_failed += 1   
            } else {
                requests_succeeded += 1
            }

        }

        skip(message) {
            requests_skipped += 1
            this.log(message || 'skipped')
        }

        getTestCode() {
            var des = this.request.description
            if (!des) {
                return null
            }
            des = des.split(/\#+\s*TESTS\s*\#*\s*\n/im)
            if (des.length > 1) {
                return des[1]
            }
            return null
        }

        assertEqual(testValue, expectedValue, message) {
            this.assert(testValue === expectedValue, message || 'Expected ' + expectedValue + ' but got ' + testValue)
        }

        assert(cond, message) {
            if (!cond) {
                this.logError(message || 'Assertion Failed')
                assertions_failed += 1
                this.failed = true
            } else {
                assertions_succeeded += 1
            }
        }

        log(message) {
            console.log(' '.repeat(this.nesting*4) + ' [' +this.request.name+ '] ' + message)
        }

        logError(message) {
            console.error(' '.repeat(this.nesting*4) + ' [' +this.request.name+ '] ' + message)
        }

    }

    class TestTree {
        constructor(items, nesting) {
            this.items = items
            this.nesting = nesting
        }

        test() {
            for (var item of this.items) {
                if (typeof item.url !== 'string' ) {
                    this.testGroup(item)
                } else {
                    this.testRequest(item)
                }
            }
        }

        log(message) {
            console.log(' '.repeat(this.nesting*4) + message)
        }

        logError(message) {
            console.error(' '.repeat(this.nesting*4) + message)
        }

        testGroup(group) {
            var subTree = new TestTree(group.getChildren(), this.nesting + 1)
            this.log(groupIcon + '[' + group.name + ']')
            subTree.test()
        }

        testRequest(request) {
            if (request === reportRequest) {
                return
            }
            var r = new TestRequest(request, this.nesting + 1)
            r.test()
        }
    }


    function evaluate(context){
        if (context.runtimeInfo.task != 'requestSend') { return 'Send this request to run tests your project'}
        testContext = context
        reportRequest = context.getCurrentRequest();

        console.log('------------------ RUNNINT TESTS ------------------')
        var t = new TestTree(context.getRootRequestTreeItems(), 0)
        t.test()
        const newLine = '\n\t  '

        console.log('------------------ TESTS SUMMARY ------------------')
        var report
        if (requests_failed === 0) {
            report = newLine + tick + 'All '+ requests_succeeded + ' requests passed.' + newLine +  skipIcon + requests_skipped + ' requests skipped.'
            console.log(report)
            console.log('------------------ FINISHED TESTS ------------------')
            return 'http://httpbin.org/status/200'
        }  else {
            const newLine = '\n\t     '
            report = newLine + cross + ' '+ requests_failed + ' requests failed.' + newLine + tick  + ' '+ requests_succeeded + ' requests passed.' + newLine +  skipIcon + ' '+ requests_skipped + ' requests skipped.'
            report += newLine + assertions_failed + ' of ' + (assertions_failed + assertions_succeeded) + ' assertions failed.'
            console.error(report)
            console.log('------------------ FINISHED TESTS ------------------')
            return 'http://httpbin.org/status/500'
        }
    }
    return evaluate(context);
}

var SPPAInstaller = function() {
    this.import = function(context, items, options) {
        var group = context.createRequestGroup('Testing');
        var request = context.createRequest('Report', 'GET');
        request.url = new DynamicString(new DynamicValue('com.luckymarmot.CustomDynamicValue', {
            'script': 'function evaluate(context){\nreturn (' + Testing.toString() + '\n)(context); }'
        }))
        group.appendChild(request);
        return true;
    }
}

SPPAInstaller.identifier = "com.luckymarmot.PawExtensions.SPPAInstaller"
SPPAInstaller.title = "SPPA Testing Installer"

registerImporter(SPPAInstaller)
