/**
 **  $Id: js_sort_mozrepl.js 1 2009-05-05 14:27:50Z vivekmb $
 **
 **  This file includes routines for testing JavaScript array sorting performance.
 **  It implements a simulated Bookmark data structure and then allows you to sort 
 **  various numbers of random bookmarks and by various sort fields.
 **
 **  In order to use this and not get "Unresponsive Script" warnings from Firefox,
 **  I had to go to about:config and set these two variables:
 **
 **  dom.max_chrome_script_run_time = 300
 **  dom.max_script_run_time = 300
 **
 **  I did my tests using MozRepl. I connected to Firefox 2.0 on my PowerBook G4
 **  using Aquamacs. I sourced this file with C-c C-s and then executed tests
 **  in the *Moz* buffer.
 **
 **  Marc Abramowitz <marca@yahoo-inc.com>, 2007-02-01
 **/

function Bookmark(name, url, visit_count, last_visit_date) { 
    this.name = name; 
    this.url = url; 
    this.visit_count = visit_count; 
    this.last_visit_date = last_visit_date; 
}

var comparator = {
    str:              function(a, b) { return a < b ? -1 : a > b ? +1 : 0; },
    name:             function(a, b) { var an = a.name, bn = b.name; return an < bn ? -1 : an > bn ? +1 : 0; },
    url:              function(a, b) { var au = a.url, bu = b.url; return au < bu ? -1 : au > bu ? +1 : 0; },
    visit_count:      function(a, b) { return b.visit_count - a.visit_count; },
    last_visit_date:  function(a, b) { return b.last_visit_date - a.last_visit_date; }
};

function randomNum(min, max) {
    return min + (max - min) * Math.random();
}

function randomString(len) {
    var result = new String;
    for (var i = 0; i < len; i++) {
        result += String.fromCharCode(randomNum(65, 90));
    }
    return result;
}

function getRandomBookmark() {
    return new Bookmark(randomString(100), randomString(50), randomNum(1, 32), new Date().getTime()); 
}

function getRandomBookmarkArray(size) {
    var ret = [];
    for (var i = 0; i < size; i++) {
        ret[i] = getRandomBookmark();
    }
    return ret;
}

function doTimeSortTestSingleIteration(size, comparator) {
    var bookmarkArray, startTime, endTime;

    bookmarkArray = getRandomBookmarkArray(size);
    
    startTime = new Date();
    bookmarkArray = bookmarkArray.sort(comparator);
    endTime = new Date();
    
    return endTime - startTime;
}

function doTimeSortTest(size, comparator) {
    var minTime = Number.MAX_VALUE, maxTime = 0, deltaTime, sumTime = 0, i;

    const numIterations = 10;

    for (var i = 0; i < numIterations; i++) {
        deltaTime = doTimeSortTestSingleIteration(size, comparator);
        //deltaTime = exper(size);
        repl.print("Iteration: " + i + ": Time to sort " + size + " bookmarks: " + deltaTime + " ms");
        sumTime += deltaTime;
        if (deltaTime < minTime) minTime = deltaTime;
        if (deltaTime > maxTime) maxTime = deltaTime;
    }

    repl.print("For " + numIterations + " iterations: " + 
               "mean = " + (sumTime / numIterations) + " ms; " +
               "min = " + minTime + " ms; " +
               "max = " + maxTime + " ms; ");
}

function exper(size) {
    var bookmarkArray, indexArray, startTime, endTime;

    bookmarkArray = getRandomBookmarkArray(size);
 
    startTime = new Date();
    indexArray = [];
    for (var i = bookmarkArray.length - 1; i >= 0; i--) {
        indexArray[i] = bookmarkArray[i].name + "\001" + i;
    }
    indexArray = indexArray.sort();
    endTime = new Date();
    
    return endTime - startTime;
}

function testStringArraySort(size, comparator) {
    var arr = [], startTime, endTime;

    for (var i = 0; i < size; i++) {
        arr[i] = {}; arr[i].str = randomString(100);
    }

    startTime = new Date();
    if (comparator) arr = arr.sort(comparator); else arr = arr.sort();
    endTime = new Date();
    
    if (comparator) {
        repl.print("Time to sort " + size + " strings with custom  comparator: " +  (endTime - startTime) + " ms");
    } else {
        repl.print("Time to sort " + size + " strings with default comparator: " +  (endTime - startTime) + " ms");
    }
}

