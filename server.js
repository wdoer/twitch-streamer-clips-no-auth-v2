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

  socket.on('downloadVideo', (clipList) => {
    downloadVideos(clipList)
  })
  // disconenct
  socket.on('disconnect', () => { })
})

http.listen(3000, () => { })

// get streamer clips
const getStreamerClips = async (streamer) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`https://twitchtracker.com/${streamer}/clips#${getFormattedDate() - 1}-${getFormattedDate() - 1}`);
    await page.waitForSelector('.clip-tp', { timeout: 5000 });
  } catch (err) {
    const noClips = [
      {
        name: 'Клипов нет',
        thumbnail: 'https://sitechecker.pro/wp-content/uploads/2017/12/404.png',
        noclips: true,
      }
    ];
    io.emit('getStreamerClips', noClips)
    return;
  }

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

// utils funcs
function getFormattedDate() {
  return new Date().toJSON().slice(0, 10).replace(/-/g, '');
}