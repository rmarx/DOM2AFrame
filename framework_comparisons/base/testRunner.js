var parseQueryString = function(url) {
  var urlParams = {};
  url.replace(
    new RegExp("([^?=&]+)(=([^&]*))?", "g"),
    function($0, $1, $2, $3) {
      urlParams[$1] = $3;
    }
  );
  
  return urlParams;
}

class TestRunner{
    constructor(){
        this.results = new Map();
        this.testPaths = [];
        this.testPaths.push( "/framework_comparisons/html2canvas/" );
        this.testPaths.push( "/framework_comparisons/rasterizeHTML/" );
        this.testPaths.push( "/framework_comparisons/dom2aframe/" );
    }

    GetNextTestPath(){
        let currentPath = window.location.pathname;
        let currentIndex = this.testPaths.indexOf( currentPath );
        if( currentIndex == -1 ){
            console.error("TestRunner:GetNextTestPath : unknown current test path!", window.location.pathname, this.testPaths);
            return undefined;
        }
        else{
            if( currentIndex < (this.testPaths.length - 1))
                return this.testPaths[currentIndex + 1];
            else
                return undefined;
        }
    }

    LogResult(key, value){
        //console.log("Logging result", key, value); 

        let buffer = undefined;
        if( !this.results.has(key) )
            this.results.set(key, new Array() );

        buffer = this.results.get(key);

        buffer.push(value);
    }

    Start(timeout = 3000){
        this.running = true;

        let urlParams = parseQueryString( window.location.search );
        if( !urlParams.currentRun ){
            urlParams.currentRun = 1;
        }
        else
            urlParams.currentRun = parseInt(urlParams.currentRun);
        if( !urlParams.totalRuns )
            urlParams.totalRuns = 10;
        else
            urlParams.totalRuns = parseInt(urlParams.totalRuns);

        if( urlParams.clear ){ // easier for testing
            window.sessionStorage.clear();
            urlParams.currentRun = 1;
        }

        let storageKey = "testResults";//_" + window.location.pathname;
        let currentTestcase = window.location.pathname;

        if( urlParams.currentRun != urlParams.totalRuns ){

            // triggers after all the test are done // TODO: make this separate method and don't use setTimeout but actual call from the program! 
            setTimeout(() =>{

                let resultStorage = window.sessionStorage.getItem(storageKey);
                if( !resultStorage ){
                    resultStorage = {};
                    resultStorage.testCases = {};
                }
                else{
                    resultStorage = JSON.parse(resultStorage);
                }

                // cannot simply stringify a JS Map, so need to convert it to object ourselves
                let resultObject = Object.create(null);
                for (let [k,v] of this.results) {
                    resultObject[k] = v;
                }

                let testcaseResults = undefined;
                if( !resultStorage.testCases[ currentTestcase ] ){
                    testcaseResults = {};
                    testcaseResults.testcase = "" + location.pathname;
                    testcaseResults.runs = new Array();

                    resultStorage.testCases[ currentTestcase ] = testcaseResults;
                }
                else
                    testcaseResults = resultStorage.testCases[ currentTestcase ];
                
                testcaseResults.runs.push( resultObject );
                
                window.sessionStorage.setItem( storageKey, JSON.stringify(resultStorage) );
                window.location.href = [location.protocol, '//', location.host, location.pathname].join('') + "?test=true&currentRun=" + (urlParams.currentRun+1) + "&totalRuns=" + urlParams.totalRuns;
            }
            ,timeout);
        }
        else{
            let nextPath = this.GetNextTestPath();
            if( nextPath ){
                window.location.href = [location.protocol, '//', location.host, nextPath].join('') + "?test=true&totalRuns=" + urlParams.totalRuns;
            }
            else{
                var text = document.createElement('textarea');
                text.innerHTML = ""+ window.sessionStorage.getItem(storageKey);


                document.body.appendChild(text);
                sessionStorage.clear();
                this.running = false;
            }
        }
        
    }
};

window.testRunner = new TestRunner();