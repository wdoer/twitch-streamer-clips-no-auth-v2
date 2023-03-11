<template>
  <main class="main">
    <v-text-field
      v-model="tags"
      label="Теги"
      size="10"
      variant="outlined"
      density="compact"
      single-line
      hide-details
      class="mb-2"
      @change="saveTagsToLS()"
    ></v-text-field>
    <div class="category__wrapper">
      <div class="category-chips__box">
        <v-chip
          v-for="categoryItem in category.items"
          :key="categoryItem.name"
          color="primary"
          :variant="categoryItem.isSelected ? 'elevated' : 'outlined'" 
          :closable="category.editMode"
          @click:close="deleteCategory(categoryItem)"
          @click="selectCategory(categoryItem)"
        >
          {{ categoryItem.name }} 
          <sup>{{ categoryItem?.streamers?.length ?? '0' }}</sup>
        </v-chip>
        <!-- end category items -->
        <template v-if="category.editMode">
          <div class="category-form__box">
            <v-text-field
              v-model="category.addCategoryName"
              label="Название категории"
              variant="outlined"
              density="compact"
              single-line
              hide-details
              class="mr-2"
              append-inner-icon="mdi-plus"
              @click:append-inner="addNewCategory(category.addCategoryName)"
            ></v-text-field>
          </div>
        </template>
        <!-- end category edit mode -->
        <v-btn
          v-if="!category.editMode"
          size="x-small"
          color="primary"
          icon="mdi-table-edit"
          @click="category.editMode = true"
        ></v-btn>
        <v-btn
          v-if="category.editMode"
          size="x-small"
          color="primary"
          icon="mdi-close"
          @click="category.editMode = false"
        ></v-btn>
        <!-- end open/close category edit buttons -->
      </div>
      <div 
        v-if="category.selectedCategory !== null" 
        class="category-chips-streamers__box"
      >
        <v-chip
          v-for="streamer in category.selectedCategory.streamers"
          :variant="streamer.isSelected ? 'elevated' : 'outlined'" 
          color="primary"
          class=""
          :key="streamer.nick"
          :closable="category.streamersEditMode"
          @click:close="deleteStreamer(streamer.nick)"
          @click="selectStreamer(streamer)"
        >
          {{ streamer.nick }}
        </v-chip>
        <!-- end streamers -->
        <template v-if="category.streamersEditMode">
          <div class="category-form__box">
            <v-text-field
              v-model="category.addStreamerNick"
              label="Ник"
              variant="outlined"
              density="compact"
              single-line
              hide-details
              class="mr-2"
              append-inner-icon="mdi-plus"
              @click:append-inner="addNewStreamer(category.addStreamerNick)"
            ></v-text-field>
          </div>
        </template>
        <!-- end streamers edit mode-->
        <v-btn
          v-if="!category.streamersEditMode"
          size="x-small"
          color="primary"
          icon="mdi-table-edit"
          @click="category.streamersEditMode = true"
        ></v-btn>
        <v-btn
          v-if="category.streamersEditMode"
          size="x-small"
          color="primary"
          icon="mdi-close"
          @click="category.streamersEditMode = false"
        ></v-btn>
        <!-- end open/close streamers edit buttons -->
      </div>
    </div>
    <div class="clips__wrapper">
      <div
        v-for="clip in clips"
        :key="clip.url"
        class="clip"
      >
        <span
          v-if="!clip.isWatched" 
          class="title"
        >
          {{ clip.name }}
        </span>
        <a 
          :href="clip.url"
          target="_blank"
        >
          <img 
            v-if="!clip.isWatched"
            :src="clip.thumbnail"
            :alt="clip.title"
          />
          <video 
            v-if="clip.isWatched"
            :src="clip.videoUrl"
            autoplay
          ></video>
        </a>
        <div v-if="!clip.noclips" class="action-buttons">
          <v-btn
            icon
            size="x-small"
            color="primary"
            @click="watchClip(clip)"
          >
            <v-icon 
              :icon="`mdi-eye${clip.isWatched ? '-off' : ''}-outline`"
            ></v-icon>
          </v-btn>
          <a 
            :href="clip.videoUrl"
          >
            <v-btn
              icon
              size="x-small"
              color="primary"
            >
              <v-icon 
                icon="mdi-download"
              ></v-icon>
            </v-btn>
          </a>
        </div>
        <div
          v-if="!clip.isWatched && !clip.noclips"
          class="content"
        >
          <span class="views">{{ clip.views }} ({{ clip.duration }})</span>
          <span class="date">{{ clip.date }}</span>
        </div>
      </div>
    </div>
    <!-- end clips -->
  </main>
</template>

<script>
import { defineComponent } from 'vue';

import { io } from 'socket.io-client';

export default defineComponent({
  name: 'dashboard',
  data: () => ({
    socket: null,
    category: {
      editMode: false,
      streamersEditMode: false,
      addCategoryName: '',
      addStreamerNick: '',
      selectedCategory: null,
      selectedStreamer: null,
      items: [],
    },
    clips: [],
    tags: '',
  }),
  created() {
    this.getCategoriesFromLS();
    this.getTagsFromLS();

    this.socket = io(process.env.VUE_APP_SOCKET_ENDPOINT)
    this.socket.on('getStreamerClips', (data) => {
      data.forEach(el => {
        el.isWatched = false;
        el.videoUrl = el.thumbnail.replace('-preview-480x272.jpg', '.mp4');
      })

      this.clips = data;
    })
  },
  mounted() {
    this.category.items.forEach(el => {
      el.isSelected = false
      el.streamers.forEach(el => el.isSelected = false)
    });
  },
  beforeUnmount() {
    this.socket.disconnect();
  },
  watch: {
    'category.selectedStreamer'(val) {
      this.clips = [];
      this.socket.emit('getStreamerClips', val.nick)

      navigator.clipboard.writeText(`${this.tags} #${val.nick}`);
    },
  },
  methods: {
    addNewCategory(categoryName) {
      this.category.items.push({ name: categoryName, isSelected: false, streamers: [] }); // add new category
      this.category.addCategoryName = ''; // reset new category name
      this.category.editMode = false; // close category edit mode

      this.saveCategoriesToLS()
    },
    selectCategory(categoryItem) {
      this.category.selectedCategory = categoryItem // make selected category
      this.category.items.forEach(el => el.isSelected = false) // unselected all category items
      categoryItem.isSelected = true // make current category - selected
    },
    selectStreamer(streamerItem) {
      this.category.selectedStreamer = streamerItem
      this.category.selectedCategory.streamers.forEach(el => el.isSelected = false)
      streamerItem.isSelected = true
    },
    deleteCategory(categoryItem) {
      this.category.items = this.category.items.filter(el => el.name !== categoryItem.name);
      this.category.editMode = false;

      this.saveCategoriesToLS()
    },
    addNewStreamer(streamerNick) {
      if(!this.category.selectedCategory?.streamers.find(el => el.nick === streamerNick)) {
        this.category.selectedCategory.streamers.push({ nick: streamerNick, isSelected: false })
      }
      this.category.addStreamerNick = ''

      this.saveCategoriesToLS()
    },
    deleteStreamer(streamerNick) {
      this.category.selectedCategory.streamers = this.category.selectedCategory.streamers.filter(el => el.nick !== streamerNick)
      this.category.streamersEditMode = false;

      this.saveCategoriesToLS()
    },
    saveCategoriesToLS() {
      localStorage.setItem('categories', JSON.stringify(this.category.items))
    },
    getCategoriesFromLS() {
      this.category.items = JSON.parse(localStorage.getItem('categories')) ?? [];
    },
    watchClip(clip) {
      this.clips.forEach(el => {
        if (el.url === clip.url) return el.isWatched = !el.isWatched;
        el.isWatched = false
      })  
    },
    saveTagsToLS() {
      localStorage.setItem('tags', JSON.stringify(this.tags))
    },
    getTagsFromLS() {
      this.tags = JSON.parse(localStorage.getItem('tags')) ?? [];
    },
  }
});
</script>

<style lang="stylus">
*
  user-select none
  text-decoration none
.main
  padding: 20px
  > div
    margin-bottom 10px
h2
  margin-bottom 10px
.category
  &-form__box
    width 250px
    display flex
  &-chips__box, &-chips-streamers__box
    margin-bottom 5px
    height: auto
    display flex
    align-items center
    justify-content flex-start
    flex-wrap wrap
    gap 5px
.clips__wrapper, .clips-to-video__wrapper, .video-assets__wrapper, .clips-to-tiktok__wrapper
  display flex
  flex-wrap wrap
  align-items flex-start
  justify-content flex-start
  gap 10px
.clip
  position relative
  width 300px
  height 200px
  img, video
    width 100%
    height 100%
    object-fit contain
  span
    color #fff
  .action-buttons
    position absolute
    top 0
    bottom 0
    right 10px
    display flex
    align-items center
    justify-content center
    flex-direction column
    gap 3px
  .title
    position absolute
    top 0
    left 0
    background #912f85cc
    width 100%
    max-height 50px
    text-align center
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    white-space: normal;
    font-size 15px
  .content
    position absolute
    bottom 0
    left 0
    width 100%
    padding 0 10px
    display flex
    justify-content space-between
    background #912f85cc
</style>