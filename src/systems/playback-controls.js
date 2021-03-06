/* global AFRAME, THREE */

/**
*/
AFRAME.registerSystem('playback-controls', {
  init: function () {
    this.playingOffset = 0;
    this.playing = false;
    this.filters = {};
    this.togglePlaying = this.togglePlaying.bind(this);
    this.activatePlayingRay = this.activatePlayingRay.bind(this);
    this.onRayIntersection = this.onRayIntersection.bind(this);
    document.querySelector('#right-hand').addEventListener('menudown', this.togglePlaying);
    document.querySelector('#right-hand').addEventListener('triggerchanged', this.activatePlayingRay);
    document.querySelector('#right-hand').addEventListener('raycaster-intersection', this.onRayIntersection);
    //document.querySelector('#right-hand').addEventListener('menudown', this.onTogglePlaying);
    var filterAssets = [
      "assets/sounds/impulse-responses/filter-telephone.wav",
      "assets/sounds/impulse-responses/comb-saw1.wav",
      "assets/sounds/impulse-responses/filter-lopass160.wav",
      "assets/sounds/impulse-responses/feedback-spring.wav"
    ];
    var loader = new THREE.AudioLoader();
    
    this.filterPresetAssets = [];
    self = this;
    filterAssets.forEach(function (url, index) {
      loader.load(url, function(buffer) {
        self.filterPresetAssets[index] = buffer;
      });
    });
    // this.audioLoader.load(data.src, function (buffer) {
    // this.filterPresetAssets = [
    //   # telephone
    //   # lowpass
    //   # spring reverb
    //   # comb filter
    // ];
  },
  
  togglePlaying: function() {
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
    var self = this;
    // If all tracks are muted, unmute all.
    var allMuted = this.getTrackIds().every(function (trackId) {
      return self.isTrackMuted(trackId);
    });
    if (allMuted) {
      this.getTrackIds().forEach(function (trackId) {
        self.setTrackMute(trackId, false);
      });
    }
    
    this.sceneEl.querySelectorAll("[track]").forEach(function (trackEl) {
      //trackEl.components.track.playSound(this.playingOffset);
      self.playTrack(trackEl, self.playingOffset / 1000);
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
    this.sceneEl.querySelectorAll("[track]").forEach(function (trackEl) {
      trackEl.components.sound.stopSound();
    });
  },
  
  resetPlaybackOffset: function() {
    this.playingOffset = 0;
    if (this.playing) {
      this.pauseAllTracks();
      this.playAllTracks();
    } else {
      this.updateStrokes();
    }
  },
  
  tick: function(time, delta) {
    this.updateTracks();
    if (!this.playing) {
      return;
    }
    // TODO: take the playing offset from the AudioContext for better accuracy?
    // TODO: loop it?
    this.playingOffset += delta;
    this.updateStrokes();
    // this.updateFilters();
  },
  
  updateFilter: function() {
    var self = this;
    Object.keys(this.filters).forEach(function (filter) {
      if (filter.start >= self.playingOffset && filter.end < self.playingOffset) {
        var trackEl = self.getTrackEl(filter.track);
        var audio = self.getAudio(trackEl);
        convolver = context.createConvolver();
        convolver.buffer = this.filterPresetAssets[filter.preset];
        gainNode2 = context.createGain();
        gainNode2.gain.value = 2.0;
        source.connect(convolver);
        convolver.connect(gainNode2);
        gainNode2.connect(context.destination);
      } else {
        // if ()
      }
    });
  },
  
  toggleFilter: function(trackId) {
    if (this.filters[trackId] == undefined) {
      this.filters[trackId] = 0;
    } else {
      this.filters[trackId] = (this.filters[trackId] + 1) % this.filterPresetAssets.length;
    }
    var trackEl = this.getTrackEl(trackId);
    var audio = this.getAudio(trackEl);
    if (!trackEl.convolver) {
      convolver = audio.context.createConvolver();
      gainNode2 = audio.context.createGain();
      gainNode2.gain.value = 2.0;
      audio.source.connect(convolver);
      convolver.connect(gainNode2);
      gainNode2.connect(audio.context.destination);
      trackEl.convolver = convolver;
    }
    trackEl.convolver.buffer = this.filterPresetAssets[this.filters[trackId]];
  },
  
  ensureDoubleMaterial: function(stroke) {
    if (!!stroke.originalMaterial) {
      return;
    }
    
    var strokeMesh = stroke.object3D.children[0];
    stroke.originalMaterial = strokeMesh.material.clone();
    stroke.originalMaterial.transparent = true;
    stroke.hiddenMaterial = strokeMesh.material.clone();
    stroke.hiddenMaterial.transparent = true;
    stroke.hiddenMaterial.opacity = 0.3;
    strokeMesh.material = [stroke.originalMaterial, stroke.hiddenMaterial];
  },
  
  updateStrokes: function() {
    self = this;
    this.sceneEl.systems.brush.strokes.forEach(function (stroke) {
      var nextPointIndex = stroke.data.points.findIndex(function (point) {
        return point.offset * 1000 > self.playingOffset;
      });
      var strokeMesh = stroke.object3D.children[0];
      self.ensureDoubleMaterial(stroke);
      if (nextPointIndex == -1) nextPointIndex = stroke.data.numPoints;
      // In the line brush, each point is actually comprised of two vertices.
      // stroke.object3D.children[0].geometry.setDrawRange(0, currentPointIndex * 2);
      var visibleVertexCount = Math.max((nextPointIndex - 1) * 2, 0);
      var totalVertexCount = stroke.data.numPoints * 2;
      var geometry = strokeMesh.geometry;
      geometry.clearGroups();
      geometry.addGroup(0, visibleVertexCount, 0);
      geometry.addGroup(visibleVertexCount, totalVertexCount - visibleVertexCount, 1);
      
      // Move the track object to the last point, if the stroke is currently playing.
      // (There might be several strokes for the same track.)
      if (nextPointIndex != 0 && nextPointIndex != stroke.data.numPoints) {
        var currentPointIndex = nextPointIndex - 1;
        var newPosition = stroke.data.points[currentPointIndex].position;
        self.getTrackEl(stroke.track).setAttribute("position", newPosition);
      }
    });
  },
  
  updateTracks: function() {
    var self = this;
    this.sceneEl.querySelectorAll("[track]").forEach(function (trackEl) {
      trackEl.setAttribute("material", "opacity", self.playing ? 0.5 : 1);
      trackEl.setAttribute("scale", self.playing ? "0.3 0.3 0.3" : "1 1 1");
    });
  },
  
  getTrackEl: function(trackId) {
    return document.querySelector("[track='id: " + trackId + "']");
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
    //this.playTrack(trackEl, 61);
    this.playTrack(trackEl, 0);
  },
  
  getAudio: function(trackEl) {
    return trackEl.components.sound.pool.children[0];
  },
  
  getPaintingOffset: function() {
    if (!this.paintingTrack) {
      return null;
    }
    // TODO: support multiple painting tracks
    // Get AudioContext object through internal Three.js attributes
    //var audio = this.paintingTrack.components.sound.pool.children[0];
    //return audio.context.currentTime - audio;
    var audio = this.getAudio(this.paintingTrack);
    return audio.context.currentTime -  audio.realStartTime;
  },
  
  toggleTrackMute: function(trackId) {
    this.setTrackMute(trackId, !this.isTrackMuted(trackId));
  },
  
  isTrackMuted: function(trackId) {
    var trackEl = this.getTrackEl(trackId);
    return trackEl.getAttribute('sound').volume == 0;
  },
  
  setTrackMute: function(trackId, muted) {
    var trackEl = this.getTrackEl(trackId);
    var newVolume = muted ? 0 : 1;
    trackEl.setAttribute('sound', 'volume', newVolume);
    
    self = this;
    var allMuted = this.getTrackIds().every(function (trackId) {
      return self.isTrackMuted(trackId);
    });
    if (allMuted) {
      this.pauseAllTracks();
    }
    
    this.sceneEl.systems.brush.strokes.forEach(function (stroke) {
      if (stroke.track != trackId) {
        return;
      }
      self.ensureDoubleMaterial(stroke);
      //stroke.object3D.children[0].material.transparent = true;
      // stroke.object3D.children[0].material[0].opacity = muted ? 0.4 : 1;
      // stroke.object3D.children[0].material[1].opacity = muted ? 0.05 : 0.1;
      stroke.object3D.children[0].material[0].wireframe = muted;
      stroke.object3D.children[0].material[1].wireframe = muted;
    });
  },
  
  stopPaintingTrack: function(trackEl) {
    trackEl.components.sound.stopSound();
    this.paintingTrack = null;
  },
  
  activatePlayingRay: function(event) {
    var handEl = event.target;
    if (handEl.components.grab.grabbing) {
      // Paint mode - do nothing.
      return;
    }
    var activated = event.detail.value > 0.1;
    var previouslyActivated = handEl.getAttribute('raycaster').showLine;
    handEl.setAttribute('raycaster', 'showLine', activated);
    // This is only in A-Frame 0.7.1 but we have 0.7.0.
    // handEl.setAttribute('raycaster', 'enabled', activated);
    if (previouslyActivated && !activated) {
      if (handEl.components.raycaster.intersectedEls.length != 0) {
        var closestObject = handEl.components.raycaster.intersectedEls[0];
        // var objectIndex = this.lastIntersections.els.indexOf(closestObject);
        // var intersection = this.lastIntersections.intersections[objectIndex];
        // var faceIndex = 0;
        // if (intersection) {
        //   faceIndex = intersection.faceIndex;
        // }
        // // console.log("Found object!", intersection);
        // var intersectedStroke = this.sceneEl.systems.brush.strokes.find(function (stroke) {
        //   return stroke.entity == closestObject;
        // });
        // var intersectedPoint = intersectedStroke.data.points[faceIndex];
        // var intersectedOffset = intersectedPoint ? intersectedPoint.offset * 1000 : 0;
        // var intersectedTrack = intersectedStroke.track;
        // if (!intersection) {
        //   console.log("Couldn't find intersection");
        // } else if(!intersectedPoint) {
        //   console.log("Couldn't find intersected point");
        // }
        // console.log("Intersected track " + intersectedTrack +
        //   ". Playing offset: " + intersectedOffset +
        //   ". Face index: " + faceIndex);
        // this.handleRayIntersection(intersectedTrack, intersectedOffset);
        
        var intersectedTrack = closestObject.components.track.data.id
        console.log("Intersected track " + intersectedTrack);
        this.handleRayIntersection(intersectedTrack, 0);
      }
    }
  },
  
  handleRayIntersection: function(intersectedTrackId, offset) {
    if (this.playing) {
      this.toggleTrackMute(intersectedTrackId);           
      // if (this.isTrackMuted(trackId)) {
      //   // Intersected track is muted - unmute it.
      //   this.toggleTrackMute(trackId);           
      // } else {
      //   // Intersected track is playing - mute it.
      //   this.playingOffset = offset;
      // }
    } else {
      this.playingOffset = offset;
      // Mue all tracks but the intersected one.
      var self = this;
      this.getTrackIds().forEach(function (trackId) {
        var muted = intersectedTrackId != trackId;
        self.setTrackMute(trackId, muted);
      });
      this.playAllTracks();
    }
  },
  
  getTrackIds: function() {
    return Array.from(this.sceneEl.querySelectorAll("[track]")).map(function (trackEl) {
      return trackEl.components.track.data.id;
    });
  },
  
  onRayIntersection: function(event) {
    console.log("Intersection! " + event.detail.els);
    this.lastIntersections = event.detail;
  },
  
  applyFilter: function(trackId, offset) {
    if (!this.filters[trackId]) {
      this.filters[trackId] = [];
    }
    console.log("Applying filter to track " + trackId + " at offset " + offset);
    this.filters[trackId].push({
      start: Math.max(0, offset - 300),
      end: offset + 1700,
      preset: 0
    });
  }
});
