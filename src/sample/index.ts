window.addEventListener('load', () => {
  const SCAN_WORKER_COUNT = 8;
  const SCAN_INTERVAL = 16;
  const SCAN_SUCCESS = 500;
  const WORKER_FILE = 'worker.min.js';

  const rootTag = document.querySelector('span') as HTMLVideoElement;
  const videoTag = document.querySelector('video') as HTMLVideoElement;
  const canvasTag = document.querySelector('canvas') as HTMLCanvasElement;
  const directionTag = document.querySelector('select[name=direction]') as HTMLSelectElement;
  const laserTag = document.querySelector('div.laser') as HTMLHRElement;
  const codeTag = document.querySelector('label.code') as HTMLLabelElement;

  let scanTID = 0, foundTID = 0;

  const getWorker = () => {
    let worker = new Worker(WORKER_FILE + '?_=' + new Date().getTime());

    worker.addEventListener('message', (e) => {
      const msg = e.data.msg, index = e.data.index;
      if (msg === 'found') {
        window.clearTimeout(foundTID);
        codeTag.textContent = [
          `[${e.data.resolved.type}]${e.data.resolved.description}`,
          `TEXT:${e.data.resolved.text}`,
          `CODE:${e.data.resolved.code}`,
        ].join('\r\n');
        laserTag.classList.add('found');
        foundTID = window.setTimeout(() => laserTag.classList.remove('found'), SCAN_SUCCESS);
      }
      workers[index].active = false;
    });

    return worker;
  };

  const workers: {worker: Worker, index: number, active: boolean}[] = [];
  (() => {
    for (let i = 0; i < SCAN_WORKER_COUNT; i++) workers.push({worker: getWorker(), index: i, active: false});
  })();

  const startVideo = async () => {
    try {
      const mediaOption = {video: {facingMode: {exact: 'environment'}}, audio: false};
      const stream = await getStream(mediaOption);
      videoTag.srcObject = stream;
    } catch (ex) {
      const mediaOption = {video: {facingMode: 'user'}, audio: false};
      const stream = await getStream(mediaOption);
      videoTag.srcObject = stream;
    }

    scanTID = window.setInterval(scanImage, SCAN_INTERVAL);
  };

  const stopVideo = () => {
    window.clearInterval(scanTID);

    if (videoTag.srcObject instanceof MediaStream) {
      videoTag.srcObject.getTracks().forEach((track) => track.stop());
    }

    laserTag.style.display = 'none';
  };

  const getStream = async (mediaOption: MediaStreamConstraints) => new Promise<MediaStream>((resolve, reject) => {
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia(mediaOption).then((stream) => {
        setTimeout(() => resolve(stream), 0);
      }).catch((ex) => {
        reject(ex);
      });
    } else if (navigator.getUserMedia) {
      navigator.getUserMedia(mediaOption, (stream) => {
        setTimeout(() => resolve(stream), 0);
      }, (ex) => {
        reject(ex);
      });
    } else {
      reject('UserMedia API is not found.');
    }
  });

  const scanImage = () => {
    const idle = workers.filter((map) => !map.active);
    if (!idle.length) return;

    const context = canvasTag.getContext('2d');
    if (!context) return;

    const canvasWidth = canvasTag.clientWidth, canvasHeight = canvasTag.clientHeight;
    const videoWidth = videoTag.videoWidth, videoHeight = videoTag.videoHeight;
    const viewerWidth = videoTag.clientWidth, viewerHeight = videoTag.clientHeight;

    canvasTag.width = canvasWidth;
    canvasTag.height = canvasHeight;
    rootTag.style.width = viewerWidth + 'px';
    rootTag.style.height = viewerHeight + 'px';

    if (canvasWidth >= canvasHeight) {
      const viewerTop = Math.max(Math.floor((viewerHeight - canvasHeight) / 2), 0);
      laserTag.style.top = viewerTop + 'px';
      laserTag.style.height = canvasHeight + 'px';
      laserTag.style.left = laserTag.style.width = '';
      laserTag.style.display = 'block';

      const videoTop = Math.max(Math.floor((videoHeight - canvasHeight) / 2), 0);
      context.drawImage(videoTag, 0, videoTop, videoWidth, canvasHeight, 0, 0, canvasWidth, canvasHeight);
    } else {
      const viewerLeft = Math.max(Math.floor((viewerWidth - canvasWidth) / 2), 0);
      laserTag.style.left = viewerLeft + 'px';
      laserTag.style.width = canvasWidth + 'px';
      laserTag.style.top = laserTag.style.height = '';
      laserTag.style.display = 'block';

      const videoLeft = Math.max(Math.floor((videoWidth - canvasWidth) / 2), 0);
      context.drawImage(videoTag, videoLeft, 0, canvasWidth, videoHeight, 0, 0, canvasWidth, canvasHeight);
    }

    const options: {[key: string]: boolean} = {};
    const checkboxes = Array.prototype.slice.call(document.querySelectorAll('input[name="barcode-type"]'));
    checkboxes.forEach((checkbox: HTMLInputElement) => {
      options[checkbox.value] = checkbox.checked;
    });

    const size = {width: canvasWidth, height: canvasHeight};
    const canvasData = context.getImageData(0, 0, canvasWidth, canvasHeight);
    const imageData = new Uint8ClampedArray(canvasData.data);
    const map = idle[0];

    map.worker.postMessage({imageData, size, index: map.index, options});
    map.active = true;
  };

  directionTag.addEventListener('change', () => {
    const direction = directionTag.value;
    canvasTag.classList.remove('horizontal', 'vertical');
    canvasTag.classList.add(direction);
    laserTag.classList.remove('horizontal', 'vertical');
    laserTag.classList.add(direction);
  });

  directionTag.dispatchEvent(new Event('change'));

  document.getElementById('on-button')?.addEventListener('click', () => {
    startVideo().catch((e) => console.log(e));
  });

  document.getElementById('off-button')?.addEventListener('click', () => {
    stopVideo();
  });
});
