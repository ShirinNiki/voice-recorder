var $ = jQuery;
///////////////////////////////////////////////////////////////////////////////
function progress(timeleft, timetotal, $element) {
    var progressBarWidth = (timetotal-timeleft) * $element.width() / timetotal;
    $element.find('div').animate({ width: progressBarWidth  }, 1000, 'linear').html(Math.floor((timetotal-timeleft)/60) + ":"+ (timetotal-timeleft)%60);
    if(timeleft > 0) {
        setTimeout(function() {
            progress(timeleft - 1, timetotal, $element);
        }, 1000);
    }
}
var params = {
    pID: translation.postID,
    uID: translation.USER_ID,
    audioURL : translation.AUDIO_URL,
};

if ($('#record').length ){
    var i=0;
    do_recording();
}
function do_recording(){
    console.log("find record");
    var recorder = new WzRecorder(config={
        onRecordingStop: function(blob) {          
            var url = URL.createObjectURL(blob);
            if($("#recordingList").length>0) {
                var li = document.createElement('li');
                var link = document.createElement('a');
                //name of .wav file to use during upload and download (without extendion)
                var filename = "recording_" + new Date().toISOString().slice(0,18);
                link.href = url;
                link.download = filename+".wav"; //download forces the browser to donwload the file using the  filename
                link.innerHTML = "Save";
                //add the filename to the li
                li.appendChild(document.createTextNode(filename+".wav "));
                //add the save to disk link to li
                li.appendChild(link);

                link = document.createElement('a');
                link.innerHTML = "upload as comment";
                link.id = "uploadA";           
                li.append(link);
                var recordingList = document.getElementById("recordingList");
                recordingList.appendChild(li);
                document.getElementById('uploadA').addEventListener('click',
            function () {
                var ajaxurl = translation.ajaxurl;
                var pid = translation.postID;
                var Uid = translation.USER_ID;
                var blob = recorder.getBlob();
                var filename = (new Date().toISOString()) ;
                var fd = new FormData();

                fd.append("audio_data", blob, filename);
                fd.append('action', 'upload_as_comment');
                fd.append('pID', pid);
                fd.append('uID', Uid);
                $('.waiting').css('display','block');
                jQuery.ajax({
                    url: ajaxurl,
                    method: 'POST',
                    data: fd,
                    processData: false,
                    contentType: false,
                    success: function (result) {
                        var link = '<a class="answer ' + 'ques' + '" href="' + result + '">link</a>';
                        $('.waiting').css('display', 'none');
                        $(".rec-link").append(link);
                        console.log(result);
                       // $('a').unbind('click', disableLink);
                        $('.voice-rec').click();
                        //$('.recording-part').css('display','none');
                        alert("Recording voice added as commeent");
                        location.reload();
                    }
                });
            }
        );
          }

        },
        onRecording: function(milliseconds) {
            document.getElementById('duration').innerText = milliseconds + 'ms';
        },
        visualizer:{
            element:  document.getElementById('moj'),
        },
    });
   
    document.getElementById("record").classList.add("notRec");
    document.getElementById("rec-duration").style.visibility = 'hidden';
    document.getElementById("record").addEventListener("click",function () {
        if ($('#uploadA').length ){ 
            var r = confirm("Are sure you want to reset the recording");
            if (r == true) {
                recorder.reset();
            var  ol = document.getElementById("recordingList");
            while (ol.firstChild) {
                ol.removeChild(ol.firstChild);
             }
            }
        }
        recorder.toggleRecording();
        if(document.getElementById("record").classList.contains('notRec')){
            document.getElementById("record").classList.remove("notRec");
            document.getElementById("record").classList.add("Rec");        
        }else{
            document.getElementById("record").classList.remove("Rec");
            document.getElementById("record").classList.add("notRec");
        }
        document.getElementById("rec-duration").style.visibility = 'visible';
    });
}
