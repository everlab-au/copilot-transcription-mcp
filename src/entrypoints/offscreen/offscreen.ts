console.log('Offscreen document loaded');
let recorder;
let chunks = [];

chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'start-recording') {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: msg.streamId,
        },
      },
      video: false,
    });

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      chrome.runtime.sendMessage({ type: 'AUDIO_CAPTURE_COMPLETE', url });
      chunks = [];
    };

    recorder.start();
    window.location.hash = 'recording';
  }

  if (msg.type === 'stop-recording') {
    recorder?.stop();
    recorder?.stream.getTracks().forEach((t) => t.stop());
    window.location.hash = '';
  }
});
