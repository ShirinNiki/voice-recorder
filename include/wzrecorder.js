function WzRecorder(config) {

    config = config || {};

    var self = this;
    var audioInput;
    var audioNode;
    var bufferSize = config.bufferSize || 4096;
    var recordedData = [];
    var recording = false;
    var recordingLength = 0;
	var startDate;
	var audioCtx;
	var blob;
	var recordingList;
    URL = window.URL || window.webkitURL;
	
	this.toggleRecording = function()
	{
		recording ? self.stop() : self.start();
	};

	this.reset = function () {
        // reset any previous data
        if (recording)
            this.stop();

        // reset any previous data
        recordedData = [];
        recordingLength = 0;

    };

    this.start = function() {

		// reset any previous data
		recordedData = [];
		recordingLength = 0;
		
		// webkit audio context shim
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        if (audioCtx.createJavaScriptNode) {
            audioNode = audioCtx.createJavaScriptNode(bufferSize, 1, 1);
        } else if (audioCtx.createScriptProcessor) {
            audioNode = audioCtx.createScriptProcessor(bufferSize, 1, 1);
        } else {
            throw 'WebAudio not supported!';
        }

        audioNode.connect(audioCtx.destination);
       //
        navigator.mediaDevices.getUserMedia({audio: true})
            .then(onMicrophoneCaptured)
            .catch(function(err){
                console.log(err);
                self.micpermission = false;
                alert('Unable to access the microphone.');
            });
    };

    this.stop = function() {
        stopRecording(function(blob) {
			self.blob = blob;
			config.onRecordingStop && config.onRecordingStop(blob);
             config.onUploadRecording &&  config.onUploadRecording(self.blob);
        });
    };
    this.getBlob = function () {
        return self.blob;
    };

	this.upload = function ( params,blob) {
        var formData = new FormData();
       // console.log("audio222"+ self.blob);
       // formData.append("audio",  self.blob, config.filename || 'recording.wav');
        for (var i in params)
            formData.append(i, params[i]);
       createDownloadLink(blob);
    };
    this.makeDwLink = function (blob) {
        createDownloadlistLink(blob);
    };
    function createDownloadlistLink(blob) {
        var url = URL.createObjectURL(blob);
        var li = document.createElement('li');
        var link = document.createElement('a');

        //name of .wav file to use during upload and download (without extendion)
        var filename = new Date().toISOString().slice(0,18)
        link.href = url;
        link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
        link.innerHTML = "Save to disk";
        //add the filename to the li
        li.appendChild(document.createTextNode(filename+".wav "));
        //add the save to disk link to li
        li.appendChild(link);
        recordingList = document.getElementById("recordingList");
        //add the li element to the ol
        recordingList.appendChild(li);

    }

    function createDownloadLink(blob) { console.log("here1");
        var fd=new FormData();
        var filename = new Date().toISOString().slice(0,18);
        fd.append("audio_data",blob, filename);
        fd.append('action', 'my_action');
        var pid= translation.postID;
        fd.append('pID',pid);
        var Uid= translation.USER_ID;
        fd.append('uID',Uid);

        jQuery.ajax({
            url:ajaxurl,
            method : 'POST',
            data:fd ,
            //pID: 'test',
            processData: false,
            contentType: false,
            //dataType: 'html',
            success: function (result){
                //alert(result);
            }
        });
    }


    function stopRecording(callback) {
        // stop recording
        recording = false;

        // to make sure onaudioprocess stops firing
		window.localStream.getTracks().forEach( (track) => { track.stop(); });
        audioInput.disconnect();
        audioNode.disconnect();
		
        exportWav({
            sampleRate: sampleRate,
            recordingLength: recordingLength,
            data: recordedData
        }, function(buffer, view) {
            self.blob = new Blob([view], { type: 'audio/wav' });
            callback && callback(self.blob);

        });

    }

    function onMicrophoneCaptured(microphone) {

		if (config.visualizer)
			visualize(microphone);


		// save the stream so we can disconnect it when we're done
		window.localStream = microphone;

        audioInput = audioCtx.createMediaStreamSource(microphone);
        audioInput.connect(audioNode);

        audioNode.onaudioprocess = onAudioProcess;

        recording = true;
		self.startDate = new Date();
		
		config.onRecordingStart && config.onRecordingStart();
		sampleRate = audioCtx.sampleRate;
    }

    // function onMicrophoneError(e) {
	// 	console.log(e);
	// 	self.micpermission = false;
	// 	alert('Unable to access the microphone.');
    // }

    function onAudioProcess(e) {
        if (!recording) {
            return;
        }

        recordedData.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        recordingLength += bufferSize;

        self.recordingLength = recordingLength;
		self.duration = new Date().getTime() - self.startDate.getTime();

		config.onRecording && config.onRecording(self.duration);
    }

	
	function visualize(stream) {
		var canvas = config.visualizer.element;

		if (!canvas)
			return;
			
		var canvasCtx = canvas.getContext("2d");
		var source = audioCtx.createMediaStreamSource(stream);

		var analyser = audioCtx.createAnalyser();
		analyser.fftSize = 2048;
		var bufferLength = analyser.frequencyBinCount;
		var dataArray = new Uint8Array(bufferLength);

		source.connect(analyser);

		function draw() {
			// get the canvas dimensions
			var width = canvas.width, height = canvas.height;

			// ask the browser to schedule a redraw before the next repaint
			requestAnimationFrame(draw);

			// clear the canvas
			canvasCtx.fillStyle = config.visualizer.backcolor || '#232b56';

			canvasCtx.fillRect(0, 0, width, height);

			if (!recording)
				return;
			
			canvasCtx.lineWidth = config.visualizer.linewidth || 2;
			canvasCtx.strokeStyle = config.visualizer.forecolor || '#9a073c';

			canvasCtx.beginPath();

			var sliceWidth = width * 1.0 / bufferLength;
			var x = 0;

			
			analyser.getByteTimeDomainData(dataArray);

			for (var i = 0; i < bufferLength; i++) {
			
				var v = dataArray[i] / 128.0;
				var y = v * height / 2;

				i == 0 ? canvasCtx.moveTo(x, y) : canvasCtx.lineTo(x, y);
				x += sliceWidth;
			}
		
			canvasCtx.lineTo(canvas.width, canvas.height/2);
			canvasCtx.stroke();
		}
		
		draw();
	}
    function exportWav(config, callback) {
        function inlineWebWorker(config, cb) {

            var data = config.data.slice(0);
            var sampleRate = config.sampleRate;          
			data = joinBuffers(data, config.recordingLength);
		
            function joinBuffers(channelBuffer, count) {
                var result = new Float64Array(count);
                var offset = 0;
                var lng = channelBuffer.length;

                for (var i = 0; i < lng; i++) {
                    var buffer = channelBuffer[i];
                    result.set(buffer, offset);
                    offset += buffer.length;
                }

                return result;
            }

            function writeUTFBytes(view, offset, string) {
                var lng = string.length;
                for (var i = 0; i < lng; i++) {
                    view.setUint8(offset + i, string.charCodeAt(i));
                }
            }

            var dataLength = data.length;

            // create wav file
            var buffer = new ArrayBuffer(44 + dataLength * 2);
            var view = new DataView(buffer);
			
            writeUTFBytes(view, 0, 'RIFF'); // RIFF chunk descriptor/identifier
            view.setUint32(4, 44 + dataLength * 2, true); // RIFF chunk length
            writeUTFBytes(view, 8, 'WAVE'); // RIFF type
            writeUTFBytes(view, 12, 'fmt '); // format chunk identifier, FMT sub-chunk
            view.setUint32(16, 16, true); // format chunk length
            view.setUint16(20, 1, true); // sample format (raw)
            view.setUint16(22, 1, true); // mono (1 channel)
            view.setUint32(24, sampleRate, true); // sample rate
            view.setUint32(28, sampleRate * 2, true); // byte rate (sample rate * block align)
            view.setUint16(32, 2, true); // block align (channel count * bytes per sample)
            view.setUint16(34, 16, true); // bits per sample
            writeUTFBytes(view, 36, 'data'); // data sub-chunk identifier
            view.setUint32(40, dataLength * 2, true); // data chunk length

            // write the PCM samples
            var index = 44;
            for (var i = 0; i < dataLength; i++) {
                view.setInt16(index, data[i] * 0x7FFF, true);
                index += 2;
            }

            if (cb) {
                return cb({
                    buffer: buffer,
                    view: view
                });
            }

            postMessage({
                buffer: buffer,
                view: view
            });
        }

        var webWorker = processInWebWorker(inlineWebWorker);

        webWorker.onmessage = function(event) {
            callback(event.data.buffer, event.data.view);

            // release memory
            URL.revokeObjectURL(webWorker.workerURL);
        };

        webWorker.postMessage(config);
    }

    function processInWebWorker(_function) {
        var workerURL = URL.createObjectURL(new Blob([_function.toString(),
            ';this.onmessage = function (e) {' + _function.name + '(e.data);}'
        ], {
            type: 'application/javascript'
        }));

        var worker = new Worker(workerURL);
        worker.workerURL = workerURL;
        return worker;
    }
}
