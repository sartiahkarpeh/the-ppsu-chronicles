const NodeMediaServer = require('node-media-server');

const config = {
  logType: 3, // Full debug logging
  rtmp: {
    port: 1935,
    chunk_size: 60000,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*'
  },
  trans: {
    ffmpeg: "C:/Program Files/ffmpeg-2025-08-07-git-fa458c7243-full_build/bin/ffmpeg.exe",
    tasks: [
      {
        app: 'live',
        hls: true,
        hlsFlags: '[hls_time=2:hls_list_size=5:hls_flags=delete_segments]',
        dash: false
      }
    ]
  }
};

const nms = new NodeMediaServer(config);

nms.on('postPublish', (id, streamPath, args) => {
  console.log(`[Stream Started] ID=${id} PATH=${streamPath}`);
});

nms.on('donePublish', (id, streamPath, args) => {
  console.log(`[Stream Stopped] ID=${id} PATH=${streamPath}`);
});

nms.run();
