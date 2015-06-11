/*
WebWorkerFactory

Copyright (c) 2015 Tony Wallace - tonywallace.ca

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is furnished 
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF 
CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE 
OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

function WebWorkerFactory() {

	var _self = this;

	this.makeWorkerUsingScriptAtURL = function(url, onSuccess, onError) {
		_self.getContentsOfFileAtURL(
			url,
			function(fileContents) {
				var scriptBlob = new Blob([fileContents]);
				var scriptBlobURL = window.URL.createObjectURL(scriptBlob);
				var worker = new Worker(scriptBlobURL);
				if (typeof onSuccess == 'function') {
					onSuccess(worker);
				}
			},
			function(status, statusText) {
				if (typeof onError == 'function') {
					onError(status, statusText);
				}
			});
	}

	this.getContentsOfFileAtURL = function(url, onSuccess, onError) {
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.onreadystatechange = function() {
			if (request.readyState == 4) {
				if (request.status == 200) {
					if (typeof onSuccess == 'function') {
						onSuccess(request.responseText);
					}
				} else {
					if (typeof onError == 'function') {
						onError(request.status, request.statusText);
					}
				}
			}
        }
        request.send();
	}

}