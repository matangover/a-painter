/* global AFRAME, THREE */

/**
*/
AFRAME.registerSystem('playback-controls', {
  init: function () {
    this.playingOffset = 0;
    this.playing = false;
    
    this.onTogglePlaying = this.onTogglePlaying.bind(this);
    document.querySelector('#right-hand').addEventListener('menudown', this.onTogglePlaying);
    //document.querySelector('#right-hand').addEventListener('menudown', this.onTogglePlaying);
  },
  
  onTogglePlaying: function() {
    if (this.playing) {
      this.pauseAllTracks();
    } else {
      this.playAllTracks();
    }
  },
  
  playAllTracks: function() {
    console.log("PLAY TRACKS");
    if (this.playing) {
      console.log("ALREADY PLAYING");
      return;
    }
    self = this;
    this.sceneEl.querySelectorAll("[track]").forEach(function (trackEl) {
      //trackEl.components.track.playSound(this.playingOffset);
      self.playTrack(trackEl, self.playingOffset / 1000);
      trackEl.setAttribute("material", "opacity", 0.5);
      trackEl.setAttribute("scale", "0.3 0.3 0.3");
    });
    //this.playingOffset = 0;
    this.playing = true;
  },
  
  // getPlaybackOffset: function() {
  //   return Date.now() - this.playbackStart
  // }

  pauseAllTracks: function() {
    console.log("PAUSE TRACKS");
    this.playing = false;
    self.sceneEl.querySelectorAll("[track]").forEach(function (trackEl) {
      trackEl.components.sound.pauseSound();
      trackEl.setAttribute("material", "opacity", 1);
      trackEl.setAttribute("scale", "1 1 1");
    });
  },
  
  tick: function(time, delta) {
    if (!this.playing) {
      return;
    }
    self = this;
    // TODO: take the playing offset from the AudioContext for better accuracy?
    // TODO: loop it?
    this.playingOffset += delta;
    this.sceneEl.systems.brush.strokes.forEach(function (stroke) {
      var currentPointIndex = stroke.data.points.findIndex(function (point) {
        return point.offset * 1000 > self.playingOffset;
      });
      // if (!stroke.originalMaterial) {
      //   stroke.originalMaterial = stroke.material.clone();
      //   stroke.hiddenMaterial = stroke.material.clone();
      //   stroke.hiddenMaterial.visible = false;
      //   stroke.material = [stroke.originalMaterial, stroke.hiddenMaterial];
      // }
      // stroke.groups etc
      if (currentPointIndex == -1) currentPointIndex = Infinity;
      // In the line brush, each point is actually comprised of two vertices.
      stroke.object3D.children[0].geometry.setDrawRange(0, currentPointIndex * 2);
      
      // Move the track object to the last point, if the stroke is currently playing.
      if (currentPointIndex != 0 && currentPointIndex != Infinity) {
        var trackEl = document.querySelector("[track='id: " + stroke.track + "']");
        var newPosition = stroke.data.points[currentPointIndex].position;
        trackEl.setAttribute("position", newPosition);
      }
    });
  },
  
  playTrack: function(trackEl, offset) {
    var sound = trackEl.components.sound;
    // Hack: we know poolSize is always 0.
    // NOTE: In the newest version of Three.js, startTime is renamed to offset!
    sound.pool.children[0].startTime = offset;
    sound.playSound();
  },
  
  paintTrack: function(trackEl) {
    this.paintingTrack = trackEl;
    var audio = this.getAudio(trackEl);
    audio.realStartTime = audio.context.currentTime;
    // TEMP: All tracks have something at 61 seconds.
    this.playTrack(trackEl, 61);
  },
  
  getAudio: function(trackEl) {
    return trackEl.components.sound.pool.children[0];
  },
  
  getPaintingOffset: function() {
    // TODO: support multiple painting tracks
    // Get AudioContext object through internal Three.js attributes
    //var audio = this.paintingTrack.components.sound.pool.children[0];
    //return audio.context.currentTime - audio;
    var audio = this.getAudio(this.paintingTrack);
    return audio.context.currentTime -  audio.realStartTime;
  },
  
  stopPaintingTrack: function(trackEl) {
    trackEl.components.sound.stopSound();
    this.paintingTrack = null;
  }
});
