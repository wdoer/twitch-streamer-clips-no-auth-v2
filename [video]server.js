const ffmpeg = require('fluent-ffmpeg');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origins: ['*'] } });

// server
io.on('connection', (socket) => {
  socket.on('getStreamerClips', (streamer) => {
    getStreamerClips(streamer);
  })

  socket.on('renderVideo', (clipList) => {
    renderVideo(clipList)
  })
  // disconenct
  socket.on('disconnect', () => { })
})

http.listen(3000, () => { })

// get streamer clips
const getStreamerClips = async (streamer) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(`https://twitchtracker.com/${streamer}/clips#${getFormattedDate() - 1}-${getFormattedDate()}`);
  await page.waitForSelector('.clip-tp');

  const html = await page.content();
  const $ = cheerio.load(html);

  const clips = [];

  $('.clip-tp').each(function () {
    let clip = {}
    clip.url = `https:${$(this).attr('data-litebox')}`;
    clip.thumbnail = $(this).find('.clip-thumbnail').attr('src');
    clip.name = $(this).find('.clip-thumbnail').attr('alt');
    clip.duration = $(this).find('.clip-duration').text();
    clip.views = $(this).find('.clip-views').text();
    clip.date = $(this).find('.clip-created').text();

    clips.push(clip);
  });

  await browser.close();

  io.emit('getStreamerClips', clips);
};

const staticAssets = {
  start: 'https://twitch.slava001k.cyou/start.mp4',
  pere: 'https://twitch.slava001k.cyou/pere.mp4',
  intro: 'https://twitch.slava001k.cyou/intro.mp4'
}

const renderVideo = async (clipList) => {
  const formattedClipList = [];
  const command = ffmpeg();

  formattedClipList.push(staticAssets.start)
  clipList.forEach((el, idx, arr) => {
    formattedClipList.push(el.url)
    if (idx < arr.length - 1 && el.streamer !== arr[idx + 1].streamer) {
      formattedClipList.push(staticAssets.pere)
    }
  })
  formattedClipList.push(staticAssets.intro)

  // start render
  formattedClipList.forEach(el => {
    command.input(el)
  })



  command
    .complexFilter([
      `scale=w=1920:h=1080:force_original_aspect_ratio=decrease`,
      `setpts=PTS/60`
    ])
    .videoCodec('libx264')
    .audioCodec('aac')
    .videoBitrate('3000k')
    .fps(30)
    .mergeToFile(`_TWITCH-VIDEO/${getVideoName()}.mp4`)
    .on('error', err => console.log('err', err))
    .on('progress', progress => console.log('progress', progress))
    .on('end', () => console.log('finish'))
}

// utils funcs
function getFormattedDate() {
  return new Date().toJSON().slice(0, 10).replace(/-/g, '');
}

function getVideoName() {
  return Date.now();
}